"use client";

import type { IDEFile } from "@/types/ide";
import { FileExplorer } from "./FileExplorer";

interface SideBarProps {
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

export function SideBar(props: SideBarProps) {
  return <aside aria-label="File explorer"><FileExplorer {...props} /></aside>;
}
