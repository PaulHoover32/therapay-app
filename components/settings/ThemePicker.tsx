"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

const OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

export default function ThemePicker() {
  const { theme, setTheme } = useTheme();
  // Theme is only known on the client; avoid a mismatched highlight on first render
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);

  return (
    <div className="flex gap-2">
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <Button
          key={value}
          variant={mounted && theme === value ? "default" : "outline"}
          size="sm"
          onClick={() => setTheme(value)}
        >
          <Icon className="size-4" /> {label}
        </Button>
      ))}
    </div>
  );
}
