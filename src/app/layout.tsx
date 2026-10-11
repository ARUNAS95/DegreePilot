import type { Metadata } from "next";
import { DM_Mono, DM_Sans, Fraunces } from "next/font/google";
import Link from "next/link";
import { Compass } from "lucide-react";
import { ThemePicker, themeInitScript } from "@/components/theme-picker";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DegreePilot - AI degree planner",
  description:
    "Tell DegreePilot your goals and get a semester-by-semester course roadmap with prerequisites, term availability, professors and reviews.",
};

const NAV = [
  { href: "/#how", label: "How it works" },
  { href: "/catalog", label: "Courses & professors" },
  { href: "/mcp", label: "For AI assistants" },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${dmMono.variable} ${fraunces.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        <nav className="sticky top-0 z-30 border-b border-border bg-surface/90 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-2 font-display text-xl font-semibold">
              <span className="grid size-7 place-items-center rounded-lg bg-primary text-white">
                <Compass className="size-4" />
              </span>
              DegreePilot
            </Link>
            <div className="flex items-center gap-1 text-sm">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="hidden rounded-lg px-3 py-1.5 font-medium text-muted transition hover:bg-primary-soft hover:text-primary-ink sm:block"
                >
                  {n.label}
                </Link>
              ))}
              <Link href="/catalog" className="rounded-lg px-3 py-1.5 font-medium text-muted hover:text-primary-ink sm:hidden">
                Courses
              </Link>
              <Link href="/#plan" className="ml-1 rounded-xl bg-primary px-3 py-2 font-semibold whitespace-nowrap text-white sm:ml-2 sm:px-4 shadow-sm shadow-primary/30 transition hover:bg-primary-hover">
                Plan my degree
              </Link>
            </div>
          </div>
        </nav>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-border py-6 text-center text-xs text-muted">
          DegreePilot is a planning aid, not an official degree audit. Always confirm with your advisor and the
          university catalog.
        </footer>
        <ThemePicker />
      </body>
    </html>
  );
}
