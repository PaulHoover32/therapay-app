// Voice behavior. Speech-to-text runs on device (see lib/privacy/config.ts); only redacted text is sent.
export const VOICE_CONFIG = {
  sampleRate: 16000, // Whisper's expected input rate
  frameMs: 30, // VAD analysis frame
  // Energy VAD: speech when RMS exceeds max(minThreshold, noiseFloor * noiseMultiplier)
  minThreshold: 0.012,
  noiseMultiplier: 3,
  speechStartFrames: 3, // ~90ms of speech before we call it speech
  silenceEndMs: 900, // pause length that ends a hands-free turn
  partialEveryMs: 1200, // live transcript refresh while speaking
  maxUtteranceSec: 30,
  // Hands-free stops listening after this much idle time to avoid an always-hot mic
  idleTimeoutMs: 60_000,
} as const;
