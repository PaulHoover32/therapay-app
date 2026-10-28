"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ThreadSummary } from "@/lib/threads";

interface Props {
  thread: ThreadSummary | null;
  onClose: () => void;
  onSave: (title: string) => void;
}

export default function RenameThreadDialog({ thread, onClose, onSave }: Props) {
  return (
    <Dialog open={!!thread} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Rename conversation</DialogTitle>
        </DialogHeader>
        {/* Keyed so the field resets to the selected thread's title */}
        {thread && <RenameForm key={thread.id} initial={thread.title ?? ""} onClose={onClose} onSave={onSave} />}
      </DialogContent>
    </Dialog>
  );
}

function RenameForm({ initial, onClose, onSave }: { initial: string; onClose: () => void; onSave: (t: string) => void }) {
  const [title, setTitle] = useState(initial);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = title.trim();
        if (trimmed) onSave(trimmed.slice(0, 80));
        onClose();
      }}
      className="flex flex-col gap-4"
    >
      <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus maxLength={80} />
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">Save</Button>
      </DialogFooter>
    </form>
  );
}
