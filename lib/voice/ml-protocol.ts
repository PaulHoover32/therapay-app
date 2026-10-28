export type MlTask = "ner" | "asr";

export type WorkerRequest =
  | { type: "load"; task: MlTask }
  | { type: "redact"; id: string; text: string; allow: string[] }
  | { type: "transcribe"; id: string; audio: Float32Array; partial: boolean };

export type WorkerResponse =
  | { type: "progress"; task: MlTask; progress: number; file?: string }
  | { type: "ready"; task: MlTask }
  | { type: "redacted"; id: string; text: string; count: number }
  | { type: "transcribed"; id: string; text: string; partial: boolean }
  | { type: "error"; id?: string; task?: MlTask; message: string };
