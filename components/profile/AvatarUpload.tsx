"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { Camera } from "lucide-react";

interface AvatarUploadProps {
  userId: string;
  name: string;
  avatarUrl: string | null;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function AvatarUpload({ userId, name, avatarUrl }: AvatarUploadProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(avatarUrl);
  const [uploading, setUploading] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const supabase = createSupabaseBrowserClient();

    const ext = file.name.split(".").pop();
    const path = `${userId}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      console.error("Upload failed:", uploadError);
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("avatars")
      .getPublicUrl(path);

    // Cache-bust so the browser picks up the new image
    const urlWithBust = `${publicUrl}?t=${Date.now()}`;

    await supabase
      .from("therapists")
      .update({ avatar_url: urlWithBust })
      .eq("user_id", userId);

    setPreview(urlWithBust);
    setUploading(false);
    router.refresh();
  }

  return (
    <div
      className="relative group cursor-pointer"
      onClick={() => inputRef.current?.click()}
    >
      <Avatar className="h-16 w-16">
        <AvatarImage src={preview ?? undefined} alt={name} className="object-cover" />
        <AvatarFallback className="text-lg font-semibold bg-muted">
          {getInitials(name)}
        </AvatarFallback>
      </Avatar>

      <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
        {uploading
          ? <span className="text-white text-xs">…</span>
          : <Camera className="h-4 w-4 text-white" />
        }
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
