import type { Metadata } from "next";
import { Atkinson_Hyperlegible_Mono, Atkinson_Hyperlegible_Next, Literata } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// Type roles: DESIGN.md → Typography
const literata = Literata({
  variable: "--font-literata",
  subsets: ["latin"],
  axes: ["opsz"],
});

const atkinson = Atkinson_Hyperlegible_Next({
  variable: "--font-atkinson",
  subsets: ["latin"],
});

const atkinsonMono = Atkinson_Hyperlegible_Mono({
  variable: "--font-atkinson-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Therapay",
  description: "Ask Claude or ChatGPT whether your therapy practice is on track this year. Answers come from your payouts, never your clients.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${literata.variable} ${atkinson.variable} ${atkinsonMono.variable} h-full antialiased dark`}
    >
      <body className="h-full flex flex-col">
          <TooltipProvider>
            {children}
            <Toaster />
          </TooltipProvider>
        </body>
    </html>
  );
}
