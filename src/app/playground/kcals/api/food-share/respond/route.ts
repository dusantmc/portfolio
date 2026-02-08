import { NextResponse } from "next/server";
import {
  authenticateRequest,
  createAdminClientOrError,
  readIncomingShares,
  writeIncomingShares,
  type SharedFoodPayload,
} from "../_lib";

interface CustomFoodRow {
  id: string;
  name: string;
  kcalPer100g: number;
  imageId?: string;
  image?: string;
}

function normalizeCustomFoods(raw: unknown): CustomFoodRow[] {
  if (!Array.isArray(raw)) return [];
  const foods: CustomFoodRow[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const object = entry as Record<string, unknown>;
    const id = typeof object.id === "string" ? object.id : crypto.randomUUID();
    const name = typeof object.name === "string" ? object.name.trim() : "";
    const kcalPer100g = Number(object.kcalPer100g);
    if (!name || !Number.isFinite(kcalPer100g) || kcalPer100g <= 0) continue;
    const imageId = typeof object.imageId === "string" ? object.imageId : undefined;
    const image = typeof object.image === "string" ? object.image : undefined;
    foods.push({
      id,
      name,
      kcalPer100g: Math.round(kcalPer100g),
      ...(imageId ? { imageId } : {}),
      ...(image ? { image } : {}),
    });
  }
  return foods;
}

function applyAcceptedShareToCustomFoods(customFoods: CustomFoodRow[], item: SharedFoodPayload): CustomFoodRow[] {
  const normalizedName = item.name.trim().toLowerCase();
  if (!normalizedName) return customFoods;
  const index = customFoods.findIndex((food) => food.name.trim().toLowerCase() === normalizedName);
  if (index >= 0) {
    const current = customFoods[index];
    const updated: CustomFoodRow = {
      ...current,
      name: item.name.trim(),
      kcalPer100g: Math.round(item.kcalPer100g),
      ...(item.image ? { image: item.image } : {}),
    };
    const next = [...customFoods];
    next[index] = updated;
    return next;
  }
  return [
    {
      id: crypto.randomUUID(),
      name: item.name.trim(),
      kcalPer100g: Math.round(item.kcalPer100g),
      ...(item.image ? { image: item.image } : {}),
    },
    ...customFoods,
  ];
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

  const shareId = body && typeof body === "object" ? (body as Record<string, unknown>).shareId : null;
  const action = body && typeof body === "object" ? (body as Record<string, unknown>).action : null;
  if (typeof shareId !== "string" || !shareId) {
    return NextResponse.json({ error: "Missing share id." }, { status: 400 });
  }
  if (action !== "accept" && action !== "deny") {
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  }

  const { data: state, error: stateError } = await admin
    .from("kcals_state")
    .select("profile, custom_foods")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (stateError && (stateError as { code?: string }).code !== "PGRST116") {
    return NextResponse.json({ error: stateError.message }, { status: 500 });
  }
  if (!state) {
    return NextResponse.json({ error: "No received shares found." }, { status: 404 });
  }

  const incoming = readIncomingShares(state.profile);
  const target = incoming.find((entry) => entry.id === shareId);
  if (!target) {
    return NextResponse.json({ error: "Shared item not found." }, { status: 404 });
  }
  const nextIncoming = incoming.filter((entry) => entry.id !== shareId);
  const nextProfile = writeIncomingShares(state.profile, nextIncoming);

  let nextCustomFoods = normalizeCustomFoods(state.custom_foods);
  if (action === "accept") {
    nextCustomFoods = applyAcceptedShareToCustomFoods(nextCustomFoods, target.item);
  }

  const { error: updateError } = await admin
    .from("kcals_state")
    .update({
      profile: nextProfile,
      custom_foods: nextCustomFoods,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", auth.user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ items: nextIncoming, customFoods: nextCustomFoods });
}

