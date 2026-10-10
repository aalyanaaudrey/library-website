import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function UnauthorisedPage() {
  const user = await getCurrentUser();

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-soft text-amber">
        <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" stroke="currentColor" strokeWidth="1.6">
          <path d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
        </svg>
      </div>

      <h1 className="mt-6 font-display text-3xl font-semibold">You do not have access</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-3">
        {user
          ? `Your account is registered as ${user.role.toLowerCase()}, and this area is restricted to library staff.`
          : "This area is restricted to library staff."}
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn-primary px-6 py-3">
          Back to home
        </Link>
        {user ? (
          <Link href="/account" className="btn-secondary px-6 py-3">
            My account
          </Link>
        ) : (
          <Link href="/login" className="btn-secondary px-6 py-3">
            Sign in
          </Link>
        )}
      </div>
    </div>
  );
}
