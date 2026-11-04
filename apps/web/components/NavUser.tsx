import Link from "next/link";
import { getCurrentUser } from "@/lib/server/current-user";

/** Right side of the nav: Dashboard, plus Profile (signed in / guest) or Sign in. */
export async function NavUser() {
  const user = await getCurrentUser();
  const link = "rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800";
  return (
    <>
      <Link href="/dashboard" className={link}>
        Dashboard
      </Link>
      {user?.role === "admin" && (
        <Link href="/admin" className={link}>
          Admin
        </Link>
      )}
      {user && !user.isAnonymous ? (
        <Link href="/profile" className={link}>
          {user.name.split(" ")[0]}
        </Link>
      ) : (
        <>
          {user && (
            <Link href="/profile" className={link}>
              History
            </Link>
          )}
          <Link href="/sign-in" className={`${link} text-indigo-600 dark:text-indigo-400`}>
            Sign in
          </Link>
        </>
      )}
    </>
  );
}
