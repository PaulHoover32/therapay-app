import { Toaster } from "sonner";
import { useAuth } from "./hooks/useAuth";
import { LoginView } from "./views/LoginView";
import { SessionView } from "./views/SessionView";

export function App() {
  const { session, loading, error, login, logout } = useAuth();

  // Still loading initial session from storage
  if (session === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <>
      {session ? (
        <SessionView userId={session.user.id} onLogout={logout} />
      ) : (
        <LoginView onLogin={login} loading={loading} error={error} />
      )}
      <Toaster richColors position="bottom-center" />
    </>
  );
}
