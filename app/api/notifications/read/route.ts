import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { markAllNotificationsRead } from "@/app/actions/auth";

/**
 * Form-post from the header bell. Marks everything read and returns.
 *
 * Like signout, this emits a RELATIVE Location so the redirect survives a
 * reverse proxy. Only the path and query of the referrer are carried over, so
 * the header can never carry an absolute origin and a hostile referrer cannot
 * bounce the visitor off-site.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (user) await markAllNotificationsRead();

  let target = "/account";

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      const { pathname, search } = new URL(referer);
      target = `${pathname}${search}`;
    } catch {
      // Malformed referrer — keep the safe fallback.
    }
  }

  const response = new NextResponse(null, { status: 303 });
  response.headers.set("Location", target);
  return response;
}
