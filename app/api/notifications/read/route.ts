import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { markAllNotificationsRead } from "@/app/actions/auth";
import { safeReturnTo } from "@/lib/utils";

/**
 * Form-post from the header bell. Marks everything read and returns.
 *
 * Like signout, this emits a RELATIVE Location so the redirect survives a
 * reverse proxy. Only the path and query of the referrer are carried over, so
 * the header can never carry an absolute origin.
 *
 * The assembled path is still run through `safeReturnTo`: a referrer of
 * `https://evil.com//evil.com` has a pathname of `//evil.com`, and a Location
 * of `//evil.com` is a protocol-relative open redirect.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (user) await markAllNotificationsRead();

  const referer = request.headers.get("referer");
  let candidate = "";
  if (referer) {
    try {
      const { pathname, search } = new URL(referer);
      candidate = `${pathname}${search}`;
    } catch {
      // Malformed referrer — fall through to the default.
    }
  }

  const target = safeReturnTo(candidate, "/account");

  const response = new NextResponse(null, { status: 303 });
  response.headers.set("Location", target);
  return response;
}

