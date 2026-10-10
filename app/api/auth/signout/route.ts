import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";

/**
 * Form-post signout, then bounce back to the homepage.
 *
 * The Location header is deliberately RELATIVE. Deriving an absolute URL from
 * `request.url` records whatever origin the reverse proxy forwarded from, so
 * behind Railway/nginx the redirect points at the proxy's own internal host
 * (e.g. http://localhost:3000). The visitor's browser then navigates to their
 * own machine and reports "This site can't be reached".
 *
 * A relative Location is valid per RFC 9110 §10.2.2 and is resolved by the
 * browser against the page it is already on, so it is correct behind any proxy.
 */
export async function POST() {
  await destroySession();

  const response = new NextResponse(null, { status: 303 });
  response.headers.set("Location", "/");
  return response;
}
