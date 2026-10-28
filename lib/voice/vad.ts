import { VOICE_CONFIG } from "./config";

// Energy-based voice activity detection with an adaptive noise floor.
// Lightweight (no model download); good enough for push-to-talk, hands-free turn ends, and barge-in.
export class EnergyVad {
  private noiseFloor = 0.005;
  private speechRun = 0;
  private silenceMs = 0;
  speaking = false;

  // Returns "start" / "end" on transitions, otherwise null
  push(rms: number): "start" | "end" | null {
    const threshold = Math.max(VOICE_CONFIG.minThreshold, this.noiseFloor * VOICE_CONFIG.noiseMultiplier);
    const isSpeech = rms > threshold;
    if (!isSpeech) this.noiseFloor = this.noiseFloor * 0.95 + rms * 0.05;

    if (!this.speaking) {
      this.speechRun = isSpeech ? this.speechRun + 1 : 0;
      if (this.speechRun >= VOICE_CONFIG.speechStartFrames) {
        this.speaking = true;
        this.silenceMs = 0;
        return "start";
      }
      return null;
    }

    this.silenceMs = isSpeech ? 0 : this.silenceMs + VOICE_CONFIG.frameMs;
    if (this.silenceMs >= VOICE_CONFIG.silenceEndMs) {
      this.speaking = false;
      this.speechRun = 0;
      return "end";
    }
    return null;
  }

  reset() {
    this.speaking = false;
    this.speechRun = 0;
    this.silenceMs = 0;
  }
}
