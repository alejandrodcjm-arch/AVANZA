import { NextResponse, type NextRequest } from "next/server";
import { CTX_COOKIE } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const res = NextResponse.redirect(new URL("/entrar", request.nextUrl.origin), { status: 303 });
  res.cookies.delete(CTX_COOKIE);
  return res;
}
