import { NextRequest, NextResponse } from "next/server";

const USDA_API_KEY = process.env.USDA_API_KEY || "DEMO_KEY";
const USDA_URL = "https://api.nal.usda.gov/fdc/v1/foods/search";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("query");

  if (!query) {
    return NextResponse.json({ foods: [] });
  }

  const url = `${USDA_URL}?api_key=${USDA_API_KEY}&query=${encodeURIComponent(query)}&pageSize=10`;
  const res = await fetch(url);

  if (!res.ok) {
    return NextResponse.json({ foods: [] }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json(data);
}
