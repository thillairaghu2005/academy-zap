"use client";

import * as React from "react";

import type { IDEFile, IDEFileKind, IDELanguage } from "@/types/ide";

interface PersistedFiles {
  files: IDEFile[];
  openFiles: string[];
  activeFile: string;
}

function fileName(path: string): string {
  return path.split("/").filter(Boolean).pop() ?? path;
}

function languageForPath(path: string): IDELanguage | "plaintext" {
  const extension = path.split(".").pop()?.toLowerCase();
  const languages: Record<string, IDELanguage | "plaintext"> = {
    html: "html", htm: "html", css: "css", js: "javascript", jsx: "javascript",
    ts: "typescript", tsx: "typescript", json: "json", md: "markdown", py: "python",
    java: "java", c: "c", h: "c", cpp: "cpp", hpp: "cpp", go: "go", rs: "rust",
    sql: "sql", yaml: "yaml", yml: "yaml", xml: "xml", sh: "shell", bash: "shell",
  };
  return languages[extension ?? ""] ?? "plaintext";
}

function normalizePath(path: string): string {
  return path.replaceAll("\\", "/").replace(/^\/+|\/+$/g, "");
}

export function createIDEFile(path: string, content = "", kind: IDEFileKind = "file", order = 0): IDEFile {
  const normalizedPath = normalizePath(path);
  return {
    path: normalizedPath,
    name: fileName(normalizedPath),
    kind,
    language: kind === "folder" ? "plaintext" : languageForPath(normalizedPath),
    content,
    dirty: false,
    order,
  };
}

function ensureParentFolders(files: IDEFile[], path: string): IDEFile[] {
  const segments = path.split("/").slice(0, -1);
  const next = [...files];
  let current = "";
  for (const segment of segments) {
    current = current ? `${current}/${segment}` : segment;
    if (!next.some((file) => file.path === current)) {
      next.push(createIDEFile(current, "", "folder", next.length));
    }
  }
  return next;
}

export function useFiles(initialFiles: IDEFile[], storageKey = "ide:files") {
  const initialActive = initialFiles.find((file) => file.kind === "file")?.path ?? "";
  const [files, setFiles] = React.useState(initialFiles);
  const [openFiles, setOpenFiles] = React.useState<string[]>(initialActive ? [initialActive] : []);
  const [activeFile, setActiveFile] = React.useState(initialActive);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    let timer = 0;
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<PersistedFiles>;
        const storedFiles = parsed.files?.filter((file) => file.path && file.name && file.kind);
        timer = window.setTimeout(() => {
          if (storedFiles && storedFiles.length > 0) setFiles(storedFiles);
          if (parsed.openFiles) setOpenFiles(parsed.openFiles);
          if (parsed.activeFile) setActiveFile(parsed.activeFile);
        }, 0);
      }
    } catch {
      // Local storage is optional.
    }
    const hydratedTimer = window.setTimeout(() => setHydrated(true), 0);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(hydratedTimer);
    };
  }, [storageKey]);

  React.useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(storageKey, JSON.stringify({ files, openFiles, activeFile } satisfies PersistedFiles));
  }, [activeFile, files, hydrated, openFiles, storageKey]);

  const updateContent = React.useCallback((path: string, content: string) => {
    setFiles((current) => current.map((file) => file.path === path ? { ...file, content, dirty: true } : file));
  }, []);

  React.useEffect(() => {
    const dirtyFiles = files.filter((file) => file.dirty).map((file) => file.path);
    if (dirtyFiles.length === 0) return;
    const timer = window.setTimeout(() => {
      setFiles((current) => current.map((file) => dirtyFiles.includes(file.path) ? { ...file, dirty: false } : file));
    }, 900);
    return () => window.clearTimeout(timer);
  }, [files]);

  const openFile = React.useCallback((path: string) => {
    setOpenFiles((current) => current.includes(path) ? current : [...current, path]);
    setActiveFile(path);
  }, []);

  const closeFile = React.useCallback((path: string) => {
    const file = files.find((item) => item.path === path);
    if (file?.dirty && !window.confirm(`${file.name} has unsaved changes. Close it anyway?`)) return;
    setOpenFiles((current) => {
      const next = current.filter((item) => item !== path);
      if (path === activeFile) setActiveFile(next[next.length - 1] ?? "");
      return next;
    });
  }, [activeFile, files]);

  const addFile = React.useCallback((path: string, content = "") => {
    const normalized = normalizePath(path);
    if (!normalized || files.some((file) => file.path === normalized)) return false;
    setFiles((current) => [...ensureParentFolders(current, normalized), createIDEFile(normalized, content, "file", current.length)]);
    setOpenFiles((current) => [...current, normalized]);
    setActiveFile(normalized);
    return true;
  }, [files]);

  const addFolder = React.useCallback((path: string) => {
    const normalized = normalizePath(path);
    if (!normalized || files.some((file) => file.path === normalized)) return false;
    setFiles((current) => [...ensureParentFolders(current, normalized), createIDEFile(normalized, "", "folder", current.length)]);
    return true;
  }, [files]);

  const renameFile = React.useCallback((path: string, nextPath: string) => {
    const normalized = normalizePath(nextPath);
    if (!normalized || files.some((file) => file.path === normalized)) return false;
    const paths = files.filter((file) => file.path === path || file.path.startsWith(`${path}/`));
    setFiles((current) => current.map((file) => {
      if (file.path !== path && !file.path.startsWith(`${path}/`)) return file;
      const replacement = file.path === path ? normalized : `${normalized}${file.path.slice(path.length)}`;
      return { ...file, path: replacement, name: fileName(replacement) };
    }));
    setOpenFiles((current) => current.map((item) => item === path || item.startsWith(`${path}/`) ? `${normalized}${item.slice(path.length)}` : item));
    if (activeFile === path || activeFile.startsWith(`${path}/`)) setActiveFile(`${normalized}${activeFile.slice(path.length)}`);
    return paths.length > 0;
  }, [activeFile, files]);

  const deleteFile = React.useCallback((path: string) => {
    const next = files.filter((file) => file.path !== path && !file.path.startsWith(`${path}/`));
    setFiles(next);
    setOpenFiles((current) => current.filter((item) => item !== path && !item.startsWith(`${path}/`)));
    if (activeFile === path || activeFile.startsWith(`${path}/`)) {
      setActiveFile(next.find((file) => file.kind === "file")?.path ?? "");
    }
  }, [activeFile, files]);

  const duplicateFile = React.useCallback((path: string) => {
    const file = files.find((item) => item.path === path);
    if (!file) return;
    let copyPath = `${path}.copy`;
    let index = 2;
    while (files.some((item) => item.path === copyPath)) copyPath = `${path}.copy${index++}`;
    addFile(copyPath, file.content);
  }, [addFile, files]);

  const moveFile = React.useCallback((path: string, targetPath: string) => {
    if (path === targetPath) return;
    setFiles((current) => {
      const source = current.find((file) => file.path === path);
      const target = current.find((file) => file.path === targetPath);
      if (!source || !target) return current;
      const sourceOrder = source.order;
      const targetOrder = target.order;
      return current.map((file) => file.path === path ? { ...file, order: targetOrder } : file.path === targetPath ? { ...file, order: sourceOrder } : file);
    });
  }, []);

  const resetContent = React.useCallback((path: string, content: string) => {
    setFiles((current) => current.map((file) => file.path === path ? { ...file, content, dirty: false } : file));
  }, []);

  const setLanguage = React.useCallback((path: string, language: IDELanguage) => {
    setFiles((current) => current.map((file) => file.path === path ? { ...file, language } : file));
  }, []);

  const active = files.find((file) => file.path === activeFile && file.kind === "file") ?? files.find((file) => file.kind === "file");

  return {
    files: [...files].sort((a, b) => a.order - b.order),
    openFiles,
    activeFile: active?.path ?? "",
    active,
    setActiveFile,
    updateContent,
    openFile,
    closeFile,
    addFile,
    addFolder,
    renameFile,
    deleteFile,
    duplicateFile,
    moveFile,
    resetContent,
    setLanguage,
  };
}
