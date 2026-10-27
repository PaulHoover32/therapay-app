"use client";

import { create } from "zustand";
import type { MlTask, WorkerRequest, WorkerResponse } from "./ml-protocol";

type TaskStatus = "idle" | "loading" | "ready" | "error";

interface MlStatus {
  ner: TaskStatus;
  asr: TaskStatus;
  nerProgress: number;
  asrProgress: number;
  error: string | null;
}

export const useMlStatus = create<MlStatus>(() => ({
  ner: "idle",
  asr: "idle",
  nerProgress: 0,
  asrProgress: 0,
  error: null,
}));

let worker: Worker | null = null;
const pending = new Map<string, { resolve: (v: WorkerResponse) => void; reject: (e: Error) => void }>();
// Per-file download progress, averaged into one number per task
const fileProgress: Record<MlTask, Map<string, number>> = { ner: new Map(), asr: new Map() };

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL("./ml.worker.ts", import.meta.url), { type: "module" });
  worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
    const msg = e.data;
    switch (msg.type) {
      case "progress": {
        fileProgress[msg.task].set(msg.file ?? "", msg.progress);
        const values = [...fileProgress[msg.task].values()];
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        useMlStatus.setState(msg.task === "ner" ? { nerProgress: avg } : { asrProgress: avg });
        break;
      }
      case "ready":
        useMlStatus.setState(msg.task === "ner" ? { ner: "ready", nerProgress: 100 } : { asr: "ready", asrProgress: 100 });
        break;
      case "error":
        if (msg.task) useMlStatus.setState({ [msg.task]: "error", error: msg.message } as Partial<MlStatus>);
        if (msg.id) {
          pending.get(msg.id)?.reject(new Error(msg.message));
          pending.delete(msg.id);
        }
        break;
      case "redacted":
      case "transcribed":
        pending.get(msg.id)?.resolve(msg);
        pending.delete(msg.id);
        break;
    }
  };
  return worker;
}

function request<T extends WorkerResponse>(req: WorkerRequest, transfer?: Transferable[]): Promise<T> {
  const id = "id" in req ? req.id : "";
  return new Promise<T>((resolve, reject) => {
    pending.set(id, { resolve: resolve as (v: WorkerResponse) => void, reject });
    getWorker().postMessage(req, transfer ?? []);
  });
}

export function preload(task: MlTask) {
  const state = useMlStatus.getState();
  if (state[task] === "loading" || state[task] === "ready") return;
  useMlStatus.setState({ [task]: "loading" } as Partial<MlStatus>);
  getWorker().postMessage({ type: "load", task } satisfies WorkerRequest);
}

export async function redactText(text: string, allow: string[]): Promise<{ text: string; count: number }> {
  const res = await request<Extract<WorkerResponse, { type: "redacted" }>>({
    type: "redact",
    id: crypto.randomUUID(),
    text,
    allow,
  });
  return { text: res.text, count: res.count };
}

export async function transcribeAudio(audio: Float32Array, partial: boolean): Promise<string> {
  // Copy so the caller can keep appending to its buffer while we transfer this one
  const copy = audio.slice();
  const res = await request<Extract<WorkerResponse, { type: "transcribed" }>>(
    { type: "transcribe", id: crypto.randomUUID(), audio: copy, partial },
    [copy.buffer]
  );
  return res.text;
}
