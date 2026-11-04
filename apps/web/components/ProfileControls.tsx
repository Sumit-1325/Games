"use client";

/** Client parts of the Profile page: profile form, settings, sign out, delete account. */
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { updateSettings, useSettings } from "@/lib/settings";

const input = "rounded-xl bg-zinc-100 px-3 py-2 dark:bg-zinc-800";

export function ProfileForm(props: { name: string; college: string | null; graduationYear: number | null; targetCompanies: string | null }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const year = Number(f.get("graduationYear"));
    setState("saving");
    const res = await authClient.updateUser({
      name: String(f.get("name") || props.name).slice(0, 80),
      college: String(f.get("college") ?? "").slice(0, 120) || undefined,
      graduationYear: year >= 2000 && year <= 2100 ? year : undefined,
      targetCompanies: String(f.get("targetCompanies") ?? "").slice(0, 200) || undefined,
    });
    setState(res.error ? "error" : "saved");
    router.refresh();
  };

  return (
    <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
      <label className="flex flex-col gap-1 text-sm">
        Name
        <input name="name" defaultValue={props.name} className={input} maxLength={80} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        College <span className="text-zinc-500">(optional)</span>
        <input name="college" defaultValue={props.college ?? ""} className={input} maxLength={120} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Graduation year <span className="text-zinc-500">(optional)</span>
        <input name="graduationYear" type="number" min={2000} max={2100} defaultValue={props.graduationYear ?? ""} className={input} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Target companies <span className="text-zinc-500">(optional)</span>
        <input name="targetCompanies" defaultValue={props.targetCompanies ?? ""} placeholder="e.g. Capgemini, TCS" className={input} maxLength={200} />
      </label>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button type="submit" disabled={state === "saving"} className="rounded-xl bg-indigo-600 px-5 py-2.5 font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
          Save profile
        </button>
        {state === "saved" && <span className="text-sm text-emerald-600">Saved</span>}
        {state === "error" && <span className="text-sm text-red-500">Couldn&apos;t save</span>}
      </div>
    </form>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-4 py-2">
      <span>
        <span className="font-medium">{label}</span>
        <span className="block text-sm text-zinc-500">{hint}</span>
      </span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-5 accent-indigo-600" />
    </label>
  );
}

export function SettingsPanel() {
  const settings = useSettings();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
      <label className="flex items-center justify-between gap-4 py-2">
        <span className="font-medium">Theme</span>
        <select value={mounted ? theme : "system"} onChange={(e) => setTheme(e.target.value)} className={input}>
          <option value="system">Match system</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </label>
      <Toggle label="Sound" hint="Soft tick on each blink, click on answer." checked={settings.sound} onChange={(sound) => updateSettings({ sound })} />
      <Toggle
        label="Reduce motion"
        hint="Turn off animations (your system setting is always respected too)."
        checked={settings.reduceMotion}
        onChange={(reduceMotion) => updateSettings({ reduceMotion })}
      />
    </div>
  );
}

export function AccountActions({ isAnonymous }: { isAnonymous: boolean }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const signOut = async () => {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api.deleteAccount();
      await authClient.signOut().catch(() => {});
      router.push("/?deleted=1");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {!isAnonymous && (
        <button type="button" onClick={signOut} className="self-start rounded-xl bg-zinc-200 px-5 py-2.5 font-medium hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700">
          Sign out
        </button>
      )}
      <div className="rounded-2xl p-4 ring-1 ring-red-200 dark:ring-red-900/60">
        <p className="font-medium">{isAnonymous ? "Delete my guest data" : "Delete my account and data"}</p>
        <p className="text-sm text-zinc-500">Removes your profile, every session and all progress. This can&apos;t be undone.</p>
        {confirming ? (
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={remove} disabled={busy} className="rounded-xl bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-500 disabled:opacity-50">
              {busy ? "Deleting…" : "Yes, delete everything"}
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="rounded-xl px-4 py-2 font-medium hover:underline">
              Cancel
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} className="mt-3 rounded-xl px-4 py-2 font-medium text-red-600 ring-1 ring-red-300 hover:bg-red-50 dark:ring-red-800 dark:hover:bg-red-950/40">
            Delete…
          </button>
        )}
      </div>
    </div>
  );
}
