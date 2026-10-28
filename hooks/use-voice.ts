"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Mic } from "@/lib/voice/mic";
import { EnergyVad } from "@/lib/voice/vad";
import { Speaker } from "@/lib/voice/speaker";
import { takeSentences, toSpeakable } from "@/lib/voice/speech-text";
import { VOICE_CONFIG } from "@/lib/voice/config";
import { preload, transcribeAudio, useMlStatus } from "@/lib/voice/ml-client";

export type VoiceState = "idle" | "loading" | "listening" | "transcribing" | "thinking" | "speaking";
export type VoiceMode = "ptt" | "handsfree";

interface Options {
  // Called with the final transcript; the caller redacts and sends it
  onUtterance: (text: string) => Promise<void> | void;
  // Text of the assistant message currently streaming (or last finished)
  assistantText: string;
  assistantMessageId: string | null;
  isResponding: boolean;
  stopResponse: () => void;
}

// Whisper tends to invent these on silence or noise
const HALLUCINATIONS = /^(\[.*\]|\(.*\)|you\.?|thank you\.?|thanks for watching!?|bye\.?|\.+)$/i;
const PRE_ROLL_FRAMES = 10; // ~300ms kept before speech starts so first words aren't clipped

function concat(chunks: Float32Array[]): Float32Array {
  const out = new Float32Array(chunks.reduce((n, c) => n + c.length, 0));
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

export function useVoice({ onUtterance, assistantText, assistantMessageId, isResponding, stopResponse }: Options) {
  const asrStatus = useMlStatus((s) => s.asr);
  const asrProgress = useMlStatus((s) => s.asrProgress);
  const [state, setState] = useState<VoiceState>("idle");
  const [mode, setMode] = useState<VoiceMode | null>(null);
  const [partial, setPartial] = useState("");

  const mic = useRef<Mic | null>(null);
  const vad = useRef(new EnergyVad());
  const speaker = useRef<Speaker | null>(null);
  const capturing = useRef(false);
  const chunks = useRef<Float32Array[]>([]);
  const preRoll = useRef<Float32Array[]>([]);
  const partialBusy = useRef(false);
  const lastPartialAt = useRef(0);
  const modeRef = useRef<VoiceMode | null>(null);
  const stateRef = useRef<VoiceState>("idle");
  const voiceTurn = useRef(false); // current assistant reply was asked for by voice
  const spoken = useRef({ id: null as string | null, length: 0, rest: "" });
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const opts = useRef({ onUtterance, isResponding, stopResponse });

  useEffect(() => {
    opts.current = { onUtterance, isResponding, stopResponse };
  });

  const update = useCallback((s: VoiceState) => {
    stateRef.current = s;
    setState(s);
  }, []);

  const restingState = useCallback(() => (modeRef.current === "handsfree" ? "listening" : "idle"), []);

  const closeMic = useCallback(() => {
    mic.current?.stop();
    mic.current = null;
    capturing.current = false;
    vad.current.reset();
  }, []);

  const stopAll = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    speaker.current?.stop();
    closeMic();
    modeRef.current = null;
    setMode(null);
    setPartial("");
    update("idle");
  }, [closeMic, update]);

  const armIdleTimer = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (modeRef.current === "handsfree") idleTimer.current = setTimeout(stopAll, VOICE_CONFIG.idleTimeoutMs);
  }, [stopAll]);

  const finishUtterance = useCallback(async () => {
    if (!capturing.current) return;
    capturing.current = false;
    const audio = concat(chunks.current);
    chunks.current = [];
    if (modeRef.current === "ptt") closeMic();

    if (audio.length < VOICE_CONFIG.sampleRate * 0.3) {
      setPartial("");
      return update(restingState());
    }
    update("transcribing");
    try {
      const text = (await transcribeAudio(audio, false)).trim();
      setPartial("");
      if (!text || HALLUCINATIONS.test(text)) return update(restingState());
      voiceTurn.current = true;
      update("thinking");
      await opts.current.onUtterance(text);
    } catch {
      setPartial("");
      update(restingState());
    }
    armIdleTimer();
  }, [armIdleTimer, closeMic, restingState, update]);

  const beginCapture = useCallback(() => {
    // Barge-in: talking over the assistant stops it
    if (speaker.current?.speaking || opts.current.isResponding) {
      speaker.current?.stop();
      opts.current.stopResponse();
      voiceTurn.current = false;
    }
    capturing.current = true;
    chunks.current = [...preRoll.current];
    lastPartialAt.current = performance.now();
    setPartial("");
    update("listening");
    if (idleTimer.current) clearTimeout(idleTimer.current);
  }, [update]);

  const onFrame = useCallback(
    ({ samples, rms }: { samples: Float32Array; rms: number }) => {
      preRoll.current.push(samples);
      if (preRoll.current.length > PRE_ROLL_FRAMES) preRoll.current.shift();

      const edge = vad.current.push(rms);
      if (modeRef.current === "handsfree") {
        if (edge === "start" && !capturing.current && stateRef.current !== "transcribing") beginCapture();
        if (edge === "end" && capturing.current) void finishUtterance();
      }
      if (!capturing.current) return;

      chunks.current.push(samples);
      const total = chunks.current.length * samples.length;
      if (total > VOICE_CONFIG.sampleRate * VOICE_CONFIG.maxUtteranceSec) return void finishUtterance();

      // Live transcript: re-transcribe the utterance so far, at most one request in flight
      const now = performance.now();
      if (!partialBusy.current && now - lastPartialAt.current > VOICE_CONFIG.partialEveryMs) {
        partialBusy.current = true;
        lastPartialAt.current = now;
        transcribeAudio(concat(chunks.current), true)
          .then((t) => capturing.current && setPartial(t))
          .catch(() => {})
          .finally(() => (partialBusy.current = false));
      }
    },
    [beginCapture, finishUtterance]
  );

  const openMic = useCallback(async () => {
    if (mic.current) return true;
    preload("asr");
    speaker.current ??= Object.assign(new Speaker(), {
      onStateChange: (speaking: boolean) => {
        if (speaking) update("speaking");
        else if (stateRef.current === "speaking") update(restingState());
      },
    });
    try {
      const m = new Mic();
      await m.start(onFrame);
      mic.current = m;
      return true;
    } catch {
      update("idle");
      return false;
    }
  }, [onFrame, restingState, update]);

  const startPtt = useCallback(async () => {
    if (modeRef.current === "handsfree") return;
    modeRef.current = "ptt";
    setMode("ptt");
    if (!(await openMic())) return;
    beginCapture();
  }, [beginCapture, openMic]);

  const endPtt = useCallback(() => {
    if (modeRef.current !== "ptt") return;
    void finishUtterance();
  }, [finishUtterance]);

  const toggleHandsfree = useCallback(async () => {
    if (modeRef.current === "handsfree") return stopAll();
    modeRef.current = "handsfree";
    setMode("handsfree");
    if (!(await openMic())) return stopAll();
    update("listening");
    armIdleTimer();
  }, [armIdleTimer, openMic, stopAll, update]);

  const interrupt = useCallback(() => {
    speaker.current?.stop();
    opts.current.stopResponse();
    voiceTurn.current = false;
    update(restingState());
  }, [restingState, update]);

  // Speak the assistant's reply sentence by sentence as it streams in
  useEffect(() => {
    if (!voiceTurn.current || !speaker.current || !assistantMessageId) return;
    const s = spoken.current;
    if (s.id !== assistantMessageId) {
      spoken.current = { id: assistantMessageId, length: 0, rest: "" };
    }
    const cur = spoken.current;
    cur.rest += assistantText.slice(cur.length);
    cur.length = assistantText.length;
    const { sentences, rest } = takeSentences(cur.rest);
    cur.rest = rest;
    sentences.forEach((x) => speaker.current!.enqueue(x));

    if (!isResponding) {
      const tail = toSpeakable(cur.rest);
      if (tail) speaker.current.enqueue(tail);
      cur.rest = "";
      voiceTurn.current = false;
      if (!speaker.current.speaking && stateRef.current === "thinking") update(restingState());
    }
  }, [assistantText, assistantMessageId, isResponding, restingState, update]);

  // Space bar push-to-talk when not typing
  useEffect(() => {
    const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(t.tagName));
    const down = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat && !typing(e.target) && asrStatus === "ready") {
        e.preventDefault();
        void startPtt();
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space" && !typing(e.target)) endPtt();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [asrStatus, endPtt, startPtt]);

  useEffect(() => stopAll, [stopAll]);

  // Client-only check (server renders without voice controls, avoiding a hydration mismatch)
  const supported = useSyncExternalStore(
    () => () => {},
    () => !!navigator.mediaDevices?.getUserMedia && typeof AudioWorkletNode !== "undefined",
    () => false
  );

  return {
    state: mode && asrStatus !== "ready" ? ("loading" as const) : state,
    mode,
    partial,
    asrStatus,
    asrProgress,
    supported,
    level: () => mic.current?.analyser ?? null,
    startPtt,
    endPtt,
    toggleHandsfree,
    interrupt,
    prepare: () => preload("asr"),
  };
}
