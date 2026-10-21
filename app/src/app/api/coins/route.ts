import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.json([]);
  try {
    const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await supabase.from("coins")
      .select("mint,creator,name,symbol,uri,created_at,is_revoked,is_burned,holder_count")
      .order("created_at", { ascending: false }).limit(30);
    if (error) return NextResponse.json({ error: "Coin cache unavailable" }, { status: 503 });
    return NextResponse.json(data ?? [], { headers: { "Cache-Control": "public, max-age=15, stale-while-revalidate=30" } });
  } catch {
    return NextResponse.json({ error: "Coin cache unavailable" }, { status: 503 });
  }
}
