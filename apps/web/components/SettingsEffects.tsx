"use client";

import { useEffect } from "react";
import { useSettings } from "@/lib/settings";

/** Applies the app's Reduce motion setting to <html>; globals.css turns animations off. */
export function SettingsEffects() {
  const { reduceMotion } = useSettings();
  useEffect(() => {
    document.documentElement.dataset.reduceMotion = String(reduceMotion);
  }, [reduceMotion]);
  return null;
}
