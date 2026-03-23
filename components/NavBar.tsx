interface Props {
  name: string;
}

export default function NavBar({ name }: Props) {
  return (
    <header className="border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center">
        <span className="font-bold text-lg">Therapay</span>
        <span className="text-muted-foreground text-sm ml-3 hidden sm:block">/ {name}</span>
      </div>
    </header>
  );
}
