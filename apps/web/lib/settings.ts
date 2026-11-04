"use client";

/**
 * Per-device settings (sound, reduce motion), kept in localStorage. Theme is
 * handled by next-themes. Kept local on purpose: these are device preferences.
 */
import { useSyncExternalStore } from "react";

export interface Settings {
  sound: boolean;
  reduceMotion: boolean;
}

const KEY = "cogniarena:settings";
const DEFAULTS: Settings = { sound: false, reduceMotion: false };
const listeners = new Set<() => void>();
let cache: Settings | null = null;

function read(): Settings {
  if (cache) return cache;
  try {
    cache = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    cache = DEFAULTS;
  }
  return cache!;
}

export function updateSettings(patch: Partial<Settings>) {
  cache = { ...read(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // Storage blocked (private mode): keep the setting for this visit only.
  }
  listeners.forEach((l) => l());
}

export function useSettings(): Settings {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    read,
    () => DEFAULTS,
  );
}
