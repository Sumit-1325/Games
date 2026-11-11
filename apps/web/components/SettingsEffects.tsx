"use client";

import { useEffect } from "react";
import { ensureSession } from "@/lib/auth-client";
import { useSettings } from "@/lib/settings";

/** Applies the app's settings and quietly prewarms session credentials in background. */
export function SettingsEffects() {
  const { reduceMotion } = useSettings();

  useEffect(() => {
    document.documentElement.dataset.reduceMotion = String(reduceMotion);
  }, [reduceMotion]);

  useEffect(() => {
    // Prewarm anonymous guest session during idle time so game starts are instant
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(() => {
        ensureSession().catch(() => {});
      });
    } else {
      setTimeout(() => {
        ensureSession().catch(() => {});
      }, 500);
    }
  }, []);

  return null;
}
