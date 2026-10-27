import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import type { UIMessage } from "ai";

// App-level encryption for stored conversations (AES-256-GCM). The key lives only in the
// server environment (TRANSCRIPT_ENCRYPTION_KEY, 32 bytes base64), so a database dump alone
// can't be read. Messages are already name-redacted before they reach the server.

interface Envelope {
  enc: "aes-256-gcm/v1";
  iv: string;
  tag: string;
  data: string;
}

let warned = false;

function key(): Buffer | null {
  const raw = process.env.TRANSCRIPT_ENCRYPTION_KEY;
  if (!raw) {
    if (!warned) console.warn("TRANSCRIPT_ENCRYPTION_KEY is not set; conversations are stored unencrypted.");
    warned = true;
    return null;
  }
  const buf = Buffer.from(raw, "base64");
  if (buf.length !== 32) throw new Error("TRANSCRIPT_ENCRYPTION_KEY must be 32 bytes, base64-encoded");
  return buf;
}

export function encryptMessages(messages: UIMessage[]): UIMessage[] | Envelope {
  const k = key();
  if (!k) return messages;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", k, iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(messages), "utf8"), cipher.final()]);
  return { enc: "aes-256-gcm/v1", iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), data: data.toString("base64") };
}

function isEnvelope(v: unknown): v is Envelope {
  return typeof v === "object" && v !== null && (v as Envelope).enc === "aes-256-gcm/v1";
}

// Accepts both encrypted envelopes and legacy plaintext arrays
export function decryptMessages(stored: unknown): UIMessage[] {
  if (!isEnvelope(stored)) return (stored as UIMessage[]) ?? [];
  const k = key();
  if (!k) throw new Error("Conversation is encrypted but TRANSCRIPT_ENCRYPTION_KEY is not set");
  const decipher = createDecipheriv("aes-256-gcm", k, Buffer.from(stored.iv, "base64"));
  decipher.setAuthTag(Buffer.from(stored.tag, "base64"));
  const json = Buffer.concat([decipher.update(Buffer.from(stored.data, "base64")), decipher.final()]).toString("utf8");
  return JSON.parse(json) as UIMessage[];
}
