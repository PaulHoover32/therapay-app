// Brand marks for the sign-in buttons (Lucide doesn't ship brand logos)

export function GoogleIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.09 3.57-5.16 3.57-8.81Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.07.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.95H1.27v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58v-3.1H1.27a12 12 0 0 0 0 10.78l4-3.1Z" />
      <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.43-3.43A11.5 11.5 0 0 0 12 0 12 12 0 0 0 1.27 6.61l4 3.1C6.22 6.88 8.87 4.77 12 4.77Z" />
    </svg>
  );
}

export function AppleIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" {...props}>
      <path d="M16.37 12.73c-.03-2.7 2.2-4 2.3-4.06-1.25-1.83-3.2-2.08-3.9-2.11-1.66-.17-3.24.98-4.08.98-.85 0-2.14-.96-3.52-.93a5.22 5.22 0 0 0-4.41 2.68c-1.88 3.26-.48 8.09 1.35 10.74.9 1.3 1.96 2.75 3.36 2.7 1.35-.05 1.86-.87 3.49-.87s2.09.87 3.52.84c1.45-.03 2.37-1.32 3.26-2.62a11.6 11.6 0 0 0 1.47-3.03 4.7 4.7 0 0 1-2.84-4.32ZM13.69 4.8A4.7 4.7 0 0 0 14.8 1.4a4.8 4.8 0 0 0-3.13 1.62 4.5 4.5 0 0 0-1.14 3.28c1.2.09 2.42-.6 3.16-1.5Z" />
    </svg>
  );
}

export function MicrosoftIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path fill="#F25022" d="M1 1h10.5v10.5H1z" />
      <path fill="#7FBA00" d="M12.5 1H23v10.5H12.5z" />
      <path fill="#00A4EF" d="M1 12.5h10.5V23H1z" />
      <path fill="#FFB900" d="M12.5 12.5H23V23H12.5z" />
    </svg>
  );
}
