"use client";

import { createContext, useContext } from "react";

interface WorkspaceInfo {
  userId: string;
  name: string;
}

export const WorkspaceContext = createContext<WorkspaceInfo | null>(null);

export function useWorkspace(): WorkspaceInfo {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used inside WorkspaceShell");
  return ctx;
}
