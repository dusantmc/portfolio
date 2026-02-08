import { NextResponse } from "next/server";
import { authenticateRequest, createAdminClientOrError, readIncomingShares } from "../_lib";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const setup = createAdminClientOrError();
  if (!setup.admin) return setup.response;
  const { admin } = setup;

  const auth = await authenticateRequest(req, admin);
  if (!auth.user) return auth.response;

  const { data, error } = await admin
    .from("kcals_state")
    .select("profile")
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (error && (error as { code?: string }).code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const items = readIncomingShares(data?.profile);
  return NextResponse.json({ items });
}

