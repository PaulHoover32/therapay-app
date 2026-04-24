import { ExternalLink, LogOut } from "lucide-react";
import { Button } from "./ui/button";
import { APP_URL } from "../constants";

interface Props {
  onLogout: () => void;
}

export function Header({ onLogout }: Props) {
  function openApp() {
    chrome.tabs.create({ url: `${APP_URL}/dashboard` });
  }

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-border">
      <span className="font-semibold text-base tracking-tight">Therapay</span>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={openApp} className="gap-1.5 text-muted-foreground hover:text-foreground">
          <ExternalLink className="h-3.5 w-3.5" />
          Open App
        </Button>
        <Button variant="ghost" size="icon" onClick={onLogout} title="Sign out">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
