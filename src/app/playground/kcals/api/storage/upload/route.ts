import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const IMAGE_BUCKET = "kcals-images";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Server is missing Supabase config." }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!accessToken) {
    return NextResponse.json({ error: "Missing auth token." }, { status: 401 });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await admin.auth.getUser(accessToken);
  if (userError || !userData?.user) {
    return NextResponse.json({ error: "Invalid auth token." }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const path = formData.get("path");
  const file = formData.get("file");
  const contentType = formData.get("contentType");

  if (typeof path !== "string") {
    return NextResponse.json({ error: "Missing path." }, { status: 400 });
  }
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "Missing file." }, { status: 400 });
  }

  const userId = userData.user.id;
  if (!path.startsWith(`${userId}/`)) {
    return NextResponse.json({ error: "Path must start with user id." }, { status: 403 });
  }

  const { error: uploadError } = await admin.storage.from(IMAGE_BUCKET).upload(path, file, {
    upsert: true,
    contentType: typeof contentType === "string" ? contentType : undefined,
  });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 403 });
  }

  const { data } = admin.storage.from(IMAGE_BUCKET).getPublicUrl(path);
  return NextResponse.json({ publicUrl: data.publicUrl });
}
