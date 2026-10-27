// Single place to switch models, providers, and limits.
// Model ids are provider-native; swap the provider import in the consumer to change vendors.

export const AI_CONFIG = {
  models: {
    // Main conversational agent (tools, analysis)
    chat: "claude-sonnet-4-6",
    // Cheap model for background chores like conversation titles
    title: "claude-haiku-4-5",
  },
  chat: {
    maxSteps: 15,
  },
  // Server-side text-to-speech (optional). Without CARTESIA_API_KEY the browser's own voices are used.
  tts: {
    provider: "cartesia",
    model: "sonic-2",
    // Any Cartesia voice id; override with CARTESIA_VOICE_ID
    defaultVoiceId: "f786b574-daa5-4673-aa0c-cbe3e8534c02",
    apiVersion: "2025-04-16",
    maxChars: 1000,
  },
} as const;
