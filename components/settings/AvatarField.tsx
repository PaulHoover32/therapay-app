"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase";

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

interface Props {
  userId: string;
  name: string;
  avatarUrl: string | null;
}

export default function AvatarField({ userId, name, avatarUrl }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(avatarUrl);
  const [uploading, setUploading] = useState(false);

  async function upload(file: File) {
    if (!ALLOWED.includes(file.type)) return toast.error("Use a JPG, PNG, or WebP image.");
    if (file.size > MAX_BYTES) return toast.error("Images must be under 5 MB.");

    setUploading(true);
    const supabase = createSupabaseBrowserClient();
    const path = `${userId}/avatar.${file.type.split("/")[1]}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
    if (error) {
      setUploading(false);
      return toast.error("Upload failed.");
    }
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = `${publicUrl}?t=${Date.now()}`;
    await supabase.from("therapists").update({ avatar_url: url }).eq("user_id", userId);
    setPreview(url);
    setUploading(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar className="size-14">
        <AvatarImage src={preview ?? undefined} alt="" className="object-cover" />
        <AvatarFallback>{name.slice(0, 1).toUpperCase() || "?"}</AvatarFallback>
      </Avatar>
      <Button variant="outline" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
        {uploading ? "Uploading…" : "Change photo"}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED.join(",")}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
