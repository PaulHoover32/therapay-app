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
} as const;
