"use client";

import { VOICE_CONFIG } from "./config";

// Captures mono mic audio, downsampled to 16 kHz, in fixed-size frames with an RMS level.
// Audio stays in memory on this device; it is only handed to the on-device transcriber.

const WORKLET = `
class Tap extends AudioWorkletProcessor {
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch) this.port.postMessage(ch.slice(0));
    return true;
  }
}
registerProcessor("tap", Tap);
`;

export interface MicFrame {
  samples: Float32Array; // 16 kHz
  rms: number;
}

export class Mic {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private node: AudioWorkletNode | null = null;
  private pending: number[] = [];
  private ratio = 1;
  private carry = 0;
  analyser: AnalyserNode | null = null;

  async start(onFrame: (frame: MicFrame) => void) {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
    });
    this.ctx = new AudioContext();
    this.ratio = this.ctx.sampleRate / VOICE_CONFIG.sampleRate;
    const url = URL.createObjectURL(new Blob([WORKLET], { type: "application/javascript" }));
    await this.ctx.audioWorklet.addModule(url);
    URL.revokeObjectURL(url);

    const source = this.ctx.createMediaStreamSource(this.stream);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.node = new AudioWorkletNode(this.ctx, "tap");
    source.connect(this.analyser);
    source.connect(this.node);

    const frameLen = Math.round((VOICE_CONFIG.sampleRate * VOICE_CONFIG.frameMs) / 1000);
    this.node.port.onmessage = (e: MessageEvent<Float32Array>) => {
      // Simple decimation to 16 kHz (input is already low-passed by the browser's processing)
      const input = e.data;
      let pos = this.carry;
      while (pos < input.length) {
        this.pending.push(input[Math.floor(pos)]);
        pos += this.ratio;
      }
      this.carry = pos - input.length;
      while (this.pending.length >= frameLen) {
        const samples = Float32Array.from(this.pending.splice(0, frameLen));
        let sum = 0;
        for (const s of samples) sum += s * s;
        onFrame({ samples, rms: Math.sqrt(sum / samples.length) });
      }
    };
  }

  stop() {
    this.node?.port.close();
    this.node?.disconnect();
    this.stream?.getTracks().forEach((t) => t.stop());
    void this.ctx?.close();
    this.ctx = null;
    this.stream = null;
    this.node = null;
    this.analyser = null;
    this.pending = [];
    this.carry = 0;
  }
}
