export const metadata = { title: "Privacy · CogniArena" };

export default function PrivacyPage() {
  return (
    <article className="mx-auto flex max-w-2xl flex-col gap-4 py-10 leading-relaxed">
      <h1 className="text-3xl font-bold">Privacy</h1>
      <p>CogniArena collects only what the practice features need.</p>
      <h2 className="mt-2 text-xl font-semibold">What we store</h2>
      <ul className="list-disc space-y-1 pl-6">
        <li>Your account: name, email and profile picture from Google or your email address, plus the optional college, graduation year and target companies you enter.</li>
        <li>Your games: each session&apos;s mode, settings, level-by-level answers, reaction times and scores, so you can see your history and progress.</li>
        <li>A sign-in cookie, so you stay signed in. Guests get the same cookie and an anonymous account.</li>
        <li>Device settings (sound, reduce motion) stay in your browser and are never sent to us.</li>
      </ul>
      <h2 className="mt-2 text-xl font-semibold">What we don&apos;t do</h2>
      <p>We don&apos;t sell your data, show ads, or share your results with any company. CogniArena is an independent practice tool and isn&apos;t affiliated with any employer or assessment provider.</p>
      <h2 className="mt-2 text-xl font-semibold">Deleting your data</h2>
      <p>Profile → Account → &ldquo;Delete my account and data&rdquo; removes your account and every session immediately.</p>
    </article>
  );
}
