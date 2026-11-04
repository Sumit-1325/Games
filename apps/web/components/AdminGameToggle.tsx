"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";

export function AdminGameToggle({ slug, isActive }: { slug: string; isActive: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <input
      type="checkbox"
      role="switch"
      aria-label={`${slug} active`}
      checked={isActive}
      disabled={busy}
      className="size-5 accent-indigo-600"
      onChange={async (e) => {
        setBusy(true);
        await api.setGameActive(slug, e.target.checked).finally(() => setBusy(false));
        router.refresh();
      }}
    />
  );
}
