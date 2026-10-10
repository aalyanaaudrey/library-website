import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";

/** Form-post signout, then bounce back to the homepage. */
export async function POST(request: Request) {
  await destroySession();
  const url = new URL(request.url);
  return NextResponse.redirect(new URL("/", url.origin), 303);
}
