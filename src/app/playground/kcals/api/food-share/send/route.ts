import { NextResponse } from "next/server";
import {
  authenticateRequest,
  createAdminClientOrError,
  findAuthUserByEmail,
  normalizeEmail,
  normalizeShareItem,
  readIncomingShares,
  writeIncomingShares,
  type IncomingFoodShare,
} from "../_lib";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const setup = createAdminClientOrError();
  if (!setup.admin) return setup.response;
  const { admin } = setup;

  const auth = await authenticateRequest(req, admin);
  if (!auth.user) return auth.response;
  const sender = auth.user;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const recipientEmailRaw =
    body && typeof body === "object" ? (body as Record<string, unknown>).recipientEmail : null;
  const recipientEmail = typeof recipientEmailRaw === "string" ? normalizeEmail(recipientEmailRaw) : "";
  if (!recipientEmail) {
    return NextResponse.json({ error: "Enter email address." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (normalizeEmail(sender.email ?? "") === recipientEmail) {
    return NextResponse.json({ error: "You cannot send food to your own email." }, { status: 400 });
  }

  const itemRaw = body && typeof body === "object" ? (body as Record<string, unknown>).item : null;
  const item = normalizeShareItem(itemRaw);
  if (!item) {
    return NextResponse.json({ error: "Invalid shared food item." }, { status: 400 });
  }

  let recipientUser;
  try {
    recipientUser = await findAuthUserByEmail(admin, recipientEmail);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to check recipient." },
      { status: 500 }
    );
  }

  if (!recipientUser) {
    return NextResponse.json({ error: "User does not exist yet." }, { status: 404 });
  }

  const nowIso = new Date().toISOString();
  const share: IncomingFoodShare = {
    id: crypto.randomUUID(),
    fromUserId: sender.id,
    fromEmail: normalizeEmail(sender.email ?? ""),
    createdAt: nowIso,
    item,
  };

  const { data: recipientState, error: recipientStateError } = await admin
    .from("kcals_state")
    .select("profile")
    .eq("user_id", recipientUser.id)
    .maybeSingle();
  if (recipientStateError && (recipientStateError as { code?: string }).code !== "PGRST116") {
    return NextResponse.json({ error: recipientStateError.message }, { status: 500 });
  }

  const incoming = readIncomingShares(recipientState?.profile);
  const nextProfile = writeIncomingShares(recipientState?.profile, [share, ...incoming]);

  if (recipientState) {
    const { error } = await admin
      .from("kcals_state")
      .update({ profile: nextProfile, updated_at: nowIso })
      .eq("user_id", recipientUser.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    const { error } = await admin.from("kcals_state").insert({
      user_id: recipientUser.id,
      profile: nextProfile,
      updated_at: nowIso,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}

