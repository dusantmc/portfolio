import { NextResponse } from "next/server";
import {
  authenticateRequest,
  createAdminClientOrError,
  findAuthUserByEmail,
  normalizeEmail,
} from "../_lib";

interface RecipientAvatar {
  mode: "emoji" | "photo";
  emoji?: string;
  photo?: string | null;
}

export const runtime = "nodejs";

export async function POST(req: Request) {
  const setup = createAdminClientOrError();
  if (!setup.admin) return setup.response;
  const { admin } = setup;

  const auth = await authenticateRequest(req, admin);
  if (!auth.user) return auth.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const rawEmails =
    body && typeof body === "object" ? (body as Record<string, unknown>).emails : null;
  if (!Array.isArray(rawEmails)) {
    return NextResponse.json({ recipients: {} });
  }

  const emails = Array.from(
    new Set(
      rawEmails
        .filter((entry): entry is string => typeof entry === "string")
        .map((entry) => normalizeEmail(entry))
        .filter(Boolean)
    )
  ).slice(0, 20);

  if (emails.length === 0) {
    return NextResponse.json({ recipients: {} });
  }

  const recipients: Record<string, RecipientAvatar> = {};

  await Promise.all(
    emails.map(async (email) => {
      let recipientUserId: string | null = null;
      try {
        const recipientUser = await findAuthUserByEmail(admin, email);
        recipientUserId = recipientUser?.id ?? null;
      } catch {
        recipientUserId = null;
      }
      if (!recipientUserId) return;

      const { data, error } = await admin
        .from("kcals_state")
        .select("profile")
        .eq("user_id", recipientUserId)
        .maybeSingle();
      if (error && (error as { code?: string }).code !== "PGRST116") return;

      const profile = data?.profile && typeof data.profile === "object"
        ? (data.profile as Record<string, unknown>)
        : null;
      if (!profile) return;

      const mode = profile.mode === "photo" ? "photo" : "emoji";
      const emoji = typeof profile.emoji === "string" ? profile.emoji : undefined;
      const photo = typeof profile.photo === "string" ? profile.photo : null;

      recipients[email] = {
        mode,
        ...(emoji ? { emoji } : {}),
        ...(photo ? { photo } : { photo: null }),
      };
    })
  );

  return NextResponse.json({ recipients });
}

