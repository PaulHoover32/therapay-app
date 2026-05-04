import Link from 'next/link';
import SignOutButton from '@/components/profile/SignOutButton';

export default function IDEHeader() {
  return (
    <header className="h-12 border-b flex items-center justify-between px-4 shrink-0 bg-background">
      <Link
        href="/"
        className="text-sm font-semibold tracking-tight hover:opacity-70 transition-opacity"
      >
        Therapay
      </Link>
      <SignOutButton />
    </header>
  );
}
