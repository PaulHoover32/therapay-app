import { Header } from "../components/Header";
import { SessionForm } from "../components/SessionForm";
import { useReferenceData } from "../hooks/useReferenceData";
import { useTherapistId } from "../hooks/useTherapistId";

interface Props {
  userId: string;
  onLogout: () => void;
}

export function SessionView({ userId, onLogout }: Props) {
  const { payers, sessionCodes, loading } = useReferenceData();
  const therapistId = useTherapistId(userId);

  return (
    <div className="flex flex-col min-h-screen">
      <Header onLogout={onLogout} />
      <div className="flex-1">
        {loading ? (
          <div className="flex flex-col gap-4 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-4 w-24 rounded bg-muted animate-pulse" />
                <div className="h-9 w-full rounded-md bg-muted animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <SessionForm
            therapistId={therapistId}
            payers={payers}
            sessionCodes={sessionCodes}
          />
        )}
      </div>
    </div>
  );
}
