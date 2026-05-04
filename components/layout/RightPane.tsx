'use client';

export default function RightPane() {
  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-2 border-b shrink-0">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Context</p>
      </div>
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-xs text-muted-foreground text-center leading-relaxed">
          Contextual data will appear here
        </p>
      </div>
    </div>
  );
}
