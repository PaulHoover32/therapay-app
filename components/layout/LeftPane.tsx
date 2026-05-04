'use client';

import { useViewStore } from '@/lib/stores/viewStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';

export default function LeftPane() {
  const notes = useViewStore((s) => s.notes);

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-2 border-b shrink-0">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Notes</p>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0.5">
          {notes.length === 0 ? (
            <p className="text-xs text-muted-foreground px-2 py-6 text-center leading-relaxed">
              As you chat, notes will appear here
            </p>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                className="px-2 py-2 rounded-md hover:bg-muted cursor-pointer"
              >
                <p className="text-[10px] text-muted-foreground mb-0.5">
                  {format(note.timestamp, 'h:mm a')}
                </p>
                <p className="text-xs text-foreground leading-snug line-clamp-2">
                  {note.content}
                </p>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
