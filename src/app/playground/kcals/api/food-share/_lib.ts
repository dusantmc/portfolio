import { NextResponse } from "next/server";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

export interface SharedFoodPayload {
  name: string;
  emoji: string;
  kcalPer100g: number;
  gramsPerUnit?: number;
  image?: string | null;
}

export interface IncomingFoodShare {
  id: string;
  fromUserId: string;
  fromEmail: string;
  createdAt: string;
  item: SharedFoodPayload;
}

export interface KcalsProfile {
  [key: string]: unknown;
  incoming_shares?: unknown;
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function getProfileObject(raw: unknown): KcalsProfile {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as KcalsProfile;
}

export function normalizeShareItem(raw: unknown): SharedFoodPayload | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const object = raw as Record<string, unknown>;
  const name = typeof object.name === "string" ? object.name.trim() : "";
  const emoji = typeof object.emoji === "string" ? object.emoji : "";
  const kcalPer100g = Number(object.kcalPer100g);
  if (!name || !emoji || !Number.isFinite(kcalPer100g) || kcalPer100g <= 0) return null;
  const gramsPerUnit = Number(object.gramsPerUnit);
  const image = typeof object.image === "string" ? object.image : null;
  return {
    name,
    emoji,
    kcalPer100g: Math.round(kcalPer100g),
    ...(Number.isFinite(gramsPerUnit) && gramsPerUnit > 0 ? { gramsPerUnit: Math.round(gramsPerUnit) } : {}),
    ...(image ? { image } : {}),
  };
}

export function readIncomingShares(profile: unknown): IncomingFoodShare[] {
  const profileObject = getProfileObject(profile);
  const raw = profileObject.incoming_shares;
  if (!Array.isArray(raw)) return [];
  const shares: IncomingFoodShare[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const object = entry as Record<string, unknown>;
    const id = typeof object.id === "string" ? object.id : "";
    const fromUserId = typeof object.fromUserId === "string" ? object.fromUserId : "";
    const fromEmail = typeof object.fromEmail === "string" ? object.fromEmail : "";
    const createdAt = typeof object.createdAt === "string" ? object.createdAt : new Date().toISOString();
    const item = normalizeShareItem(object.item);
    if (!id || !fromEmail || !item) continue;
    shares.push({
      id,
      fromUserId,
      fromEmail: normalizeEmail(fromEmail),
      createdAt,
      item,
    });
  }
  return shares;
}

export function writeIncomingShares(profile: unknown, shares: IncomingFoodShare[]): KcalsProfile {
  const profileObject = getProfileObject(profile);
  return {
    ...profileObject,
    incoming_shares: shares.slice(0, 100),
  };
}

export function createAdminClientOrError():
  | { admin: SupabaseClient; response: null }
  | { admin: null; response: NextResponse } {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return {
      admin: null,
      response: NextResponse.json({ error: "Server is missing Supabase config." }, { status: 500 }),
    };
  }
  return {
    admin: createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
    response: null,
  };
}

export async function authenticateRequest(
  req: Request,
  admin: SupabaseClient
): Promise<{ user: User; response: null } | { user: null; response: NextResponse }> {
  const authHeader = req.headers.get("authorization") ?? "";
  const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!accessToken) {
    return { user: null, response: NextResponse.json({ error: "Missing auth token." }, { status: 401 }) };
  }
  const { data, error } = await admin.auth.getUser(accessToken);
  if (error || !data.user) {
    return { user: null, response: NextResponse.json({ error: "Invalid auth token." }, { status: 401 }) };
  }
  return { user: data.user, response: null };
}

export async function findAuthUserByEmail(admin: SupabaseClient, email: string): Promise<User | null> {
  let page = 1;
  const perPage = 200;
  const target = normalizeEmail(email);
  for (let i = 0; i < 50; i++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(error.message);
    const found = data.users.find((user) => normalizeEmail(user.email || "") === target);
    if (found) return found;
    if (!data.nextPage || data.users.length === 0) break;
    page = data.nextPage;
  }
  return null;
}
