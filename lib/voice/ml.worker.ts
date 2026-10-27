/// <reference lib="webworker" />
// On-device ML: name redaction (NER) and speech-to-text (Whisper).
// Runs in a Web Worker so model loading and inference never block the UI.
// Model weights are downloaded from the Hugging Face CDN once and cached by the browser;
// user text and audio never leave this worker.

import { env, pipeline } from "@huggingface/transformers";
import { PRIVACY_CONFIG, STT_CONFIG } from "@/lib/privacy/config";
import { applyRedaction, extractNames, filterLowercaseNames, titleCase, type NerToken } from "@/lib/privacy/redact";
import type { WorkerRequest, WorkerResponse } from "./ml-protocol";

env.allowLocalModels = false;

const ctx = self as unknown as DedicatedWorkerGlobalScope;
const post = (msg: WorkerResponse) => ctx.postMessage(msg);

type AnyPipeline = (input: unknown, opts?: Record<string, unknown>) => Promise<unknown>;
let nerPromise: Promise<AnyPipeline> | null = null;
let asrPromise: Promise<AnyPipeline> | null = null;

const hasWebGPU = typeof navigator !== "undefined" && "gpu" in navigator;

function progress(task: "ner" | "asr") {
  return (p: { status: string; progress?: number; file?: string }) => {
    if (p.status === "progress" && typeof p.progress === "number") post({ type: "progress", task, progress: p.progress, file: p.file });
  };
}

function loadNer() {
  nerPromise ??= pipeline("token-classification", PRIVACY_CONFIG.nerModel, {
    dtype: PRIVACY_CONFIG.nerDtype,
    progress_callback: progress("ner"),
  }).then((p) => {
    post({ type: "ready", task: "ner" });
    return p as unknown as AnyPipeline;
  });
  return nerPromise;
}

function loadAsr() {
  asrPromise ??= pipeline("automatic-speech-recognition", STT_CONFIG.model, {
    dtype: STT_CONFIG.dtype,
    device: hasWebGPU ? "webgpu" : "wasm",
    progress_callback: progress("asr"),
  }).then((p) => {
    post({ type: "ready", task: "asr" });
    return p as unknown as AnyPipeline;
  });
  return asrPromise;
}

async function redact(text: string, allow: string[]) {
  const ner = await loadNer();
  const allowAll = [...PRIVACY_CONFIG.alwaysAllow, ...allow];
  const tokens = (await ner(text)) as NerToken[];
  const names = extractNames(tokens, PRIVACY_CONFIG.minScore);

  // Second pass catches names typed or transcribed in lowercase
  if (text !== titleCase(text)) {
    const tcTokens = (await ner(titleCase(text))) as NerToken[];
    const extra = extractNames(tcTokens, PRIVACY_CONFIG.lowercaseMinScore);
    const known = names.map((n) => n.toLowerCase());
    names.push(
      ...filterLowercaseNames(extra, tcTokens, text, PRIVACY_CONFIG.lowercaseMinScore, PRIVACY_CONFIG.lowercaseStopwords)
        // Skip anything the first pass already found (or a fragment of it)
        .filter((n) => !known.some((k) => k.includes(n.toLowerCase())))
    );
  }
  return applyRedaction(text, [...new Set(names)], allowAll);
}

async function transcribe(audio: Float32Array) {
  const asr = await loadAsr();
  const out = (await asr(audio)) as { text: string };
  return out.text.trim();
}

ctx.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const msg = e.data;
  try {
    switch (msg.type) {
      case "load":
        await (msg.task === "ner" ? loadNer() : loadAsr());
        break;
      case "redact": {
        const result = await redact(msg.text, msg.allow);
        post({ type: "redacted", id: msg.id, ...result });
        break;
      }
      case "transcribe": {
        const text = await transcribe(msg.audio);
        post({ type: "transcribed", id: msg.id, text, partial: msg.partial });
        break;
      }
    }
  } catch (err) {
    post({ type: "error", id: "id" in msg ? msg.id : undefined, task: msg.type === "load" ? msg.task : undefined, message: (err as Error).message });
  }
};
