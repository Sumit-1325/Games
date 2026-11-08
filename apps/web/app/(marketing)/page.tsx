/**
 * Landing page: hero with a live game preview, how it works, games, why
 * practise here, and a closing call to action. No invented numbers or
 * testimonials, and no company logos (PLAN.md → legal note).
 */
import Link from "next/link";
import type { ReactNode } from "react";
import { HeroPreview } from "@/components/HeroPreview";
import { games } from "@/lib/registry";

const comingSoon = [
  { title: "Switch Challenge", blurb: "Work out which operator turns one symbol row into another.", skills: ["deductive logic"] },
];

const steps = [
  { title: "Watch the demo", body: "A ball blinks, then we answer two shape questions for you, so you see exactly how it works before you try one." },
  { title: "Take the timed test", body: "6 or 9 minutes, like the real round. Levels get harder as you pass and ease off if you slip." },
  { title: "See where you stand", body: "Your score, highest level, accuracy and reaction time, saved to your history so you can see progress." },
];

const features: { title: string; body: string; icon: ReactNode }[] = [
  {
    title: "The real test's flow",
    body: "Same structure as game-based campus rounds: demo first, then a timed session with adaptive levels.",
    icon: <path d="M5 12l4 4L19 6" />,
  },
  {
    title: "Fair, checked scores",
    body: "Every answer is re-scored on the server, so the history you build is accurate.",
    icon: <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />,
  },
  {
    title: "Track your progress",
    body: "A chart of your scores, your best level and a full history of every session.",
    icon: <path d="M4 19V5M4 19h16M8 15l4-4 3 3 5-6" />,
  },
  {
    title: "Phone, laptop, keyboard",
    body: "Plays on any screen, in light or dark mode. Use Y and N keys to answer fast.",
    icon: (
      <>
        <rect x="3" y="4" width="13" height="10" rx="1.5" />
        <rect x="15" y="9" width="6" height="11" rx="1.5" />
      </>
    ),
  },
];

const primaryBtn =
  "inline-flex items-center justify-center rounded-xl bg-indigo-600 px-7 py-3.5 text-lg font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500";
const secondaryBtn =
  "inline-flex items-center justify-center rounded-xl bg-white px-7 py-3.5 text-lg font-semibold text-zinc-900 ring-1 ring-zinc-300 transition hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-100 dark:ring-zinc-700 dark:hover:bg-zinc-800";

function SectionHeading({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="mx-auto mb-12 max-w-2xl text-center">
      <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
      {sub && <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">{sub}</p>}
    </div>
  );
}

export default function LandingPage() {
  const live = Object.values(games);

  return (
    <div className="flex flex-col gap-28 pb-12">
      {/* Hero */}
      <section className="grid items-center gap-16 pt-10 sm:pt-16 lg:grid-cols-[1.1fr_1fr]">
        <div className="flex flex-col items-center gap-7 text-center lg:items-start lg:text-left">
          <span className="rounded-full bg-indigo-100 px-4 py-1.5 text-sm font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
            Free practice for campus placement rounds
          </span>
          <h1 className="text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
            Ace the <span className="whitespace-nowrap text-indigo-600 dark:text-indigo-400">game-based</span> aptitude test
          </h1>
          <p className="max-w-xl text-xl leading-relaxed text-zinc-600 dark:text-zinc-400">
            Practise the memory and reasoning games used in campus hiring tests, inspired by the game-based assessments of companies like
            Capgemini. Learn the format, then train against the clock.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/dashboard" className={primaryBtn}>
              Start practising free
            </Link>
            <a href="#how-it-works" className={secondaryBtn}>
              How it works
            </a>
          </div>
          <p className="text-base text-zinc-500 dark:text-zinc-400">No sign-up needed · Works on phone and laptop</p>
        </div>
        <div className="pb-10 lg:pb-0">
          <HeroPreview />
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-24">
        <SectionHeading eyebrow="How it works" title="From first look to test-ready" sub="Each session takes under ten minutes." />
        <ol className="grid gap-6 md:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.title} className="rounded-3xl bg-white p-8 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-indigo-600 text-xl font-bold text-white">{i + 1}</span>
              <h3 className="mt-6 text-xl font-semibold">{s.title}</h3>
              <p className="mt-3 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Games */}
      <section>
        <SectionHeading eyebrow="Games" title="Pick a game and start" sub="More games from real placement rounds are on the way." />
        <div className="grid gap-6 lg:grid-cols-3">
          {live.map((g) => (
          <Link
            key={g.engine.slug}
            href={`/games/${g.engine.slug}`}
            className="group flex flex-col gap-5 rounded-3xl bg-white p-8 ring-2 ring-indigo-500 transition hover:shadow-xl hover:shadow-indigo-500/10 lg:col-span-1 dark:bg-zinc-900"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold">{g.engine.title}</h3>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">Live</span>
            </div>
            <p className="text-base leading-relaxed text-zinc-600 dark:text-zinc-400">{g.description}</p>
            <ul className="flex flex-wrap gap-2">
              {g.engine.skills.map((s) => (
                <li key={s} className="rounded-full bg-indigo-100 px-3 py-1 text-sm text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200">
                  {s}
                </li>
              ))}
            </ul>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">6 or 9 minute sessions · untimed practice too</p>
            <span className="mt-auto text-lg font-semibold text-indigo-600 group-hover:underline dark:text-indigo-400">Play now →</span>
          </Link>
          ))}
          {comingSoon.map((g) => (
            <div key={g.title} className="flex flex-col gap-5 rounded-3xl border-2 border-dashed border-zinc-300 p-8 dark:border-zinc-700">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-zinc-500 dark:text-zinc-400">{g.title}</h3>
                <span className="rounded-full bg-zinc-200 px-3 py-1 text-sm font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">Soon</span>
              </div>
              <p className="text-base leading-relaxed text-zinc-500 dark:text-zinc-400">{g.blurb}</p>
              <ul className="flex flex-wrap gap-2">
                {g.skills.map((s) => (
                  <li key={s} className="rounded-full bg-zinc-200 px-3 py-1 text-sm text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Why practise here */}
      <section>
        <SectionHeading eyebrow="Why practise here" title="Built to feel like the real round" />
        <div className="grid gap-6 sm:grid-cols-2">
          {features.map((f) => (
            <div key={f.title} className="flex gap-5 rounded-3xl bg-white p-8 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  {f.icon}
                </svg>
              </span>
              <div>
                <h3 className="text-xl font-semibold">{f.title}</h3>
                <p className="mt-2 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">{f.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Closing call to action */}
      <section className="rounded-[2rem] bg-gradient-to-br from-indigo-600 to-violet-600 px-8 py-16 text-center text-white shadow-xl shadow-indigo-600/20">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Your placement round is coming. Be ready.</h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-indigo-100">Start with a 30-second demo. No account needed: sign in later to keep your history.</p>
        <Link
          href="/dashboard"
          className="mt-8 inline-flex items-center justify-center rounded-xl bg-white px-8 py-4 text-lg font-semibold text-indigo-700 transition hover:bg-indigo-50"
        >
          Start practising free
        </Link>
      </section>
    </div>
  );
}
