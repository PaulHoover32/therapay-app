"use client";

import { useState } from "react";
import { Session, SessionInput, ReferencePayer, ReferenceSessionCode } from "@/lib/types";
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
import { Pencil, Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { format, parseISO } from "date-fns";
import EditSessionModal from "./EditSessionModal";

interface Props {
  sessions: Session[];
  onUpdate: (session: Session) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAdd: (input: SessionInput) => void;
  payers: ReferencePayer[];
  sessionCodes: ReferenceSessionCode[];
}

const PAGE_SIZE = 10;

const fmt$ = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(v);

const paymentBadgeClass: Record<string, string> = {
  "self-pay": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  "eap":      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  "insurance": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
};

const paymentBadgeLabel: Record<string, string> = {
  "self-pay": "Cash",
  "eap": "EAP",
  "insurance": "Insurance",
};

export default function SessionLedger({ sessions, onUpdate, onDelete, onAdd, payers, sessionCodes }: Props) {
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [page, setPage] = useState(0);

  const sorted = [...sessions].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageRows = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  async function handleDelete(id: string) {
    await onDelete(id);
    // If deleting the last item on a non-first page, go back one page
    const newTotal = Math.max(1, Math.ceil((sorted.length - 1) / PAGE_SIZE));
    if (page >= newTotal) setPage(newTotal - 1);
  }

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">
          Session Ledger
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            ({sessions.length} sessions)
          </span>
        </h2>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Add Session
        </Button>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">Session Date</TableHead>
              <TableHead>Payer</TableHead>
              <TableHead className="whitespace-nowrap">Session Code</TableHead>
              <TableHead className="whitespace-nowrap">Appointment Type</TableHead>
              <TableHead className="text-right whitespace-nowrap">Duration</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.map((session) => (
              <TableRow key={session.id}>
                <TableCell className="whitespace-nowrap text-sm">
                  <div>{format(parseISO(session.session_datetime), "MMM d, yyyy h:mm a")}</div>
                  {session.updated_at !== session.created_at && (
                    <div className="text-xs text-muted-foreground">
                      Edited {format(parseISO(session.updated_at), "MMM d 'at' h:mm a")}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  <div>{session.payer}</div>
                  <Badge
                    variant="secondary"
                    className={`text-xs mt-0.5 ${paymentBadgeClass[session.payment_option] ?? paymentBadgeClass.insurance}`}
                  >
                    {paymentBadgeLabel[session.payment_option] ?? "Insurance"}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-sm">{session.session_code}</TableCell>
                <TableCell className="text-sm capitalize">{session.appointment_type}</TableCell>
                <TableCell className="text-right text-sm">{session.session_duration} min</TableCell>
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
                      onClick={() => handleDelete(session.id)}
                      aria-label="Delete session"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {pageRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  No sessions yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3 text-sm text-muted-foreground">
          <span>
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, sorted.length)} of {sorted.length}
          </span>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 0}
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="flex items-center px-2">
              {page + 1} / {totalPages}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages - 1}
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      <EditSessionModal
        session={editingSession}
        open={!!editingSession}
        mode="edit"
        onClose={() => setEditingSession(null)}
        onSave={onUpdate}
        onSaveAsNew={onAdd}
        payers={payers}
        sessionCodes={sessionCodes}
      />

      <EditSessionModal
        session={null}
        open={addOpen}
        mode="add"
        onClose={() => setAddOpen(false)}
        onSave={() => {}}
        onSaveAsNew={onAdd}
        payers={payers}
        sessionCodes={sessionCodes}
      />
    </>
  );
}
