import { SignInForm } from "@/components/SignInForm";
import { googleEnabled } from "@/lib/server/auth";
import { getCurrentUser } from "@/lib/server/current-user";

export const metadata = { title: "Sign in · CogniArena" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next: rawNext } = await searchParams;
  // Only same-site paths, so the link can't bounce people to another site.
  const next = rawNext?.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";
  const user = await getCurrentUser();

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-6 py-12">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Sign in</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {user?.isAnonymous
            ? "You're playing as a guest. Sign in to keep your history on every device; your guest results come with you."
            : "Save your history and progress. No password needed."}
        </p>
      </div>
      <SignInForm googleEnabled={googleEnabled()} next={next} />
    </div>
  );
}
