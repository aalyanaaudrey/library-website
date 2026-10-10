import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { markAllNotificationsRead } from "@/app/actions/auth";

/** Form-post from the header bell. Marks everything read and returns. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (user) await markAllNotificationsRead();

  const url = new URL(request.url);
  const back = request.headers.get("referer") ?? "/";
  // Only honour same-origin redirects.
  const target = new URL(back, url.origin).origin === url.origin ? back : "/account";
  return NextResponse.redirect(new URL(target, url.origin), 303);
}
