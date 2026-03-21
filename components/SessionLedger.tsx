"use client";

import { useState } from "react";
import { Session } from "@/lib/seed-data";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import EditSessionModal from "./EditSessionModal";
import { toast } from "sonner";

interface Props {
  sessions: Session[];
  onUpdate: (session: Session) => void;
  onDelete: (id: string) => void;
  onAdd: (session: Session) => void;
}

const fmt$ = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(v);

const paymentColors: Record<string, string> = {
  insurance: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "self-pay": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  "sliding-scale": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  eap: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

export default function SessionLedger({ sessions, onUpdate, onDelete, onAdd }: Props) {
  const [editingSession, setEditingSession] = useState<Session | null>(null);

  const sorted = [...sessions]
    .sort((a, b) => new Date(b.session_datetime).getTime() - new Date(a.session_datetime).getTime())
    .slice(0, 50);

  return (
    <>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">Date</TableHead>
              <TableHead>Payer</TableHead>
              <TableHead className="whitespace-nowrap">Session Code</TableHead>
              <TableHead className="whitespace-nowrap">Appointment Type</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((session) => (
              <TableRow key={session.id}>
                <TableCell className="whitespace-nowrap text-sm">
                  {format(parseISO(session.session_datetime), "MMM d, yyyy h:mm a")}
                </TableCell>
                <TableCell className="text-sm">
                  <div>{session.payer}</div>
                  <Badge
                    variant="secondary"
                    className={`text-xs mt-0.5 ${paymentColors[session.payment_option]}`}
                  >
                    {session.payment_option}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-sm">{session.session_code}</TableCell>
                <TableCell className="text-sm capitalize">{session.appointment_type}</TableCell>
                <TableCell className="text-right font-medium">{fmt$(session.amount)}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setEditingSession(session)}
                      aria-label="Edit session"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => {
                        onDelete(session.id);
                        toast.success("Session deleted.");
                      }}
                      aria-label="Delete session"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {sorted.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  No sessions yet. Add your first session above.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <EditSessionModal
        session={editingSession}
        open={!!editingSession}
        onClose={() => setEditingSession(null)}
        onSave={onUpdate}
        onSaveAsNew={onAdd}
      />
    </>
  );
}
