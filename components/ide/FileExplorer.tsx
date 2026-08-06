"use client";

import * as React from "react";
import { ChevronDown, ChevronRight, Copy, FileCode2, FileJson2, FileText, Folder, FolderOpen, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";

import type { IDEFile, IDEFileTreeNode } from "@/types/ide";
import styles from "./ide.module.css";

interface FileExplorerProps {
  files: IDEFile[];
  activeFile: string;
  onOpen: (path: string) => void;
  onAddFile: (path: string) => void;
  onAddFolder: (path: string) => void;
  onRename: (path: string, nextPath: string) => void;
  onDelete: (path: string) => void;
  onDuplicate: (path: string) => void;
  onMove: (path: string, targetPath: string) => void;
}

interface ContextMenuState { path: string; x: number; y: number; kind: IDEFile["kind"] }

function buildTree(files: IDEFile[]): IDEFileTreeNode[] {
  const roots: IDEFileTreeNode[] = [];
  const nodes = new Map<string, IDEFileTreeNode>();
  for (const file of files) nodes.set(file.path, { name: file.name, path: file.path, kind: file.kind, file, children: [] });
  for (const file of files) {
    const parentPath = file.path.includes("/") ? file.path.slice(0, file.path.lastIndexOf("/")) : "";
    const node = nodes.get(file.path);
    if (!node) continue;
    if (parentPath && nodes.get(parentPath)) nodes.get(parentPath)?.children.push(node);
    else roots.push(node);
  }
  const sort = (items: IDEFileTreeNode[]) => {
    items.sort((a, b) => (a.kind === b.kind ? (a.file?.order ?? 0) - (b.file?.order ?? 0) : a.kind === "folder" ? -1 : 1));
    items.forEach((item) => sort(item.children));
  };
  sort(roots);
  return roots;
}

function FileIcon({ file }: { file: IDEFile }) {
  if (file.kind === "folder") return <Folder size={15} strokeWidth={1.7} />;
  if (file.language === "json") return <FileJson2 size={15} strokeWidth={1.7} />;
  if (file.language === "markdown") return <FileText size={15} strokeWidth={1.7} />;
  return <FileCode2 size={15} strokeWidth={1.7} />;
}

function TreeNode({ node, depth, activeFile, expanded, onToggle, onOpen, onContextMenu, onDrop, onDragStart }: {
  node: IDEFileTreeNode;
  depth: number;
  activeFile: string;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  onOpen: (path: string) => void;
  onContextMenu: (event: React.MouseEvent, node: IDEFileTreeNode) => void;
  onDrop: (event: React.DragEvent, path: string) => void;
  onDragStart: (event: React.DragEvent, path: string) => void;
}) {
  const isFolder = node.kind === "folder";
  const isExpanded = expanded.has(node.path);
  return (
    <>
      <div
        className={`${styles.treeRow} ${activeFile === node.path ? styles.treeRowActive : ""}`}
        style={{ paddingLeft: `${10 + depth * 14}px` }}
        onClick={() => { if (isFolder) onToggle(node.path); else onOpen(node.path); }}
        onContextMenu={(event) => onContextMenu(event, node)}
        draggable
        onDragStart={(event) => onDragStart(event, node.path)}
        onDragOver={(event) => { event.preventDefault(); }}
        onDrop={(event) => onDrop(event, node.path)}
        role="treeitem"
        aria-selected={activeFile === node.path}
        aria-expanded={isFolder ? isExpanded : undefined}
        tabIndex={0}
        onKeyDown={(event) => { if (event.key === "Enter") { if (isFolder) onToggle(node.path); else onOpen(node.path); } }}
      >
        <span className={styles.treeChevron}>{isFolder ? (isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />) : null}</span>
        <span className={`${styles.fileIcon} ${isFolder ? styles.folderIcon : ""}`}>{isFolder && isExpanded ? <FolderOpen size={15} strokeWidth={1.7} /> : <FileIcon file={node.file as IDEFile} />}</span>
        <span className={styles.treeLabel}>{node.name}</span>
        {node.file?.dirty ? <span className={styles.dirtyDot} aria-label="Unsaved changes" /> : null}
        <button className={styles.nodeMenuButton} onClick={(event) => { event.stopPropagation(); onContextMenu(event, node); }} aria-label={`Actions for ${node.name}`}><MoreHorizontal size={14} /></button>
      </div>
      {isFolder && isExpanded ? node.children.map((child) => <TreeNode key={child.path} node={child} depth={depth + 1} activeFile={activeFile} expanded={expanded} onToggle={onToggle} onOpen={onOpen} onContextMenu={onContextMenu} onDrop={onDrop} onDragStart={onDragStart} />) : null}
    </>
  );
}

export function FileExplorer({ files, activeFile, onOpen, onAddFile, onAddFolder, onRename, onDelete, onDuplicate, onMove }: FileExplorerProps) {
  const [expanded, setExpanded] = React.useState<Set<string>>(() => new Set(files.filter((file) => file.kind === "folder").map((file) => file.path)));
  const [contextMenu, setContextMenu] = React.useState<ContextMenuState | null>(null);
  const draggedPath = React.useRef<string | null>(null);
  const tree = React.useMemo(() => buildTree(files), [files]);

  React.useEffect(() => {
    const close = () => setContextMenu(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  const createFile = () => {
    const path = window.prompt("New file path", "src/new-file.js");
    if (path) onAddFile(path);
  };

  const createFolder = () => {
    const path = window.prompt("New folder path", "src/components");
    if (path) onAddFolder(path);
  };

  const handleContextMenu = (event: React.MouseEvent, node: IDEFileTreeNode) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({ path: node.path, kind: node.kind, x: event.clientX, y: event.clientY });
  };

  const rename = () => {
    if (!contextMenu) return;
    const next = window.prompt("Rename path", contextMenu.path);
    if (next) onRename(contextMenu.path, next);
    setContextMenu(null);
  };

  return (
    <div className={styles.explorer} onContextMenu={(event) => event.preventDefault()}>
      <div className={styles.explorerHeader}>
        <span>EXPLORER</span>
        <div className={styles.explorerActions}>
          <button onClick={createFile} aria-label="New file" title="New file"><Plus size={15} /></button>
          <button onClick={createFolder} aria-label="New folder" title="New folder"><Folder size={14} /></button>
        </div>
      </div>
      <div className={styles.workspaceFolder}><ChevronDown size={14} /><span>WORKSPACE</span></div>
      <div className={styles.tree} role="tree">
        {tree.length > 0 ? tree.map((node) => <TreeNode key={node.path} node={node} depth={0} activeFile={activeFile} expanded={expanded} onToggle={(path) => setExpanded((current) => { const next = new Set(current); if (next.has(path)) next.delete(path); else next.add(path); return next; })} onOpen={onOpen} onContextMenu={handleContextMenu} onDragStart={(event, path) => { draggedPath.current = path; event.dataTransfer.effectAllowed = "move"; }} onDrop={(event, path) => { event.preventDefault(); if (draggedPath.current) onMove(draggedPath.current, path); draggedPath.current = null; }} />) : <div className={styles.emptyExplorer}>No files yet<br /><button onClick={createFile}>Create a file</button></div>}
      </div>
      {contextMenu ? (
        <div className={styles.contextMenu} style={{ left: contextMenu.x, top: contextMenu.y }} onClick={(event) => event.stopPropagation()} role="menu">
          {contextMenu.kind === "folder" ? <button onClick={() => { const path = window.prompt("New file path", `${contextMenu?.path}/new-file.js`); if (path) onAddFile(path); setContextMenu(null); }} role="menuitem"><Plus size={14} /> New file inside</button> : null}
          {contextMenu.kind === "folder" ? <button onClick={() => { const path = window.prompt("New folder path", `${contextMenu?.path}/new-folder`); if (path) onAddFolder(path); setContextMenu(null); }} role="menuitem"><Folder size={14} /> New folder inside</button> : null}
          <button onClick={rename} role="menuitem"><Pencil size={14} /> Rename</button>
          {contextMenu.kind === "file" ? <button onClick={() => { onDuplicate(contextMenu.path); setContextMenu(null); }} role="menuitem"><Copy size={14} /> Duplicate</button> : null}
          <button className={styles.dangerAction} onClick={() => { if (window.confirm(`Delete ${contextMenu?.path}?`)) onDelete(contextMenu.path); setContextMenu(null); }} role="menuitem"><Trash2 size={14} /> Delete</button>
        </div>
      ) : null}
    </div>
  );
}
