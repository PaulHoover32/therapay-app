// Where to send someone after they sign in. Only same-origin paths are allowed, so a crafted
// ?next= link can't bounce a freshly signed-in user to another site.
export const DEFAULT_AFTER_LOGIN = "/connect"

export function safeNext(value: string | null | undefined, fallback = DEFAULT_AFTER_LOGIN): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback
  return value
}
