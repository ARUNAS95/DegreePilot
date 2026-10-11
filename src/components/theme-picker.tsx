"use client";

import { useState, useSyncExternalStore } from "react";
import clsx from "clsx";
import { Palette, X } from "lucide-react";

export const THEMES = [
  { id: "indigo-peach", name: "Indigo & Peach", primary: "#4338ca", secondary: "#fb923c", bg: "#f7f7fc" },
  { id: "emerald-gold", name: "Emerald & Gold", primary: "#047857", secondary: "#eab308", bg: "#f6faf8" },
  { id: "ocean-coral", name: "Ocean & Coral", primary: "#0e7490", secondary: "#fb7185", bg: "#f5f9fb" },
  { id: "plum-sky", name: "Plum & Sky", primary: "#7c3aed", secondary: "#38bdf8", bg: "#faf8ff" },
  { id: "blue-amber", name: "Blue & Amber", primary: "#2563eb", secondary: "#f59e0b", bg: "#f7f9fc" },
];

const KEY = "degreepilot-theme";

/** Runs before paint (inlined in <head>) so a saved theme doesn't flash. */
export const themeInitScript = `try{var t=localStorage.getItem("${KEY}");if(t)document.documentElement.dataset.theme=t}catch(e){}`;

const listeners = new Set<() => void>();

function applyTheme(id: string) {
  document.documentElement.dataset.theme = id;
  try {
    localStorage.setItem(KEY, id);
  } catch {}
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Temporary palette switcher used while choosing the final colors. */
export function ThemePicker() {
  const [open, setOpen] = useState(false);
  const active = useSyncExternalStore(
    subscribe,
    () => document.documentElement.dataset.theme ?? THEMES[0].id,
    () => THEMES[0].id,
  );

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="no-print fixed right-4 bottom-4 z-50 grid size-11 place-items-center rounded-full bg-primary text-white shadow-lg"
        aria-label="Choose color theme"
      >
        <Palette className="size-5" />
      </button>
    );
  }

  return (
    <div className="no-print fixed right-4 bottom-4 z-50 w-64 rounded-2xl border border-border bg-surface p-3 shadow-2xl">
      <div className="mb-2 flex items-center justify-between px-1">
        <p className="text-sm font-semibold">Try a color theme</p>
        <button onClick={() => setOpen(false)} className="text-muted hover:text-foreground" aria-label="Close">
          <X className="size-4" />
        </button>
      </div>
      <ul className="grid gap-1">
        {THEMES.map((t) => (
          <li key={t.id}>
            <button
              onClick={() => applyTheme(t.id)}
              className={clsx(
                "flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-sm transition",
                active === t.id ? "bg-primary-soft font-semibold text-primary-ink" : "hover:bg-surface-muted",
              )}
            >
              <span className="flex overflow-hidden rounded-md border border-border">
                <span className="size-5" style={{ background: t.bg }} />
                <span className="size-5" style={{ background: t.primary }} />
                <span className="size-5" style={{ background: t.secondary }} />
              </span>
              {t.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
