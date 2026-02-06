export interface FoodItem {
  id: string;
  emoji: string;
  name: string;
  kcal: number | null;
  loading?: boolean;
  items?: FoodItem[]; // present = this is a group
  portionPercent?: number; // group-only: portion of total calories applied
  imageId?: string;
  image?: string; // legacy base64 data URL or remote URL for custom food avatars
  source?: "usda" | "manual";
  sourceName?: string; // USDA food description or entered name
  kcalPer100g?: number;
  gramsPerUnit?: number; // USDA "medium" portion weight for count-based input
}

export function isGroup(item: FoodItem): boolean {
  return Array.isArray(item.items) && item.items.length > 0;
}

export function groupKcalRaw(item: FoodItem): number {
  if (!item.items) return item.kcal ?? 0;
  return item.items.reduce((sum, i) => sum + (i.kcal ?? 0), 0);
}

export function groupKcal(item: FoodItem): number {
  const raw = groupKcalRaw(item);
  if (!item.items) return raw;
  const percent = item.portionPercent ?? 100;
  return Math.round((raw * percent) / 100);
}

export interface CustomFood {
  id: string;
  name: string;
  kcalPer100g: number;
  imageId?: string;
  image?: string; // legacy base64 data URL or remote URL
}

export interface RecentFood {
  name: string;
  emoji: string;
  count: number;
  kcalPer100g: number;
  gramsPerUnit?: number;
}

const FOOD_LIST_KEY = "kcals-food-list";
const CUSTOM_KEY = "kcals-custom-foods";
const RECENT_KEY = "kcals-recent-foods";

const IMAGE_DB = "kcals-image-db";
const IMAGE_STORE = "custom-food-images";

let imageDbPromise: Promise<IDBDatabase | null> | null = null;

function getImageDb(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || !("indexedDB" in window)) return Promise.resolve(null);
  if (imageDbPromise) return imageDbPromise;
  imageDbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(IMAGE_DB, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IMAGE_STORE)) {
        db.createObjectStore(IMAGE_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return imageDbPromise;
}

const FOOD_DATE_KEY = "kcals-food-date";

export function loadFoodList(): FoodItem[] {
  if (typeof window === "undefined") return [];
  try {
    const today = new Date().toISOString().slice(0, 10);
    const storedDate = localStorage.getItem(FOOD_DATE_KEY);
    if (storedDate !== today) {
      // New day — clear food list
      localStorage.removeItem(FOOD_LIST_KEY);
      localStorage.setItem(FOOD_DATE_KEY, today);
      return [];
    }
    const stored = localStorage.getItem(FOOD_LIST_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveFoodList(foods: FoodItem[]): void {
  const shouldStoreImage = (image?: string) => !!image && !image.startsWith("data:");
  const sanitize = (item: FoodItem): FoodItem => {
    const { image, ...rest } = item;
    const next: FoodItem = {
      ...rest,
      items: item.items ? item.items.map(sanitize) : undefined,
    };
    if (shouldStoreImage(image)) {
      next.image = image;
    }
    return next;
  };
  localStorage.setItem(FOOD_LIST_KEY, JSON.stringify(foods.map(sanitize)));
  localStorage.setItem(FOOD_DATE_KEY, new Date().toISOString().slice(0, 10));
}

export function loadCustomFoods(): CustomFood[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveCustomFoods(foods: CustomFood[]): void {
  const shouldStoreImage = (image?: string) => !!image && !image.startsWith("data:");
  const sanitized = foods.map(({ image, ...rest }) => {
    const next: CustomFood = { ...rest };
    if (shouldStoreImage(image)) {
      next.image = image;
    }
    return next;
  });
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(sanitized));
}

export function loadRecentFoods(): RecentFood[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
}

export function trackRecentFood(name: string, emoji: string, kcalPer100g: number, gramsPerUnit?: number): void {
  const recent = loadRecentFoods();
  const existing = recent.find((f) => f.name.toLowerCase() === name.toLowerCase());
  if (existing) {
    existing.count++;
    existing.kcalPer100g = kcalPer100g;
    if (gramsPerUnit != null) existing.gramsPerUnit = gramsPerUnit;
  } else {
    recent.push({ name, emoji, count: 1, kcalPer100g, ...(gramsPerUnit != null ? { gramsPerUnit } : {}) });
  }
  recent.sort((a, b) => b.count - a.count);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, 10)));
}

export function removeRecentFood(name: string): void {
  const recent = loadRecentFoods();
  const filtered = recent.filter((f) => f.name.toLowerCase() !== name.toLowerCase());
  localStorage.setItem(RECENT_KEY, JSON.stringify(filtered));
}

export function findCachedFood(query: string): RecentFood | undefined {
  const recent = loadRecentFoods();
  const q = query.toLowerCase().trim();
  return recent.find((f) => f.name.toLowerCase() === q);
}

export async function saveCustomFoodImage(id: string, blob: Blob): Promise<void> {
  const db = await getImageDb();
  if (!db) return;
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IMAGE_STORE, "readwrite");
    tx.objectStore(IMAGE_STORE).put(blob, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadCustomFoodImage(id: string): Promise<Blob | null> {
  const db = await getImageDb();
  if (!db) return null;
  return await new Promise((resolve, reject) => {
    const tx = db.transaction(IMAGE_STORE, "readonly");
    const request = tx.objectStore(IMAGE_STORE).get(id);
    request.onsuccess = () => resolve((request.result as Blob) || null);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteCustomFoodImage(id: string): Promise<void> {
  const db = await getImageDb();
  if (!db) return;
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IMAGE_STORE, "readwrite");
    tx.objectStore(IMAGE_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/* ===========================
   Daily Log (streak & weekly burn)
   =========================== */

const DAILY_LOG_KEY = "kcals-daily-log";
const DAY_START_HOUR_KEY = "kcals-day-start-hour";

export interface DailyEntry {
  remaining: number;
  logged: boolean;
  goal?: number;
}

export function formatDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function clampHour(hour: number): number {
  if (Number.isNaN(hour)) return 0;
  return Math.min(23, Math.max(0, Math.round(hour)));
}

export function getDayStartHour(): number {
  if (typeof window === "undefined") return 0;
  const raw = localStorage.getItem(DAY_START_HOUR_KEY);
  if (!raw) return 0;
  return clampHour(Number(raw));
}

export function setDayStartHour(hour: number): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DAY_START_HOUR_KEY, String(clampHour(hour)));
}

function getEffectiveDate(date: Date, startHour = getDayStartHour()): Date {
  const d = new Date(date);
  if (d.getHours() < startHour) {
    d.setDate(d.getDate() - 1);
  }
  return d;
}

export function getDayKey(date: Date): string {
  return formatDateKey(getEffectiveDate(date));
}

export function getDisplayDate(date: Date): Date {
  return getEffectiveDate(date);
}

function loadDailyLog(): Record<string, DailyEntry> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(DAILY_LOG_KEY) || "{}");
  } catch {
    return {};
  }
}

export function loadDailyLogRaw(): Record<string, DailyEntry> {
  return loadDailyLog();
}

export function saveDailyLogRaw(data: Record<string, DailyEntry>): void {
  localStorage.setItem(DAILY_LOG_KEY, JSON.stringify(data));
}

export function saveDailyEntry(remaining: number, logged: boolean, goal: number): void {
  const log = loadDailyLog();
  const normalizedGoal = Number.isFinite(goal) && goal > 0 ? Math.round(goal) : undefined;
  log[getDayKey(new Date())] = {
    remaining,
    logged,
    ...(normalizedGoal != null ? { goal: normalizedGoal } : {}),
  };
  // Keep only last 30 days
  const keys = Object.keys(log).sort();
  if (keys.length > 30) {
    for (const k of keys.slice(0, keys.length - 30)) {
      delete log[k];
    }
  }
  localStorage.setItem(DAILY_LOG_KEY, JSON.stringify(log));
}

export function getStreak(): number {
  const log = loadDailyLog();
  let streak = 0;
  const d = new Date();

  // If today has no entry yet, start from yesterday
  if (!log[getDayKey(d)]?.logged) {
    d.setDate(d.getDate() - 1);
  }

  while (true) {
    const entry = log[getDayKey(d)];
    if (entry?.logged) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

export function getWeeklyRemaining(): number {
  const log = loadDailyLog();
  let total = 0;
  const d = new Date();
  for (let i = 0; i < 7; i++) {
    const entry = log[getDayKey(d)];
    if (entry) total += entry.remaining;
    d.setDate(d.getDate() - 1);
  }
  return total;
}

export interface WeeklyEntry {
  dateKey: string;
  remaining: number;
  goal?: number;
}

export function getWeeklyBreakdown(): WeeklyEntry[] {
  const log = loadDailyLog();
  const entries: WeeklyEntry[] = [];
  const d = new Date();
  for (let i = 0; i < 7; i++) {
    const dateKey = getDayKey(d);
    const entry = log[dateKey];
    if (entry?.logged) {
      entries.push({ dateKey, remaining: entry.remaining, ...(entry.goal != null ? { goal: entry.goal } : {}) });
    }
    d.setDate(d.getDate() - 1);
  }
  return entries.reverse(); // oldest first
}
