const PROXY_URL = "/playground/kcals/api/usda";

/* ===========================
   Input Parser
   =========================== */

export function parseFoodInput(text: string): { name: string; grams: number } {
  const trimmed = text.trim();

  // Match patterns like "Bananas 250g", "Chicken 200 grams", "Rice 1.5kg"
  const match = trimmed.match(/^(.+?)\s+(\d+(?:\.\d+)?)\s*(kg|g|grams?)?\s*$/i);

  if (match) {
    const name = match[1].trim();
    let grams = parseFloat(match[2]);
    const unit = (match[3] || "g").toLowerCase();

    if (unit === "kg") {
      grams *= 1000;
    }

    return { name, grams };
  }

  // No quantity found — treat entire input as food name, default 100g
  return { name: trimmed, grams: 100 };
}

/* ===========================
   USDA API
   =========================== */

interface USDANutrient {
  nutrientId: number;
  nutrientName: string;
  nutrientNumber: string;
  value: number;
  unitName: string;
}

interface USDAFood {
  description: string;
  foodNutrients: USDANutrient[];
}

interface USDAResponse {
  foods: USDAFood[];
}

const COOKED_KEYWORDS = /\b(dehydrated|dried|cooked|fried|baked|roasted|grilled|boiled|canned|frozen|powder|concentrate|pickled|smoked|braised|sauteed|steamed)\b/i;

function singularize(word: string): string {
  const lower = word.toLowerCase();
  if (lower.endsWith("ies")) return word.slice(0, -3) + "y";
  if (lower.endsWith("oes")) return word.slice(0, -2);
  if (/(?:ch|sh|x|z|s)es$/i.test(word)) return word.slice(0, -2);
  if (lower.endsWith("s") && !lower.endsWith("ss")) return word.slice(0, -1);
  return word;
}

function getEnergy(food: USDAFood): number | null {
  const energy = food.foodNutrients.find((n) => n.nutrientId === 1008);
  return energy?.value ?? null;
}

async function fetchFoods(query: string): Promise<USDAFood[] | null> {
  const url = `${PROXY_URL}?query=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`[USDA] ${res.status} for "${query}"`);
    return null;
  }
  const data: USDAResponse = await res.json();
  if (!data.foods || data.foods.length === 0) {
    console.warn(`[USDA] No results for "${query}"`);
    return null;
  }
  return data.foods;
}

function pickKcal(foods: USDAFood[]): number | null {
  const hasKcal = (f: USDAFood) => {
    const v = getEnergy(f);
    return v != null && v > 0;
  };

  // Prefer raw/fresh: find first result with "raw" in description
  const rawMatch = foods.find(
    (f) => /\braw\b/i.test(f.description) && hasKcal(f)
  );
  if (rawMatch) return getEnergy(rawMatch);

  // Next: prefer results without cooked/processed keywords
  const freshMatch = foods.find(
    (f) => !COOKED_KEYWORDS.test(f.description) && hasKcal(f)
  );
  if (freshMatch) return getEnergy(freshMatch);

  // Fallback: first result with energy data
  for (const food of foods) {
    if (hasKcal(food)) return getEnergy(food);
  }

  return null;
}

export async function fetchKcalPer100g(foodName: string): Promise<number | null> {
  const normalized = singularize(foodName);
  const isCooked = COOKED_KEYWORDS.test(normalized);

  try {
    if (!isCooked) {
      const rawFoods = await fetchFoods(`${normalized} raw`);
      if (rawFoods) {
        const kcal = pickKcal(rawFoods);
        if (kcal != null) return kcal;
      }
    }

    const fallbackFoods = await fetchFoods(normalized);
    if (fallbackFoods) {
      const kcal = pickKcal(fallbackFoods);
      if (kcal != null) return kcal;
    }

    return null;
  } catch {
    return null;
  }
}

/* ===========================
   Emoji Mapper
   =========================== */

const EMOJI_MAP: [string[], string][] = [
  [["banana"], "\u{1F34C}"],
  [["chicken"], "\u{1F357}"],
  [["apple"], "\u{1F34E}"],
  [["rice"], "\u{1F35A}"],
  [["egg"], "\u{1F95A}"],
  [["salad"], "\u{1F957}"],
  [["pizza"], "\u{1F355}"],
  [["bread", "toast"], "\u{1F35E}"],
  [["fish", "salmon", "tuna"], "\u{1F41F}"],
  [["milk"], "\u{1F95B}"],
  [["cheese"], "\u{1F9C0}"],
  [["pasta", "spaghetti", "noodle"], "\u{1F35D}"],
  [["steak", "beef"], "\u{1F969}"],
  [["pork", "ham", "bacon"], "\u{1F356}"],
  [["orange"], "\u{1F34A}"],
  [["grape"], "\u{1F347}"],
  [["strawberry"], "\u{1F353}"],
  [["avocado"], "\u{1F951}"],
  [["potato"], "\u{1F954}"],
  [["carrot"], "\u{1F955}"],
  [["broccoli"], "\u{1F966}"],
  [["tomato"], "\u{1F345}"],
  [["pineapple"], "\u{1F34D}"],
  [["watermelon", "melon"], "\u{1F349}"],
  [["peach"], "\u{1F351}"],
  [["lemon"], "\u{1F34B}"],
  [["cherry"], "\u{1F352}"],
  [["corn"], "\u{1F33D}"],
  [["mushroom"], "\u{1F344}"],
  [["shrimp", "prawn"], "\u{1F990}"],
  [["burger", "hamburger"], "\u{1F354}"],
  [["sandwich"], "\u{1F96A}"],
  [["taco"], "\u{1F32E}"],
  [["burrito", "wrap"], "\u{1F32F}"],
  [["cookie", "biscuit"], "\u{1F36A}"],
  [["cake"], "\u{1F370}"],
  [["chocolate"], "\u{1F36B}"],
  [["ice cream"], "\u{1F368}"],
  [["donut", "doughnut"], "\u{1F369}"],
  [["coffee"], "\u2615"],
  [["tea"], "\u{1F375}"],
  [["beer"], "\u{1F37A}"],
  [["wine"], "\u{1F377}"],
  [["water"], "\u{1F4A7}"],
  [["juice"], "\u{1F9C3}"],
  [["yogurt", "yoghurt"], "\u{1F95B}"],
  [["honey"], "\u{1F36F}"],
  [["peanut", "nut", "almond"], "\u{1F95C}"],
  [["coconut"], "\u{1F965}"],
  [["mango"], "\u{1F96D}"],
  [["pepper", "chili"], "\u{1F336}\uFE0F"],
  [["onion"], "\u{1F9C5}"],
  [["garlic"], "\u{1F9C4}"],
  [["butter"], "\u{1F9C8}"],
  [["croissant"], "\u{1F950}"],
  [["pretzel"], "\u{1F968}"],
  [["pancake", "waffle"], "\u{1F95E}"],
  [["cereal", "oat"], "\u{1F963}"],
  [["soup"], "\u{1F958}"],
  [["sushi"], "\u{1F363}"],
];

export function getFoodEmoji(foodName: string): string {
  const lower = singularize(foodName).toLowerCase();
  for (const [keywords, emoji] of EMOJI_MAP) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return emoji;
    }
  }
  return "\u{1F37D}\uFE0F"; // 🍽️ default
}
