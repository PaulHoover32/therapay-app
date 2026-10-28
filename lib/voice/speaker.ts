"use client";

// Queued text-to-speech. Uses the browser's built-in voices by default (free, no key);
// /api/tts (Cartesia) is used when the server has a key configured.

type Provider = "browser" | "server";

export class Speaker {
  private queue: string[] = [];
  private playing = false;
  private audio: HTMLAudioElement | null = null;
  private abort: AbortController | null = null;
  private provider: Provider | null = null;
  onStateChange?: (speaking: boolean) => void;

  private async resolveProvider(): Promise<Provider> {
    if (this.provider) return this.provider;
    try {
      const res = await fetch("/api/tts", { method: "GET" });
      this.provider = res.ok && (await res.json()).available ? "server" : "browser";
    } catch {
      this.provider = "browser";
    }
    return this.provider;
  }

  get speaking() {
    return this.playing || this.queue.length > 0;
  }

  enqueue(sentence: string) {
    this.queue.push(sentence);
    if (!this.playing) void this.next();
  }

  stop() {
    this.queue = [];
    this.abort?.abort();
    this.audio?.pause();
    this.audio = null;
    if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
    this.setPlaying(false);
  }

  private setPlaying(v: boolean) {
    if (this.playing === v) return;
    this.playing = v;
    this.onStateChange?.(v);
  }

  private async next() {
    const text = this.queue.shift();
    if (!text) return this.setPlaying(false);
    this.setPlaying(true);
    const provider = await this.resolveProvider();
    try {
      await (provider === "server" ? this.playServer(text) : this.playBrowser(text));
    } catch {
      // Skip a sentence that failed to synthesize rather than stalling the queue
    }
    if (this.playing) void this.next();
  }

  private playBrowser(text: string) {
    return new Promise<void>((resolve) => {
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.05;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      speechSynthesis.speak(u);
    });
  }

  private async playServer(text: string) {
    this.abort = new AbortController();
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: this.abort.signal,
    });
    if (!res.ok) throw new Error("tts failed");
    const url = URL.createObjectURL(await res.blob());
    try {
      await new Promise<void>((resolve, reject) => {
        this.audio = new Audio(url);
        this.audio.onended = () => resolve();
        this.audio.onerror = () => reject(new Error("playback failed"));
        this.audio.play().catch(reject);
      });
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}
