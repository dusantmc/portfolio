"use client";

import { useState, useEffect, useRef, useCallback, type ChangeEvent, type PointerEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { SmokeRing } from "@paper-design/shaders-react";
import {
  type DailyEntry,
  type FoodItem,
  type CustomFood,
  type RecentFood,
  type WeeklyEntry,
  isGroup,
  groupKcal,
  groupKcalRaw,
  loadFoodList,
  saveFoodList,
  loadCustomFoods,
  saveCustomFoods,
  loadRecentFoods,
  trackRecentFood,
  removeRecentFood,
  findCachedFood,
  saveCustomFoodImage,
  loadCustomFoodImage,
  deleteCustomFoodImage,
  saveDailyEntry,
  loadDailyLogRaw,
  saveDailyLogRaw,
  getDayKey,
  getDayStartHour,
  setDayStartHour,
  getDisplayDate,
  getStreak,
  getWeeklyBreakdown,
} from "./data/storage";
import { parseFoodInput, fetchKcalPer100g, getFoodEmoji, resolveEmbeddedFood, resolveFoodAlias } from "./data/usda";
import { BottomSheet } from "./BottomSheet";
import { supabase, supabaseAnonKey, supabaseUrl } from "./data/supabase";

const DEFAULT_CALORIE_GOAL = 1600;
const LAST_DAY_KEY = "kcals_last_day_key";

function formatCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1000) {
    const k = n / 1000;
    const rounded = Math.round(k * 10) / 10;
    return `${rounded}K`;
  }
  return n.toString();
}

function formatRelativeTime(iso: string | null): string {
  if (!iso) return "never";
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return "never";
  const diffMs = Date.now() - ts;
  if (diffMs <= 0) return "just now";
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diffMs < minute) return "just now";
  if (diffMs < hour) return `${Math.floor(diffMs / minute)}m ago`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)}h ago`;
  return `${Math.floor(diffMs / day)}d ago`;
}

function normalizeDailyLog(raw: unknown): Record<string, DailyEntry> {
  if (!raw || typeof raw !== "object") return {};
  const entries: Record<string, DailyEntry> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== "object") continue;
    const remaining = Number((value as { remaining?: unknown }).remaining);
    const logged = (value as { logged?: unknown }).logged;
    if (!Number.isFinite(remaining) || typeof logged !== "boolean") continue;
    entries[key] = { remaining, logged };
  }
  return entries;
}

function mergeDailyLogs(
  localLog: unknown,
  remoteLog: unknown
): Record<string, DailyEntry> {
  const remote = normalizeDailyLog(remoteLog);
  const local = normalizeDailyLog(localLog);
  // Keep remote history, but local wins for conflicting dates.
  return { ...remote, ...local };
}

const SWIPE_THRESHOLD = 48;
const LONG_PRESS_MS = 1000;
const MODAL_ANIM_MS = 250;
const DRAG_MOVE_CANCEL = 10;
const DROP_OVERLAP = 0.3;
const SYNC_KEY = "kcals_last_sync";
const CALORIE_GOAL_KEY = "kcals_calorie_goal";
const AUTO_SYNC_KEY = "kcals_auto_sync_enabled";
const AUTO_SYNC_DATE_KEY = "kcals_auto_sync_date";
const AVATAR_MODE_KEY = "kcals_avatar_mode";
const AVATAR_EMOJI_KEY = "kcals_avatar_emoji";
const AVATAR_PHOTO_KEY = "kcals_avatar_photo";
const IMAGE_BUCKET = "kcals-images";
const IMAGE_FOLDER = "custom-foods";
const AVATAR_FOLDER = "avatars";
const EMPTY_STATE_VARIANT_KEY = "kcals_empty_state_variant";
const EMPTY_STATE_QUICK_CHIPS = [
  { label: "Eggs", emoji: "\u{1F95A}" },
  { label: "Chia Seeds", emoji: "\u{1F331}" },
  { label: "Oats", emoji: "\u{1F963}" },
  { label: "Smoked salmon", emoji: "\u{1F363}" },
  { label: "Avocado", emoji: "\u{1F951}" },
] as const;
const EMPTY_STATE_VARIANTS = [
  {
    emoji: "\u{1F4AA}",
    title: "Start your day with protein",
    text: "Type what you ate or select a food from your list",
  },
  {
    emoji: "\u2615",
    title: "No food logged yet",
    text: "Start typing or select a food from your list",
  },
  {
    emoji: "\u{1F324}\uFE0F",
    title: "Small start, big win",
    text: "Add one food to kick things off",
  },
  {
    emoji: "\u2728",
    title: "Start your day with protein",
    text: "Start typing or select a food from your list",
  },
  {
    emoji: "\u{1F37D}\uFE0F",
    title: "Your plate is empty",
    text: "Add your first meal to get started",
  },
  {
    emoji: "\u{1F3C3}",
    title: "Small start, big win",
    text: "Start typing or select a food from your list",
  },
] as const;

/* ===========================
   SVG Icons
   =========================== */

function MicIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  );
}

function ArrowUpIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" x2="12" y1="19" y2="5" />
      <polyline points="5 12 12 5 19 12" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      <path fillRule="evenodd" clipRule="evenodd" d="M13.75 21.6667C13.75 20.0091 14.4085 18.4193 15.5806 17.2472C16.7527 16.0751 18.3424 15.4167 20 15.4167C21.6576 15.4167 23.2473 16.0751 24.4194 17.2472C25.5915 18.4193 26.25 20.0091 26.25 21.6667C26.25 23.3243 25.5915 24.914 24.4194 26.0861C23.2473 27.2582 21.6576 27.9167 20 27.9167C18.3424 27.9167 16.7527 27.2582 15.5806 26.0861C14.4085 24.914 13.75 23.3243 13.75 21.6667ZM20 17.9167C19.0054 17.9167 18.0516 18.3117 17.3483 19.015C16.6451 19.7183 16.25 20.6721 16.25 21.6667C16.25 22.6612 16.6451 23.615 17.3483 24.3183C18.0516 25.0216 19.0054 25.4167 20 25.4167C20.9946 25.4167 21.9484 25.0216 22.6516 24.3183C23.3549 23.615 23.75 22.6612 23.75 21.6667C23.75 20.6721 23.3549 19.7183 22.6516 19.015C21.9484 18.3117 20.9946 17.9167 20 17.9167Z" fill="#676663"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M17.6932 9.58333C17.2789 9.58289 16.8687 9.66415 16.4859 9.82247C16.1031 9.98078 15.7554 10.213 15.4624 10.5059C15.1695 10.7988 14.9373 11.1466 14.779 11.5294C14.6207 11.9122 14.5394 12.3224 14.5398 12.7367C14.5395 13.272 14.338 13.7876 13.9753 14.1812C13.6125 14.5749 13.115 14.8177 12.5815 14.8617L8.86484 15.1617C8.50941 15.1903 8.17326 15.335 7.90822 15.5736C7.64317 15.8121 7.46395 16.1312 7.39817 16.4817C6.65021 20.4315 6.59494 24.4813 7.23484 28.45L7.3965 29.4567C7.54984 30.4067 8.3315 31.1317 9.2915 31.21L12.5298 31.4733C17.5017 31.8769 22.498 31.8769 27.4698 31.4733L30.7065 31.21C31.1733 31.1723 31.6139 30.979 31.9578 30.6611C32.3017 30.3432 32.5289 29.9191 32.6032 29.4567L32.7648 28.45C33.4042 24.4812 33.3484 20.4314 32.5998 16.4817C32.5337 16.1315 32.3544 15.8128 32.0893 15.5746C31.8243 15.3364 31.4884 15.1919 31.1332 15.1633L27.4182 14.8617C26.8847 14.8177 26.3872 14.5749 26.0244 14.1812C25.6616 13.7876 25.4601 13.272 25.4598 12.7367C25.4603 12.3224 25.379 11.9122 25.2207 11.5294C25.0624 11.1466 24.8301 10.7988 24.5372 10.5059C24.2443 10.213 23.8965 9.98078 23.5138 9.82247C23.131 9.66415 22.7207 9.58289 22.3065 9.58333H17.6932ZM12.0498 12.3967C12.1369 10.9589 12.7693 9.60848 13.818 8.62107C14.8667 7.63366 16.2527 7.08367 17.6932 7.08333H22.3065C25.3148 7.08333 27.7732 9.43333 27.9498 12.3967L31.3365 12.6717C32.2375 12.7444 33.0896 13.1112 33.7617 13.7155C34.4339 14.3199 34.8888 15.1284 35.0565 16.0167C35.8582 20.25 35.9182 24.5917 35.2332 28.8467L35.0715 29.855C34.9082 30.8693 34.4094 31.7996 33.6549 32.497C32.9004 33.1943 31.9339 33.6185 30.9098 33.7017L27.6732 33.965C22.566 34.3789 17.4337 34.3789 12.3265 33.965L9.08984 33.7017C8.0658 33.6185 7.09924 33.1943 6.34477 32.497C5.59029 31.7996 5.0915 30.8693 4.92817 29.855L4.7665 28.8467C4.08114 24.5921 4.14092 20.2507 4.94317 16.0167C5.11113 15.1286 5.56612 14.3202 6.23821 13.7159C6.9103 13.1115 7.76228 12.7447 8.66317 12.6717L12.0498 12.3967Z" fill="#676663"/>
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round">
      <path d="M12 7V17" strokeWidth="2.5" />
      <path d="M7 12L17 12" strokeWidth="2.5" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  );
}

function DeleteItemIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M5 7H19" />
      <path d="M10 4H14" />
      <path d="M6.5 7L7.42638 18.5797C7.46796 19.0994 7.90183 19.5 8.42319 19.5L15.5409 19.5C16.0623 19.5 16.4961 19.0994 16.5377 18.5797L17.4641 7" />
    </svg>
  );
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

async function downscaleImage(file: File, maxSize = 512, quality = 0.82): Promise<Blob> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImageElement(objectUrl);
    const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");
    ctx.drawImage(img, 0, 0, width, height);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Failed to encode image"))),
        "image/jpeg",
        quality
      );
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, data] = dataUrl.split(",");
  const isBase64 = meta.includes(";base64");
  const contentType = meta.split(":")[1]?.split(";")[0] || "image/jpeg";
  if (isBase64) {
    const binary = atob(data);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
    return new Blob([array], { type: contentType });
  }
  return new Blob([decodeURIComponent(data)], { type: contentType });
}

function isDataUrl(value?: string | null): boolean {
  return !!value && value.startsWith("data:");
}

function getLastGrapheme(value: string): string {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    const segments = Array.from(segmenter.segment(value));
    return segments.length ? segments[segments.length - 1].segment : "";
  }
  const chars = Array.from(value);
  return chars.length ? chars[chars.length - 1] : "";
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read image"));
    reader.readAsDataURL(blob);
  });
}

/* ===========================
   Main Component
   =========================== */

export default function KcalsPage() {
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [emptyStateVariantIndex, setEmptyStateVariantIndex] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [inputFocused, setInputFocused] = useState(false);
  const [customFoods, setCustomFoods] = useState<CustomFood[]>([]);
  const [recentFoods, setRecentFoods] = useState<RecentFood[]>([]);
  const [selectedRecentFood, setSelectedRecentFood] = useState<RecentFood | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [avatarMode, setAvatarMode] = useState<"emoji" | "photo">("emoji");
  const [avatarEmoji, setAvatarEmoji] = useState("");
  const [avatarPhoto, setAvatarPhoto] = useState<string | null>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authStatus, setAuthStatus] = useState<"idle" | "sending" | "sent" | "verifying" | "error">("idle");
  const [authStep, setAuthStep] = useState<"email" | "code">("email");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authOtp, setAuthOtp] = useState("");
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "error" | "ok">("idle");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [calorieGoal, setCalorieGoal] = useState(DEFAULT_CALORIE_GOAL);
  const [calorieGoalInput, setCalorieGoalInput] = useState(DEFAULT_CALORIE_GOAL.toString());
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [dayStartHour, setDayStartHourState] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingFood, setEditingFood] = useState<CustomFood | null>(null);
  const [modalName, setModalName] = useState("");
  const [modalKcal, setModalKcal] = useState("");
  const [modalImageUrl, setModalImageUrl] = useState<string | null>(null);
  const [modalImageBlob, setModalImageBlob] = useState<Blob | null>(null);
  const [selectedCustomFood, setSelectedCustomFood] = useState<CustomFood | null>(null);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarPhotoInputRef = useRef<HTMLInputElement>(null);
  const syncToSupabaseRef = useRef<((reason?: "manual" | "auto") => Promise<boolean>) | null>(null);
  const blurTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const pillLongPressRef = useRef<{
    timer: ReturnType<typeof setTimeout> | null;
    triggered: boolean;
    startX: number;
    startY: number;
  }>({
    timer: null,
    triggered: false,
    startX: 0,
    startY: 0,
  });
  const chipMenuAnchorRef = useRef<HTMLElement | null>(null);
  const suggestionsScrollRef = useRef<HTMLDivElement | null>(null);

  // Chip context menu state
  const [chipMenu, setChipMenu] = useState<{
    type: "custom" | "recent";
    customFood?: CustomFood;
    recentFood?: RecentFood;
    x: number;
    y: number;
  } | null>(null);

  const getChipMenuPosition = useCallback((target: HTMLElement) => {
    const rect = target.getBoundingClientRect();
    const contentRect = contentRef.current?.getBoundingClientRect();
    const containerLeft = contentRect?.left ?? 0;
    const containerTop = contentRect?.top ?? 0;
    const containerWidth = contentRect?.width ?? window.innerWidth;
    const menuWidth = 180;
    const left = rect.left - containerLeft + rect.width / 2 - menuWidth / 2;
    const maxLeft = Math.max(8, containerWidth - menuWidth - 8);
    const x = Math.min(Math.max(8, left), maxLeft);
    const y = rect.bottom - containerTop;
    return { x, y };
  }, []);

  const updateChipMenuPosition = useCallback(() => {
    const target = chipMenuAnchorRef.current;
    if (!target) return;
    const { x, y } = getChipMenuPosition(target);
    setChipMenu((prev) => {
      if (!prev) return prev;
      if (Math.abs(prev.x - x) < 0.5 && Math.abs(prev.y - y) < 0.5) return prev;
      return { ...prev, x, y };
    });
  }, [getChipMenuPosition]);

  // Swipe state
  const [swipedItemId, setSwipedItemId] = useState<string | null>(null);
  const swipeRef = useRef<{
    startX: number;
    startY: number;
    currentX: number;
    swiping: boolean;
    itemId: string;
  } | null>(null);

  // Edit food modal state
  const [editFoodModal, setEditFoodModal] = useState<FoodItem | null>(null);
  const [editFoodName, setEditFoodName] = useState("");
  const [editFoodGrams, setEditFoodGrams] = useState("");

  // Drag state
  const [dragItemId, setDragItemId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const dragRef = useRef<{
    itemId: string;
    ghost: HTMLDivElement | null;
    startX: number;
    startY: number;
    offsetX: number;
    offsetY: number;
    active: boolean;
    timer: ReturnType<typeof setTimeout> | null;
  } | null>(null);

  const [groupView, setGroupView] = useState<"list" | "portion">("list");
  const [portionTab, setPortionTab] = useState(0);
  const [portionValue, setPortionValue] = useState(100);
  const [portionCtaPressed, setPortionCtaPressed] = useState(false);
  const [portionTabPressed, setPortionTabPressed] = useState<number | null>(null);
  const portionHeroSources = [
    "/kcals/assets/plate-sprite.webp",
    "/kcals/assets/pot-sprite.webp",
    "/kcals/assets/bakeware-sprite.webp",
    "",
  ];
  const [portionHero, setPortionHero] = useState(portionHeroSources[0]);
  const [portionHeroPrev, setPortionHeroPrev] = useState<string | null>(null);
  const [portionHeroAnimating, setPortionHeroAnimating] = useState(false);
  const [portionHeroAnimKey, setPortionHeroAnimKey] = useState(0);
  const portionSliderRef = useRef<HTMLDivElement | null>(null);
  const portionDraggingRef = useRef(false);
  const portionRangeRef = useRef<HTMLInputElement | null>(null);
  const portionTooltipRef = useRef<HTMLDivElement | null>(null);
  const [portionTooltipX, setPortionTooltipX] = useState<number | null>(null);
  const portionSnapPoints = [10, 25, 33, 50, 80, 100];
  const PORTION_SNAP_THRESHOLD = 2;
  const itemRefsMap = useRef<Map<string, HTMLDivElement>>(new Map());

  // Group modal state
  const [groupModal, setGroupModal] = useState<FoodItem | null>(null);
  const [groupName, setGroupName] = useState("");
  const [isCompact, setIsCompact] = useState(false);
  const imageUrlsRef = useRef<Record<string, string>>({});
  const hasMigratedImagesRef = useRef(false);

  const profileInitial = user?.email?.trim()?.[0]?.toUpperCase() ?? "U";
  const avatarEmojiDisplay = avatarEmoji.trim() || profileInitial;
  const showAvatarPhoto = avatarMode === "photo" && !!avatarPhoto;
  const lastSyncRelative = formatRelativeTime(lastSyncAt);

  useEffect(() => {
    imageUrlsRef.current = imageUrls;
  }, [imageUrls]);

  useEffect(() => {
    return () => {
      Object.values(imageUrlsRef.current).forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    setFoods(loadFoodList());
    setCustomFoods(loadCustomFoods());
    setRecentFoods(loadRecentFoods());
    if (typeof window !== "undefined") {
      setLastSyncAt(localStorage.getItem(SYNC_KEY));
      const storedGoal = localStorage.getItem(CALORIE_GOAL_KEY);
      if (storedGoal) {
        const parsed = Number.parseInt(storedGoal, 10);
        if (!Number.isNaN(parsed) && parsed > 0) {
          setCalorieGoal(parsed);
          setCalorieGoalInput(parsed.toString());
        }
      }
      const autoSync = localStorage.getItem(AUTO_SYNC_KEY);
      setAutoSyncEnabled(autoSync === "true");
      const storedMode = localStorage.getItem(AVATAR_MODE_KEY);
      if (storedMode === "emoji" || storedMode === "photo") {
        setAvatarMode(storedMode);
      }
      const storedEmoji = localStorage.getItem(AVATAR_EMOJI_KEY);
      if (storedEmoji) {
        setAvatarEmoji(storedEmoji);
      }
      const storedPhoto = localStorage.getItem(AVATAR_PHOTO_KEY);
      if (storedPhoto) {
        setAvatarPhoto(storedPhoto);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(AVATAR_MODE_KEY, avatarMode);
  }, [avatarMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (avatarEmoji) {
      localStorage.setItem(AVATAR_EMOJI_KEY, avatarEmoji);
    } else {
      localStorage.removeItem(AVATAR_EMOJI_KEY);
    }
  }, [avatarEmoji]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (avatarPhoto) {
      localStorage.setItem(AVATAR_PHOTO_KEY, avatarPhoto);
    } else {
      localStorage.removeItem(AVATAR_PHOTO_KEY);
    }
  }, [avatarPhoto]);

  const setLastSync = useCallback((value: string) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(SYNC_KEY, value);
    setLastSyncAt(value);
  }, []);

  const decodeAuthToken = (token?: string | null) => {
    if (!token) return null;
    try {
      const payload = token.split(".")[1];
      if (!payload) return null;
      const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
      const json = JSON.parse(atob(normalized));
      return {
        role: typeof json.role === "string" ? json.role : null,
        sub: typeof json.sub === "string" ? json.sub : null,
      };
    } catch {
      return null;
    }
  };

  const uploadToStorage = useCallback(async (path: string, blob: Blob) => {
    if (!supabase || !supabaseUrl || !supabaseAnonKey) {
      return { error: "Supabase client is not configured.", publicUrl: null as string | null };
    }
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    if (!accessToken) {
      return { error: "Missing auth session.", publicUrl: null as string | null };
    }
    const formData = new FormData();
    formData.append("path", path);
    formData.append("contentType", blob.type || "image/jpeg");
    formData.append("file", blob, "upload");
    const res = await fetch("/playground/kcals/api/storage/upload", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    });
    if (!res.ok) {
      let message = res.statusText;
      try {
        const payload = await res.json();
        if (payload?.error) message = payload.error;
      } catch {
        // ignore JSON parse errors
      }
      return { error: message, publicUrl: null as string | null };
    }
    const payload = await res.json().catch(() => ({}));
    return { error: null as string | null, publicUrl: payload?.publicUrl ?? null };
  }, [supabase]);

  const buildCustomFoodsPayload = useCallback(async (
    onUploadError?: (message: string) => void
  ) => {
    const cache = new Map<string, string>();
    const toStorageUrl = async (imageId: string, imageValue?: string | null) => {
      if (imageValue && !isDataUrl(imageValue)) return imageValue;
      if (!supabase || !user) return imageValue ?? null;
      if (cache.has(imageId)) return cache.get(imageId) ?? null;
      let blob: Blob | null = null;
      if (imageValue && isDataUrl(imageValue)) {
        blob = dataUrlToBlob(imageValue);
      } else {
        try {
          blob = await loadCustomFoodImage(imageId);
        } catch {
          blob = null;
        }
      }
      if (!blob) return imageValue ?? null;
      const ext = blob.type === "image/png" ? "png" : "jpg";
      const path = `${user.id}/${IMAGE_FOLDER}/${imageId}.${ext}`;
      const { error, publicUrl } = await uploadToStorage(path, blob);
      if (error) {
        onUploadError?.(`Storage upload failed: ${error} (path: ${path}, uid: ${user.id})`);
        const fallback = imageValue ?? null;
        if (fallback) cache.set(imageId, fallback);
        return fallback;
      }
      if (!publicUrl) return imageValue ?? null;
      cache.set(imageId, publicUrl);
      return publicUrl;
    };

    return await Promise.all(
      customFoods.map(async (food) => {
        if (!food.imageId) return food;
        const url = await toStorageUrl(food.imageId, food.image ?? null);
        return url ? { ...food, image: url } : food;
      })
    );
  }, [customFoods, user, supabase, uploadToStorage]);

  const buildFoodListPayload = useCallback(async (
    items: FoodItem[],
    onUploadError?: (message: string) => void
  ) => {
    const cache = new Map<string, string>();
    const toStorageUrl = async (imageId: string, imageValue?: string | null) => {
      if (imageValue && !isDataUrl(imageValue)) return imageValue;
      if (!supabase || !user) return imageValue ?? null;
      if (cache.has(imageId)) return cache.get(imageId) ?? null;
      let blob: Blob | null = null;
      if (imageValue && isDataUrl(imageValue)) {
        blob = dataUrlToBlob(imageValue);
      } else {
        try {
          blob = await loadCustomFoodImage(imageId);
        } catch {
          blob = null;
        }
      }
      if (!blob) return imageValue ?? null;
      const ext = blob.type === "image/png" ? "png" : "jpg";
      const path = `${user.id}/${IMAGE_FOLDER}/${imageId}.${ext}`;
      const { error, publicUrl } = await uploadToStorage(path, blob);
      if (error) {
        onUploadError?.(`Storage upload failed: ${error} (path: ${path}, uid: ${user.id})`);
        const fallback = imageValue ?? null;
        if (fallback) cache.set(imageId, fallback);
        return fallback;
      }
      if (!publicUrl) return imageValue ?? null;
      cache.set(imageId, publicUrl);
      return publicUrl;
    };

    return await Promise.all(
      items.map(async (item) => {
        let nextItem = { ...item };
        if (item.imageId) {
          const url = await toStorageUrl(item.imageId, item.image ?? null);
          if (url) nextItem.image = url;
        }
        if (item.items?.length) {
          nextItem = { ...nextItem, items: await buildFoodListPayload(item.items, onUploadError) };
        }
        return nextItem;
      })
    );
  }, [user, supabase, uploadToStorage]);

  const buildAvatarPayload = useCallback(async (
    onUploadError?: (message: string) => void
  ) => {
    if (!user || !supabase) {
      return {
        mode: avatarMode,
        emoji: avatarEmojiDisplay,
        photo: avatarPhoto ?? null,
        calorieGoal,
      };
    }
    if (avatarMode !== "photo") {
      return { mode: avatarMode, emoji: avatarEmojiDisplay, photo: null, calorieGoal };
    }
    if (!avatarPhoto) {
      return { mode: avatarMode, emoji: avatarEmojiDisplay, photo: null, calorieGoal };
    }
    if (!isDataUrl(avatarPhoto)) {
      return { mode: avatarMode, emoji: avatarEmojiDisplay, photo: avatarPhoto, calorieGoal };
    }
    try {
      const blob = dataUrlToBlob(avatarPhoto);
      const ext = blob.type === "image/png" ? "png" : "jpg";
      const path = `${user.id}/${AVATAR_FOLDER}/avatar.${ext}`;
      const { error, publicUrl } = await uploadToStorage(path, blob);
      if (error) {
        onUploadError?.(`Storage upload failed: ${error} (path: ${path}, uid: ${user.id})`);
        return { mode: avatarMode, emoji: avatarEmojiDisplay, photo: avatarPhoto, calorieGoal };
      }
      return { mode: avatarMode, emoji: avatarEmojiDisplay, photo: publicUrl, calorieGoal };
    } catch {
      onUploadError?.("Avatar upload failed.");
      return { mode: avatarMode, emoji: avatarEmojiDisplay, photo: avatarPhoto, calorieGoal };
    }
  }, [user, avatarMode, avatarEmojiDisplay, avatarPhoto, calorieGoal, supabase]);

  const applyRemoteState = useCallback((row: {
    food_list?: FoodItem[] | null;
    custom_foods?: CustomFood[] | null;
    recent_foods?: RecentFood[] | null;
    daily_log?: Record<string, unknown> | null;
    profile?: {
      mode?: "emoji" | "photo";
      emoji?: string;
      photo?: string | null;
      calorieGoal?: number;
    } | null;
    updated_at?: string | null;
  }) => {
    if (row.food_list) {
      setFoods(row.food_list);
      saveFoodList(row.food_list);
    }
    if (row.custom_foods) {
      setCustomFoods(row.custom_foods);
      saveCustomFoods(row.custom_foods);
    }
    if (row.recent_foods) {
      setRecentFoods(row.recent_foods);
      localStorage.setItem("kcals-recent-foods", JSON.stringify(row.recent_foods));
    }
    const mergedDailyLog = mergeDailyLogs(loadDailyLogRaw(), row.daily_log);
    saveDailyLogRaw(mergedDailyLog);
    if (row.profile) {
      if (row.profile.mode === "emoji" || row.profile.mode === "photo") {
        setAvatarMode(row.profile.mode);
      }
      if (row.profile.emoji != null) {
        setAvatarEmoji(row.profile.emoji);
      }
      if (row.profile.photo !== undefined) {
        setAvatarPhoto(row.profile.photo);
      }
      const remoteGoal = Number(row.profile.calorieGoal);
      if (Number.isFinite(remoteGoal) && remoteGoal > 0) {
        const normalizedGoal = Math.round(remoteGoal);
        setCalorieGoal(normalizedGoal);
        setCalorieGoalInput(normalizedGoal.toString());
        localStorage.setItem(CALORIE_GOAL_KEY, normalizedGoal.toString());
      }
    }
    if (row.updated_at) {
      setLastSync(row.updated_at);
    }
  }, [setLastSync]);

  const isWriteAllowed = true;

  const syncToSupabase = useCallback(async (reason: "manual" | "auto" = "manual") => {
    if (!supabase || !user) return false;
    if (!isWriteAllowed) {
      if (reason === "manual") {
        setSyncStatus("error");
        setSyncError("Uploads are disabled on this host.");
      }
      return false;
    }
    const { data: sessionData } = await supabase.auth.getSession();
    const sessionInfo = decodeAuthToken(sessionData.session?.access_token);
    setSyncStatus("syncing");
    setSyncError(null);
    const uploadErrors: string[] = [];
    const reportUploadError = (message: string) => {
      if (!message) return;
      const role = sessionInfo?.role ?? "none";
      const sub = sessionInfo?.sub ?? "none";
      uploadErrors.push(`${message} (role: ${role}, sub: ${sub})`);
    };
    let remoteDailyLog: Record<string, unknown> | null = null;
    {
      const { data: remoteState, error: remoteError } = await supabase
        .from("kcals_state")
        .select("daily_log")
        .eq("user_id", user.id)
        .maybeSingle();
      if (remoteError && remoteError.code !== "PGRST116") {
        setSyncStatus("error");
        setSyncError(`Sync precheck failed: ${remoteError.message}`);
        return false;
      }
      remoteDailyLog = (remoteState?.daily_log as Record<string, unknown> | null) ?? null;
    }
    const mergedDailyLog = mergeDailyLogs(loadDailyLogRaw(), remoteDailyLog);
    const customFoodsPayload = await buildCustomFoodsPayload(reportUploadError);
    const foodListPayload = await buildFoodListPayload(foods, reportUploadError);
    const profilePayload = await buildAvatarPayload(reportUploadError);
    const payload = {
      user_id: user.id,
      food_list: foodListPayload,
      custom_foods: customFoodsPayload,
      recent_foods: recentFoods,
      daily_log: mergedDailyLog,
      profile: profilePayload,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from("kcals_state")
      .upsert(payload, { onConflict: "user_id" });
    if (error) {
      setSyncStatus("error");
      setSyncError(error.message);
      return false;
    }
    setCustomFoods(customFoodsPayload);
    saveCustomFoods(customFoodsPayload);
    setFoods(foodListPayload);
    saveFoodList(foodListPayload);
    saveDailyLogRaw(mergedDailyLog);
    if (profilePayload.mode) {
      setAvatarMode(profilePayload.mode);
    }
    if (profilePayload.emoji != null) {
      setAvatarEmoji(profilePayload.emoji);
    }
    if (profilePayload.photo !== undefined) {
      setAvatarPhoto(profilePayload.photo);
    }
    if (uploadErrors.length > 0) {
      setSyncError(`Some images failed to upload. ${uploadErrors[0]}`);
    }
    setSyncStatus("ok");
    setLastSync(payload.updated_at);
    if (reason === "manual") {
      setTimeout(() => setSyncStatus("idle"), 1200);
    }
    return true;
  }, [
    user,
    foods,
    recentFoods,
    setLastSync,
    isWriteAllowed,
    buildCustomFoodsPayload,
    buildFoodListPayload,
    buildAvatarPayload,
    decodeAuthToken,
  ]);

  useEffect(() => {
    syncToSupabaseRef.current = syncToSupabase;
  }, [syncToSupabase]);

  const syncFromSupabase = useCallback(async (): Promise<"data" | "none" | "error"> => {
    if (!supabase || !user) return "error";
    const { data, error } = await supabase
      .from("kcals_state")
      .select("food_list, custom_foods, recent_foods, daily_log, profile, updated_at")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error && error.code !== "PGRST116") {
      setSyncError(error.message);
      return "error";
    }
    if (data) {
      applyRemoteState(data);
      return "data";
    }
    return "none";
  }, [user, applyRemoteState]);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // No automatic sync on sign-in. Sync happens only via manual "Sync now" or auto-sync schedule.

  useEffect(() => {
    if (user) setShowAuthModal(false);
  }, [user]);

  useEffect(() => {
    if (!showAuthModal) return;
    setAuthStatus("idle");
    setAuthError(null);
    setAuthOtp("");
    setAuthStep("email");
  }, [showAuthModal]);

  useEffect(() => {
    setDayStartHourState(getDayStartHour());
  }, []);

  const updateViewportVars = useCallback(() => {
    if (typeof window === "undefined") return;
    const vv = window.visualViewport;
    const height = Math.min(window.innerHeight, vv?.height ?? window.innerHeight);
    const offsetTop = vv?.offsetTop ?? 0;
    const keyboardInsetRaw = Math.max(0, window.innerHeight - height - offsetTop);
    const active = document.activeElement;
    const hasTextFocus =
      !!active &&
      (active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        (active as HTMLElement).isContentEditable);
    const keyboardInset = hasTextFocus ? keyboardInsetRaw : 0;
    const root = document.documentElement;
    root.style.setProperty("--vvh", `${height}px`);
    root.style.setProperty("--vv-offset-top", `${offsetTop}px`);
    root.style.setProperty("--keyboard-inset", `${keyboardInset}px`);
  }, []);

  useEffect(() => {
    updateViewportVars();
    const vv = window.visualViewport;
    vv?.addEventListener("resize", updateViewportVars);
    vv?.addEventListener("scroll", updateViewportVars);
    window.addEventListener("resize", updateViewportVars);
    window.addEventListener("orientationchange", updateViewportVars);
    window.addEventListener("focusin", updateViewportVars);
    window.addEventListener("focusout", updateViewportVars);
    return () => {
      vv?.removeEventListener("resize", updateViewportVars);
      vv?.removeEventListener("scroll", updateViewportVars);
      window.removeEventListener("resize", updateViewportVars);
      window.removeEventListener("orientationchange", updateViewportVars);
      window.removeEventListener("focusin", updateViewportVars);
      window.removeEventListener("focusout", updateViewportVars);
    };
  }, [updateViewportVars]);

  useEffect(() => {
    if (!inputFocused) return;
    updateViewportVars();
    const t1 = setTimeout(updateViewportVars, 60);
    const t2 = setTimeout(updateViewportVars, 240);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [inputFocused, updateViewportVars]);

  useEffect(() => {
    updateViewportVars();
  }, [inputFocused, updateViewportVars]);

  useEffect(() => {
    if (inputFocused) {
      setIsCompact(false);
      return;
    }
    const handleScroll = () => {
      setIsCompact(window.scrollY > 100);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [inputFocused]);

  const updateFoods = useCallback((updater: (prev: FoodItem[]) => FoodItem[]) => {
    setFoods((prev) => {
      const next = updater(prev);
      saveFoodList(next);
      return next;
    });
  }, []);

  const setImageUrlForId = useCallback((id: string, url: string) => {
    setImageUrls((prev) => {
      const existing = prev[id];
      if (existing) URL.revokeObjectURL(existing);
      return { ...prev, [id]: url };
    });
  }, []);

  const removeImageUrlForId = useCallback((id: string) => {
    setImageUrls((prev) => {
      const existing = prev[id];
      if (!existing) return prev;
      URL.revokeObjectURL(existing);
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const ensureImageUrl = useCallback(
    async (id: string) => {
      if (imageUrlsRef.current[id]) return imageUrlsRef.current[id];
      let blob: Blob | null = null;
      try {
        blob = await loadCustomFoodImage(id);
      } catch {
        return null;
      }
      if (!blob) return null;
      const url = URL.createObjectURL(blob);
      setImageUrlForId(id, url);
      return url;
    },
    [setImageUrlForId]
  );

  const collectFoodImageIds = useCallback((items: FoodItem[], ids: Set<string>) => {
    for (const item of items) {
      if (item.imageId) ids.add(item.imageId);
      if (item.items?.length) collectFoodImageIds(item.items, ids);
    }
  }, []);

  useEffect(() => {
    const ids = new Set<string>();
    customFoods.forEach((food) => {
      if (food.imageId) ids.add(food.imageId);
    });
    collectFoodImageIds(foods, ids);
    const missing = Array.from(ids).filter((id) => !imageUrlsRef.current[id]);
    if (missing.length === 0) return;
    let cancelled = false;
    (async () => {
      for (const id of missing) {
        let blob: Blob | null = null;
        try {
          blob = await loadCustomFoodImage(id);
        } catch {
          blob = null;
        }
        if (!blob) continue;
        const url = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(url);
          continue;
        }
        setImageUrlForId(id, url);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customFoods, foods, collectFoodImageIds, setImageUrlForId]);

  useEffect(() => {
    if (hasMigratedImagesRef.current) return;
    const hasLegacyCustom = customFoods.some((food) => food.image && !food.imageId);
    const hasLegacyFoods = (items: FoodItem[]): boolean =>
      items.some((item) => (item.image && !item.imageId) || (item.items?.length ? hasLegacyFoods(item.items) : false));
    if (!hasLegacyCustom && !hasLegacyFoods(foods)) {
      hasMigratedImagesRef.current = true;
      return;
    }
    hasMigratedImagesRef.current = true;
    let cancelled = false;

    const migrate = async () => {
      let customChanged = false;
      const nextCustomFoods = await Promise.all(
        customFoods.map(async (food) => {
          if (food.image && !food.imageId) {
            try {
              const blob = dataUrlToBlob(food.image);
              await saveCustomFoodImage(food.id, blob);
              const url = URL.createObjectURL(blob);
              if (cancelled) {
                URL.revokeObjectURL(url);
              } else {
                setImageUrlForId(food.id, url);
              }
              customChanged = true;
              const { image, ...rest } = food;
              return { ...rest, imageId: food.id };
            } catch {
              return food;
            }
          }
          return food;
        })
      );

      const migrateFoodItems = async (
        items: FoodItem[]
      ): Promise<{ items: FoodItem[]; changed: boolean }> => {
        let changed = false;
        const nextItems = await Promise.all(
          items.map(async (item) => {
            let nextItem = item;
            if (item.image && !item.imageId) {
              try {
                const blob = dataUrlToBlob(item.image);
                await saveCustomFoodImage(item.id, blob);
                const url = URL.createObjectURL(blob);
                if (cancelled) {
                  URL.revokeObjectURL(url);
                } else {
                  setImageUrlForId(item.id, url);
                }
                const { image, ...rest } = nextItem;
                nextItem = { ...rest, imageId: item.id };
                changed = true;
              } catch {
                nextItem = item;
              }
            }
            if (nextItem.items?.length) {
              const child = await migrateFoodItems(nextItem.items);
              if (child.changed) {
                nextItem = { ...nextItem, items: child.items };
                changed = true;
              }
            }
            return nextItem;
          })
        );
        return { items: nextItems, changed };
      };

      const foodsResult = await migrateFoodItems(foods);
      if (!cancelled) {
        if (customChanged) {
          setCustomFoods(nextCustomFoods);
          saveCustomFoods(nextCustomFoods);
        }
        if (foodsResult.changed) {
          setFoods(foodsResult.items);
          saveFoodList(foodsResult.items);
        }
      }
    };

    migrate();
    return () => {
      cancelled = true;
    };
  }, [customFoods, foods, setImageUrlForId]);

  const totalKcal = foods.reduce((sum, f) => sum + groupKcal(f), 0);
  const remaining = calorieGoal - totalKcal;
  const remainingPrefix = remaining >= 0 ? "+" : "";
  const remainingIsNegative = remaining < 0;
  const shaderColors = totalKcal <= calorieGoal
    ? ["#FF8837", "#FFD537"]
    : ["#5AB3FF", "#6DFFEF"];
  const displayDate = getDisplayDate(new Date());
  const todayLabel = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(displayDate);
  const [streak, setStreak] = useState(0);
  const [weeklyBurn, setWeeklyBurn] = useState(0);
  const [showWeeklyModal, setShowWeeklyModal] = useState(false);
  const [weeklyBreakdown, setWeeklyBreakdown] = useState<WeeklyEntry[]>([]);
  const [lastCustomMatch, setLastCustomMatch] = useState<CustomFood | null>(null);
  const [lastRecentMatch, setLastRecentMatch] = useState<RecentFood | null>(null);
  const weeklyVisibleEntries = weeklyBreakdown.filter(
    (e) => calorieGoal - e.remaining >= 800
  );
  const weeklyHasData = weeklyVisibleEntries.length > 0;
  const weeklyIsOnTrack = weeklyBurn >= 0;
  const weeklyAbsTotal = Math.abs(weeklyBurn);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareBgType, setShareBgType] = useState<"gradient" | "image">("gradient");
  const [shareImage, setShareImage] = useState<string | null>(null);
  const [shareImageLoaded, setShareImageLoaded] = useState(false);
  const [shareStatus, setShareStatus] = useState<"idle" | "rendering" | "error">("idle");
  const [shareError, setShareError] = useState<string | null>(null);
  const [badgePos, setBadgePos] = useState({ x: 0, y: 0 });
  const [badgeScale, setBadgeScale] = useState(1);
  const [badgeRotation, setBadgeRotation] = useState(0);
  const sharePreviewRef = useRef<HTMLDivElement | null>(null);
  const shareBadgeRef = useRef<HTMLDivElement | null>(null);
  const shareBadgeCardRef = useRef<HTMLDivElement | null>(null);
  const shareBadgeExportRef = useRef<HTMLDivElement | null>(null);
  const shareGalleryInputRef = useRef<HTMLInputElement | null>(null);
  const badgeDragRef = useRef<{
    pointerId: number | null;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  }>({
    pointerId: null,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });
  const badgePointersRef = useRef(new Map<number, { x: number; y: number }>());
  const badgeGestureRef = useRef<{
    startDistance: number;
    startAngle: number;
    startScale: number;
    startRotation: number;
  } | null>(null);
  const badgeMovedRef = useRef(false);

  useEffect(() => {
    const hasFood = foods.some((f) => !f.loading && f.kcal != null);
    saveDailyEntry(remaining, hasFood);
    setStreak(getStreak());
    const breakdown = getWeeklyBreakdown();
    setWeeklyBreakdown(breakdown);
    const qualifying = breakdown.filter(
      (e) => calorieGoal - e.remaining >= 800
    );
    setWeeklyBurn(qualifying.reduce((sum, e) => sum + e.remaining, 0));
  }, [foods, remaining, calorieGoal, dayStartHour]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(EMPTY_STATE_VARIANT_KEY);
    const parsed = raw != null ? Number.parseInt(raw, 10) : -1;
    const lastIndex = Number.isFinite(parsed) ? parsed : -1;
    const nextIndex = (lastIndex + 1 + EMPTY_STATE_VARIANTS.length) % EMPTY_STATE_VARIANTS.length;
    window.localStorage.setItem(EMPTY_STATE_VARIANT_KEY, String(nextIndex));
    setEmptyStateVariantIndex(nextIndex);
  }, []);

  const rotateEmptyStateVariant = useCallback(() => {
    setEmptyStateVariantIndex((prev) => {
      const next = (prev + 1) % EMPTY_STATE_VARIANTS.length;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(EMPTY_STATE_VARIANT_KEY, String(next));
      }
      return next;
    });
  }, []);

  /* ===========================
     Input focus handlers
     =========================== */

  const handleInputFocus = () => {
    clearTimeout(blurTimeout.current);
    setInputFocused(true);
    setSwipedItemId(null);
  };

  const handleInputBlur = () => {
    blurTimeout.current = setTimeout(() => setInputFocused(false), 200);
  };

  const cancelDismiss = () => {
    clearTimeout(blurTimeout.current);
  };

  const dismissSuggestions = () => {
    setInputFocused(false);
    inputRef.current?.blur();
  };

  const commitCalorieGoal = (value: string) => {
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed) || parsed <= 0) {
      setCalorieGoalInput(calorieGoal.toString());
      return;
    }
    setCalorieGoal(parsed);
    setCalorieGoalInput(parsed.toString());
    if (typeof window !== "undefined") {
      localStorage.setItem(CALORIE_GOAL_KEY, parsed.toString());
    }
  };

  const toggleAutoSync = () => {
    setAutoSyncEnabled((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem(AUTO_SYNC_KEY, next ? "true" : "false");
      }
      return next;
    });
  };

  const handleDayStartHourChange = (value: number) => {
    setDayStartHourState(value);
    setDayStartHour(value);
  };

  const resetDailyFoods = useCallback(() => {
    setFoods([]);
    saveFoodList([]);
    setGroupModal(null);
    setEditFoodModal(null);
    setSelectedCustomFood(null);
    setEditingFood(null);
    setShowModal(false);
  }, []);

  const runAutoSync = useCallback(async () => {
    if (!supabase || !user || !autoSyncEnabled) return false;
    const now = new Date();
    if (now.getHours() < dayStartHour) return false;
    const currentKey = getDayKey(now);
    const lastAuto = typeof window !== "undefined" ? localStorage.getItem(AUTO_SYNC_DATE_KEY) : null;
    if (lastAuto === currentKey) return false;
    const ok = isWriteAllowed
      ? await syncToSupabase("auto")
      : (await syncFromSupabase()) === "data";
    if (ok && typeof window !== "undefined") {
      resetDailyFoods();
      localStorage.setItem(LAST_DAY_KEY, currentKey);
      localStorage.setItem(AUTO_SYNC_DATE_KEY, currentKey);
    }
    return ok;
  }, [supabase, user, autoSyncEnabled, dayStartHour, isWriteAllowed, syncToSupabase, syncFromSupabase, resetDailyFoods]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (autoSyncEnabled) return;
    const currentKey = getDayKey(new Date());
    const storedKey = localStorage.getItem(LAST_DAY_KEY);
    if (storedKey && storedKey !== currentKey) {
      resetDailyFoods();
    }
    localStorage.setItem(LAST_DAY_KEY, currentKey);
  }, [dayStartHour, resetDailyFoods, autoSyncEnabled]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (autoSyncEnabled) {
      runAutoSync();
    }
    let timer: ReturnType<typeof setTimeout>;

    const schedule = () => {
      const now = new Date();
      const next = new Date(now);
      next.setHours(dayStartHour, 0, 0, 0);
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }
      const delay = next.getTime() - now.getTime();
      timer = setTimeout(() => {
        (async () => {
          if (autoSyncEnabled) {
            await runAutoSync();
          } else {
            const currentKey = getDayKey(new Date());
            const storedKey = localStorage.getItem(LAST_DAY_KEY);
            if (storedKey !== currentKey) {
              resetDailyFoods();
              localStorage.setItem(LAST_DAY_KEY, currentKey);
            }
          }
          schedule();
        })();
      }, Math.max(1000, delay + 1000));
    };

    schedule();
    return () => clearTimeout(timer);
  }, [dayStartHour, resetDailyFoods, autoSyncEnabled, runAutoSync]);

  const handleOpenShare = () => {
    badgeMovedRef.current = false;
    badgePointersRef.current.clear();
    badgeGestureRef.current = null;
    badgeDragRef.current.pointerId = null;
    setShareError(null);
    setShareStatus("idle");
    setBadgeScale(1);
    setBadgeRotation(0);
    setShowShareModal(true);
    setShowWeeklyModal(false);
  };

  const handleShareFile = (file: File) => {
    setShareImageLoaded(false);
    const reader = new FileReader();
    reader.onload = () => {
      setShareImage(reader.result as string);
      setShareBgType("image");
    };
    reader.readAsDataURL(file);
  };

  const handleShareGalleryChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleShareFile(file);
    e.target.value = "";
  };

  const centerBadge = useCallback(() => {
    const preview = sharePreviewRef.current;
    const badge = shareBadgeRef.current;
    if (!preview || !badge) return;
    const pw = preview.clientWidth;
    const ph = preview.clientHeight;
    const bw = badge.clientWidth;
    const bh = badge.clientHeight;
    setBadgePos({
      x: Math.max(0, (pw - bw) / 2),
      y: Math.max(0, (ph - bh) / 2),
    });
  }, []);

  useEffect(() => {
    if (!showShareModal) return;
    const raf = requestAnimationFrame(() => {
      if (!badgeMovedRef.current) centerBadge();
    });
    const handleResize = () => {
      if (!badgeMovedRef.current) centerBadge();
    };
    window.addEventListener("resize", handleResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", handleResize);
    };
  }, [showShareModal, shareBgType, shareImage, centerBadge]);

  const handleShareBadgePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const preview = sharePreviewRef.current;
    const badge = shareBadgeRef.current;
    if (!preview || !badge) return;
    badgeMovedRef.current = true;
    badgePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (badgePointersRef.current.size === 1) {
      badgeDragRef.current.pointerId = e.pointerId;
      badgeDragRef.current.startX = e.clientX;
      badgeDragRef.current.startY = e.clientY;
      badgeDragRef.current.originX = badgePos.x;
      badgeDragRef.current.originY = badgePos.y;
    } else if (badgePointersRef.current.size === 2) {
      const points = Array.from(badgePointersRef.current.values());
      const dx = points[1].x - points[0].x;
      const dy = points[1].y - points[0].y;
      badgeGestureRef.current = {
        startDistance: Math.hypot(dx, dy),
        startAngle: Math.atan2(dy, dx),
        startScale: badgeScale,
        startRotation: badgeRotation,
      };
      badgeDragRef.current.pointerId = null;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleShareBadgePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!badgePointersRef.current.has(e.pointerId)) return;
    badgePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const preview = sharePreviewRef.current;
    const badge = shareBadgeRef.current;
    if (!preview || !badge) return;

    if (badgePointersRef.current.size >= 2 && badgeGestureRef.current) {
      const points = Array.from(badgePointersRef.current.values());
      const dx = points[1].x - points[0].x;
      const dy = points[1].y - points[0].y;
      const distance = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);
      const scaleRaw = (badgeGestureRef.current.startScale * distance) / badgeGestureRef.current.startDistance;
      const nextScale = Math.min(1.6, Math.max(0.6, scaleRaw));
      const nextRotation = badgeGestureRef.current.startRotation + (angle - badgeGestureRef.current.startAngle) * (180 / Math.PI);
      setBadgeScale(nextScale);
      setBadgeRotation(nextRotation);
      return;
    }

    if (badgeDragRef.current.pointerId !== e.pointerId) return;
    const dx = e.clientX - badgeDragRef.current.startX;
    const dy = e.clientY - badgeDragRef.current.startY;
    const previewRect = preview.getBoundingClientRect();
    const badgeRect = badge.getBoundingClientRect();
    const maxX = Math.max(0, previewRect.width - badgeRect.width);
    const maxY = Math.max(0, previewRect.height - badgeRect.height);
    const nextX = Math.min(Math.max(0, badgeDragRef.current.originX + dx), maxX);
    const nextY = Math.min(Math.max(0, badgeDragRef.current.originY + dy), maxY);
    setBadgePos({ x: nextX, y: nextY });
  };

  const handleShareBadgePointerEnd = (e: PointerEvent<HTMLDivElement>) => {
    if (badgePointersRef.current.has(e.pointerId)) {
      badgePointersRef.current.delete(e.pointerId);
    }
    if (badgePointersRef.current.size < 2) {
      badgeGestureRef.current = null;
    }
    if (badgeDragRef.current.pointerId === e.pointerId) {
      badgeDragRef.current.pointerId = null;
    }
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handleShareNow = async () => {
    if (!sharePreviewRef.current) return;
    if (shareBgType === "image" && shareImage && !shareImageLoaded) {
      setShareStatus("error");
      setShareError("Image is still loading. Try again.");
      return;
    }
    setShareStatus("rendering");
    setShareError(null);
    try {
      const preview = sharePreviewRef.current;
      const badge = shareBadgeRef.current;
      const badgeCard = shareBadgeCardRef.current;
      const badgeExport = shareBadgeExportRef.current;
      if (!badge || !badgeCard || !badgeExport) throw new Error("Badge missing.");
      const previewRect = preview.getBoundingClientRect();
      const scale = 3;
      const width = Math.max(1, Math.round(previewRect.width * scale));
      const height = Math.max(1, Math.round(previewRect.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not supported.");

      if (shareBgType === "image" && shareImage) {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = () => reject(new Error("Failed to load image."));
          image.src = shareImage;
        });
        const imgRatio = img.width / img.height;
        const canvasRatio = width / height;
        let drawW = width;
        let drawH = height;
        let dx = 0;
        let dy = 0;
        if (imgRatio > canvasRatio) {
          drawH = height;
          drawW = height * imgRatio;
          dx = (width - drawW) / 2;
        } else {
          drawW = width;
          drawH = width / imgRatio;
          dy = (height - drawH) / 2;
        }
        ctx.drawImage(img, dx, dy, drawW, drawH);
      } else {
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, "#007BFF");
        gradient.addColorStop(1, "#209E9C");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
      }

      const baseW = badgeExport.offsetWidth;
      const baseH = badgeExport.offsetHeight;

      const { toPng } = await import("html-to-image");
      const badgeDataUrl = await toPng(badgeExport, {
        cacheBust: true,
        pixelRatio: scale,
      });
      const badgeImg = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("Failed to render badge."));
        image.src = badgeDataUrl;
      });
      const centerX = (badgePos.x + baseW / 2) * scale;
      const centerY = (badgePos.y + baseH / 2) * scale;
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate((badgeRotation * Math.PI) / 180);
      ctx.scale(badgeScale, badgeScale);
      ctx.drawImage(
        badgeImg,
        (-baseW / 2) * scale,
        (-baseH / 2) * scale,
        baseW * scale,
        baseH * scale
      );
      ctx.restore();

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((result) => (result ? resolve(result) : reject(new Error("Failed to render image."))), "image/png");
      });
      const file = new File([blob], "kcals-share.png", { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Kcals",
          text: "You're on track!",
        });
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "kcals-share.png";
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      }
      setShareStatus("idle");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Share failed.";
      setShareStatus("error");
      setShareError(message);
    }
  };

  const handleSendMagicLink = async () => {
    if (!supabase) return;
    if (!authEmail.trim()) {
      setAuthError("Enter your email.");
      return;
    }
    setAuthStatus("sending");
    setAuthError(null);
    const redirectTo = typeof window !== "undefined" ? window.location.origin + window.location.pathname : undefined;
    const { error } = await supabase.auth.signInWithOtp({
      email: authEmail.trim(),
      options: redirectTo ? { emailRedirectTo: redirectTo, shouldCreateUser: true } : { shouldCreateUser: true },
    });
    if (error) {
      setAuthStatus("error");
      setAuthError(error.message);
      return;
    }
    setAuthStep("code");
    setAuthStatus("sent");
  };

  const handleVerifyOtp = async () => {
    if (!supabase) return;
    const token = authOtp.trim();
    if (!token) {
      setAuthError("Enter the code from your email.");
      return;
    }
    setAuthStatus("verifying");
    setAuthError(null);
    const { error } = await supabase.auth.verifyOtp({
      email: authEmail.trim(),
      token,
      type: "email",
    });
    if (error) {
      setAuthStatus("error");
      setAuthError(error.message);
      return;
    }
    setAuthStatus("idle");
    setAuthOtp("");
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    setShowProfileModal(false);
  };

  const handleAvatarEmojiChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\s+/g, "");
    const last = getLastGrapheme(value);
    setAvatarEmoji(last);
    setAvatarMode("emoji");
  };

  const handleAvatarPhotoPick = () => {
    avatarPhotoInputRef.current?.click();
  };

  const handleAvatarPhotoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const blob = await downscaleImage(file, 512, 0.85);
      const dataUrl = await blobToDataUrl(blob);
      setAvatarPhoto(dataUrl);
      setAvatarMode("photo");
    } catch {
      // ignore
    }
  };

  const handleOpenAccountOrAuthModal = () => {
    if (user) {
      setShowAuthModal(false);
      setShowProfileModal(true);
      return;
    }
    setShowProfileModal(false);
    setShowAuthModal(true);
  };

  const handleSyncNow = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setSyncStatus("syncing");
    setSyncError(null);
    const localGoalConfigured =
      typeof window !== "undefined" && localStorage.getItem(CALORIE_GOAL_KEY) != null;
    const localHasData =
      foods.length > 0 ||
      customFoods.length > 0 ||
      recentFoods.length > 0 ||
      Object.keys(loadDailyLogRaw() || {}).length > 0 ||
      localGoalConfigured;
    if (!isWriteAllowed) {
      const result = await syncFromSupabase();
      setSyncStatus(result === "data" ? "ok" : "error");
      if (result === "none") {
        setSyncError("No remote data found for this account.");
      }
      setTimeout(() => setSyncStatus("idle"), 1200);
      return;
    }
    // IMPORTANT: when local data exists, push first to avoid overwriting
    // newer unsynced local entries with stale remote state.
    if (localHasData) {
      await syncToSupabase("manual");
      return;
    }

    // Local is empty: safe to restore from cloud.
    const pullResult = await syncFromSupabase();
    if (pullResult === "data") {
      setSyncStatus("ok");
      setTimeout(() => setSyncStatus("idle"), 1200);
      return;
    }
    if (pullResult === "error") {
      setSyncStatus("error");
      return;
    }
    setSyncStatus("error");
    setSyncError("No remote data found for this account.");
    setTimeout(() => setSyncStatus("idle"), 1200);
  };

  const handlePillTap = (food: RecentFood) => {
    cancelDismiss();
    setSelectedCustomFood(null);
    setSelectedRecentFood(food);
    setInputValue("");
    setInputFocused(true);
    inputRef.current?.focus();
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  /* ===========================
     Custom food handlers
     =========================== */

  const handleAddCustomFood = () => {
    setInputFocused(false);
    inputRef.current?.blur();
    setEditingFood(null);
    setModalName("");
    setModalKcal("");
    if (modalImageBlob && modalImageUrl) {
      URL.revokeObjectURL(modalImageUrl);
    }
    setModalImageUrl(null);
    setModalImageBlob(null);
    setShowModal(true);
  };

  const handleEditCustomFood = async (food: CustomFood) => {
    setInputFocused(false);
    inputRef.current?.blur();
    setEditingFood(food);
    setModalName(food.name);
    setModalKcal(food.kcalPer100g.toString());
    setModalImageBlob(null);
    if (food.imageId) {
      const url = await ensureImageUrl(food.imageId);
      setModalImageUrl(url ?? food.image ?? null);
    } else if (food.image) {
      setModalImageUrl(food.image);
    } else {
      setModalImageUrl(null);
    }
    setShowModal(true);
  };

  const handleSaveCustomFood = async () => {
    const name = modalName.trim();
    const kcal = Number(modalKcal);
    if (!name || isNaN(kcal) || kcal <= 0) return;

    const foodId = editingFood?.id ?? Date.now().toString();
    let imageId = editingFood?.imageId;
    if (modalImageBlob) imageId = foodId;

    const nextFood: CustomFood = {
      id: foodId,
      name,
      kcalPer100g: kcal,
      ...(imageId ? { imageId } : {}),
    };

    let updated: CustomFood[];
    if (editingFood) {
      updated = customFoods.map((f) => (f.id === editingFood.id ? nextFood : f));
    } else {
      updated = [...customFoods, nextFood];
    }

    if (modalImageBlob && imageId) {
      try {
        await saveCustomFoodImage(imageId, modalImageBlob);
        const url = URL.createObjectURL(modalImageBlob);
        setImageUrlForId(imageId, url);
      } catch {
        // ignore image save errors
      }
    }
    setCustomFoods(updated);
    saveCustomFoods(updated);
    setShowModal(false);
    if (modalImageBlob && modalImageUrl) {
      URL.revokeObjectURL(modalImageUrl);
    }
    setModalImageUrl(null);
    setModalImageBlob(null);
    setTimeout(() => inputRef.current?.focus(), 300);
  };

  const handleDeleteCustomFood = async () => {
    if (!editingFood) return;
    const updated = customFoods.filter((f) => f.id !== editingFood.id);
    setCustomFoods(updated);
    saveCustomFoods(updated);
    if (editingFood.imageId) {
      try {
        await deleteCustomFoodImage(editingFood.imageId);
      } catch {
        // ignore delete errors
      }
      removeImageUrlForId(editingFood.imageId);
    }
    setShowModal(false);
    if (modalImageBlob && modalImageUrl) {
      URL.revokeObjectURL(modalImageUrl);
    }
    setModalImageUrl(null);
    setModalImageBlob(null);
    setTimeout(() => inputRef.current?.focus(), 300);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    if (modalImageBlob && modalImageUrl) {
      URL.revokeObjectURL(modalImageUrl);
    }
    setModalImageUrl(null);
    setModalImageBlob(null);
    setTimeout(() => inputRef.current?.focus(), 300);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const blob = await downscaleImage(file);
      if (modalImageBlob && modalImageUrl) {
        URL.revokeObjectURL(modalImageUrl);
      }
      setModalImageBlob(blob);
      setModalImageUrl(URL.createObjectURL(blob));
    } catch {
      // ignore image errors
    }
    e.target.value = "";
  };

  const handleCustomPillTap = (food: CustomFood) => {
    cancelDismiss();
    setSelectedCustomFood(food);
    setSelectedRecentFood(null);
    setInputValue("");
    setInputFocused(true);
    inputRef.current?.focus();
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleEmptyStateChipTap = (chip: (typeof EMPTY_STATE_QUICK_CHIPS)[number]) => {
    cancelDismiss();
    setSelectedCustomFood(null);
    setSelectedRecentFood({
      name: chip.label,
      emoji: chip.emoji,
      count: 0,
      kcalPer100g: 0,
    });
    setInputValue("");
    setInputFocused(true);
    inputRef.current?.focus();
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handlePillPointerDown = (
    type: "custom" | "recent",
    food: CustomFood | RecentFood,
    e: React.PointerEvent
  ) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const target = e.currentTarget as HTMLElement;
    if (pillLongPressRef.current.timer) {
      clearTimeout(pillLongPressRef.current.timer);
      pillLongPressRef.current.timer = null;
    }
    pillLongPressRef.current.triggered = false;
    pillLongPressRef.current.startX = e.clientX;
    pillLongPressRef.current.startY = e.clientY;
    pillLongPressRef.current.timer = setTimeout(() => {
      pillLongPressRef.current.triggered = true;
      if (navigator.vibrate) navigator.vibrate(50);
      chipMenuAnchorRef.current = target;
      const { x, y } = getChipMenuPosition(target);
      setChipMenu(
        type === "custom"
          ? { type: "custom", customFood: food as CustomFood, x, y }
          : { type: "recent", recentFood: food as RecentFood, x, y }
      );
    }, LONG_PRESS_MS);
  };

  const handlePillPointerMove = (e: React.PointerEvent) => {
    if (!pillLongPressRef.current.timer) return;
    const dx = Math.abs(e.clientX - pillLongPressRef.current.startX);
    const dy = Math.abs(e.clientY - pillLongPressRef.current.startY);
    if (dx > DRAG_MOVE_CANCEL || dy > DRAG_MOVE_CANCEL) {
      clearTimeout(pillLongPressRef.current.timer);
      pillLongPressRef.current.timer = null;
    }
  };

  const handlePillPointerEnd = () => {
    if (pillLongPressRef.current.timer) {
      clearTimeout(pillLongPressRef.current.timer);
      pillLongPressRef.current.timer = null;
    }
  };

  useEffect(() => {
    if (!chipMenu) return;
    const update = () => updateChipMenuPosition();
    const scroller = suggestionsScrollRef.current;
    scroller?.addEventListener("scroll", update, { passive: true });
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    const vv = window.visualViewport;
    vv?.addEventListener("resize", update);
    vv?.addEventListener("scroll", update);
    update();
    return () => {
      scroller?.removeEventListener("scroll", update);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      vv?.removeEventListener("resize", update);
      vv?.removeEventListener("scroll", update);
    };
  }, [chipMenu, updateChipMenuPosition]);

  const [closingChipMenu, setClosingChipMenu] = useState(false);
  const clearChipMenuImmediate = () => {
    chipMenuAnchorRef.current = null;
    setChipMenu(null);
  };

  const handleChipMenuClose = () => {
    setClosingChipMenu(true);
    setTimeout(() => {
      chipMenuAnchorRef.current = null;
      setChipMenu(null);
      setClosingChipMenu(false);
    }, MODAL_ANIM_MS);
  };

  const handleChipMenuInsert = () => {
    if (!chipMenu) return;
    if (chipMenu.type === "custom" && chipMenu.customFood) {
      handleCustomPillTap(chipMenu.customFood);
    } else if (chipMenu.type === "recent" && chipMenu.recentFood) {
      handlePillTap(chipMenu.recentFood);
    }
    clearChipMenuImmediate();
  };

  const handleChipMenuEdit = () => {
    if (!chipMenu?.customFood) return;
    const food = chipMenu.customFood;
    clearChipMenuImmediate();
    handleEditCustomFood(food);
  };

  const handleChipMenuRemoveCustom = async () => {
    if (!chipMenu?.customFood) return;
    const food = chipMenu.customFood;
    clearChipMenuImmediate();
    const updated = customFoods.filter((f) => f.id !== food.id);
    setCustomFoods(updated);
    saveCustomFoods(updated);
    if (food.imageId) {
      try {
        await deleteCustomFoodImage(food.imageId);
      } catch {
        // ignore
      }
      removeImageUrlForId(food.imageId);
    }
  };

  const handleChipMenuRemoveRecent = () => {
    if (!chipMenu?.recentFood) return;
    removeRecentFood(chipMenu.recentFood.name);
    setRecentFoods(loadRecentFoods());
    clearChipMenuImmediate();
  };

  /* ===========================
     Submit food handler
     =========================== */

  const handleSubmit = () => {
    let text = inputValue.trim();
    const recentSelection = selectedRecentFood;

    if (selectedCustomFood) {
      let amountText = text || "100g";
      if (!/\s*(kg|g|grams?)\s*$/i.test(amountText)) amountText = `${amountText.trim()}g`;
      const combinedText = `${selectedCustomFood.name} ${amountText}`;
      const parsed = parseFoodInput(combinedText);
      const grams = parsed.quantity;
      const itemId = Date.now().toString();
      const displayName = `${parsed.name} ${grams}g`;
      const kcal = Math.round((selectedCustomFood.kcalPer100g * grams) / 100);

      updateFoods((prev) => [
        {
          id: itemId,
          emoji: "\u{1F4E6}",
          name: displayName,
          kcal,
          source: "manual",
          sourceName: selectedCustomFood.name,
          kcalPer100g: selectedCustomFood.kcalPer100g,
          ...(selectedCustomFood.imageId ? { imageId: selectedCustomFood.imageId } : {}),
        },
        ...prev,
      ]);

      setSelectedCustomFood(null);
      setInputValue("");
      setInputFocused(false);
      inputRef.current?.blur();
      return;
    }

    if (recentSelection) {
      let amountText = text || "100g";
      if (!/\s*(kg|g|grams?)\s*$/i.test(amountText)) amountText = `${amountText.trim()}g`;
      text = `${recentSelection.name} ${amountText}`;
      setSelectedRecentFood(null);
    }

    if (!text) return;

    const parsed = parseFoodInput(text);
    const embeddedFood = resolveEmbeddedFood(parsed.name);
    const alias = resolveFoodAlias(parsed.name);
    const canonicalName = alias.displayName;
    const emoji = alias.emoji ?? getFoodEmoji(canonicalName);
    const itemId = Date.now().toString();
    const toGrams = (gramsPerUnit?: number) =>
      parsed.unit === "count"
        ? Math.round(parsed.quantity * (gramsPerUnit ?? 100))
        : parsed.quantity;

    // Check cache first (recent foods or custom foods)
    const cached = alias.matched ? undefined : findCachedFood(canonicalName);
    const customMatch = customFoods.find(
      (f) => f.name.toLowerCase() === canonicalName.toLowerCase()
    );
    const cachedKcalPer100g = cached?.kcalPer100g ?? customMatch?.kcalPer100g;
    const cachedGramsPerUnit = cached?.gramsPerUnit;

    // Clear input and dismiss suggestions
    setInputValue("");
    setInputFocused(false);
    inputRef.current?.blur();

    if (embeddedFood) {
      const grams = toGrams(embeddedFood.gramsPerUnit);
      const displayName = `${embeddedFood.name} ${grams}g`;
      const kcal = Math.round((embeddedFood.kcalPer100g * grams) / 100);
      updateFoods((prev) => [
        {
          id: itemId,
          emoji: embeddedFood.emoji,
          name: displayName,
          kcal,
          source: "manual" as const,
          sourceName: embeddedFood.name,
          kcalPer100g: embeddedFood.kcalPer100g,
          ...(embeddedFood.gramsPerUnit != null ? { gramsPerUnit: embeddedFood.gramsPerUnit } : {}),
        },
        ...prev,
      ]);
      trackRecentFood(
        embeddedFood.name,
        embeddedFood.emoji,
        embeddedFood.kcalPer100g,
        embeddedFood.gramsPerUnit
      );
      setRecentFoods(loadRecentFoods());
      return;
    }

    if (cachedKcalPer100g != null) {
      const grams = toGrams(cachedGramsPerUnit);
      const displayName = `${canonicalName} ${grams}g`;
      const kcal = Math.round((cachedKcalPer100g * grams) / 100);
      const isCustom = customMatch != null;
      updateFoods((prev) => [
        {
          id: itemId,
          emoji,
          name: displayName,
          kcal,
          source: isCustom ? "manual" as const : "usda" as const,
          sourceName: isCustom ? customMatch.name : (cached?.name ?? canonicalName),
          kcalPer100g: cachedKcalPer100g,
          gramsPerUnit: cachedGramsPerUnit,
        },
        ...prev,
      ]);
      trackRecentFood(canonicalName, emoji, cachedKcalPer100g, cachedGramsPerUnit);
      setRecentFoods(loadRecentFoods());
    } else {
      // Not cached: add loading item, fetch from USDA
      const loadingName = parsed.unit === "count"
        ? `${canonicalName} x${parsed.quantity}`
        : `${canonicalName} ${parsed.quantity}g`;
      updateFoods((prev) => [
        { id: itemId, emoji, name: loadingName, kcal: null, loading: true },
        ...prev,
      ]);

      fetchKcalPer100g(parsed.name).then((result) => {
        if (result != null) {
          const grams = toGrams(result.gramsPerUnit);
          const displayName = `${canonicalName} ${grams}g`;
          const kcal = Math.round((result.kcalPer100g * grams) / 100);
          updateFoods((prev) =>
            prev.map((f) =>
              f.id === itemId
                ? {
                    ...f,
                    name: displayName,
                    kcal,
                    loading: false,
                    source: "usda" as const,
                    sourceName: result.description,
                    kcalPer100g: result.kcalPer100g,
                    gramsPerUnit: result.gramsPerUnit,
                  }
                : f
            )
          );
          trackRecentFood(canonicalName, emoji, result.kcalPer100g, result.gramsPerUnit);
          setRecentFoods(loadRecentFoods());
        } else {
          // API failed — keep kcal null so it shows as "?"
          updateFoods((prev) =>
            prev.map((f) =>
              f.id === itemId
                ? { ...f, kcal: null, loading: false, source: "manual" as const, sourceName: canonicalName }
                : f
            )
          );
        }
      });
    }
  };

  const matchesFoodName = (name: string, query: string) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const n = name.toLowerCase();
    if (q.length === 1) {
      const words = n.match(/[a-z0-9]+/g) ?? [];
      return words.some((word) => word.startsWith(q));
    }
    return n.includes(q);
  };

  const queryActive = inputValue.trim().length > 0;
  const isFoodListEmpty = foods.length === 0;
  const emptyStateVariant = EMPTY_STATE_VARIANTS[emptyStateVariantIndex];
  const baseRecentFoods = recentFoods.filter(
    (rf) => !customFoods.some((cf) => cf.name.toLowerCase() === rf.name.toLowerCase())
  );
  const customMatches = customFoods.filter((food) => matchesFoodName(food.name, inputValue));
  const recentMatches = baseRecentFoods.filter((food) => matchesFoodName(food.name, inputValue));

  useEffect(() => {
    if (customMatches.length > 0) {
      setLastCustomMatch(customMatches[customMatches.length - 1]);
    }
  }, [customMatches]);

  useEffect(() => {
    if (recentMatches.length > 0) {
      setLastRecentMatch(recentMatches[recentMatches.length - 1]);
    }
  }, [recentMatches]);

  const fallbackCustom = lastCustomMatch && customFoods.some((f) => f.id === lastCustomMatch.id)
    ? lastCustomMatch
    : null;
  const fallbackRecent = lastRecentMatch && baseRecentFoods.some((f) => f.name === lastRecentMatch.name)
    ? lastRecentMatch
    : null;

  const customPillsToShow = queryActive
    ? (customMatches.length ? customMatches : fallbackCustom ? [fallbackCustom] : [])
    : customFoods;
  const recentPillsToShow = queryActive
    ? (recentMatches.length ? recentMatches : fallbackRecent ? [fallbackRecent] : [])
    : baseRecentFoods;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Backspace" && !inputValue) {
      if (selectedCustomFood) setSelectedCustomFood(null);
      if (selectedRecentFood) setSelectedRecentFood(null);
    }
  };

  /* ===========================
     Swipe handlers
     =========================== */

  const handleTouchStart = (e: React.TouchEvent, itemId: string) => {
    if (dragRef.current?.active) return;
    if (swipedItemId && swipedItemId !== itemId) {
      closeSwipe(swipedItemId);
      setSwipedItemId(null);
    }
    const touch = e.touches[0];
    swipeRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: 0,
      swiping: false,
      itemId,
    };

    // Start long press timer
    const timer = setTimeout(() => {
      if (!swipeRef.current?.swiping) {
        startDrag(itemId, touch.clientX, touch.clientY);
      }
    }, LONG_PRESS_MS);
    dragRef.current = {
      itemId,
      ghost: null,
      startX: touch.clientX,
      startY: touch.clientY,
      offsetX: 0,
      offsetY: 0,
      active: false,
      timer,
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];

    // If dragging, handle drag move
    if (dragRef.current?.active) {
      e.preventDefault();
      moveDrag(touch.clientX, touch.clientY);
      return;
    }

    if (!swipeRef.current) return;

    const dx = touch.clientX - swipeRef.current.startX;
    const dy = touch.clientY - swipeRef.current.startY;

    // Cancel long press if moved too much
    if (Math.abs(dx) > DRAG_MOVE_CANCEL || Math.abs(dy) > DRAG_MOVE_CANCEL) {
      if (dragRef.current?.timer) {
        clearTimeout(dragRef.current.timer);
        dragRef.current.timer = null;
      }
    }

    // Detect horizontal swipe
    if (!swipeRef.current.swiping && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
      swipeRef.current.swiping = true;
    }

    if (swipeRef.current.swiping) {
      // Only allow swiping left (negative dx)
      const offset = Math.min(0, dx + (swipedItemId === swipeRef.current.itemId ? -SWIPE_THRESHOLD : 0));
      swipeRef.current.currentX = offset;
      const el = itemRefsMap.current.get(swipeRef.current.itemId);
      if (el) {
        const content = el.querySelector(".kcals-food-item") as HTMLElement;
        if (content) {
          content.style.setProperty("--swipe-x", `${offset}px`);
          content.style.transition = "none";
        }
        const openDistance = SWIPE_THRESHOLD + 16;
        const progress = Math.min(1, Math.abs(offset) / openDistance);
        const scale = 0.5 + 0.5 * progress;
        el.style.setProperty("--delete-scale", scale.toString());
      }
    }
  };

  const handleTouchEnd = () => {
    // Cancel long press timer
    if (dragRef.current?.timer) {
      clearTimeout(dragRef.current.timer);
      dragRef.current.timer = null;
    }

    // If dragging, handle drag end
    if (dragRef.current?.active) {
      endDrag();
      return;
    }

    if (!swipeRef.current) return;

    const { swiping, currentX, itemId } = swipeRef.current;

    if (swiping) {
      const el = itemRefsMap.current.get(itemId);
      if (el) {
        const content = el.querySelector(".kcals-food-item") as HTMLElement;
        if (content) {
          content.style.transition = "transform 0.2s ease-out";
          if (currentX < -SWIPE_THRESHOLD / 2) {
            content.style.setProperty("--swipe-x", `-${SWIPE_THRESHOLD + 16}px`);
            setSwipedItemId(itemId);
            el.style.setProperty("--delete-scale", "1");
          } else {
            content.style.setProperty("--swipe-x", "0px");
            setSwipedItemId(null);
            el.style.setProperty("--delete-scale", "0.5");
          }
        }
      }
    } else {
      // Tap - close any open swipe
      if (swipedItemId && swipedItemId !== swipeRef.current.itemId) {
        closeSwipe(swipedItemId);
        setSwipedItemId(null);
      }
    }

    swipeRef.current = null;
  };

  const closeSwipe = (itemId: string) => {
    const el = itemRefsMap.current.get(itemId);
    if (el) {
      const content = el.querySelector(".kcals-food-item") as HTMLElement;
      if (content) {
        content.style.transition = "transform 0.2s ease-out";
        content.style.setProperty("--swipe-x", "0px");
      }
      el.style.setProperty("--delete-scale", "0.5");
    }
  };

  /* ===========================
     Delete / Edit food handlers
     =========================== */

  const handleDeleteFood = (itemId: string) => {
    updateFoods((prev) => prev.filter((f) => f.id !== itemId));
    setSwipedItemId(null);
  };

  const handleEditFood = (food: FoodItem) => {
    setSwipedItemId(null);
    closeSwipe(food.id);
    const parsed = parseFoodInput(food.name);
    setEditFoodName(parsed.name);
    setEditFoodGrams(parsed.quantity.toString());
    setEditFoodModal(food);
  };

  const handleSaveEditFood = () => {
    if (!editFoodModal) return;
    const name = editFoodName.trim();
    const grams = Number(editFoodGrams);
    if (!name || isNaN(grams) || grams <= 0) return;

    const displayName = `${name} ${grams}g`;
    const kcalPer100g = editFoodModal.kcalPer100g;
    const kcal = kcalPer100g != null
      ? Math.round((kcalPer100g * grams) / 100)
      : editFoodModal.kcal;

    updateFoods((prev) =>
      prev.map((f) =>
        f.id === editFoodModal.id ? { ...f, name: displayName, kcal } : f
      )
    );
    setEditFoodModal(null);
  };

  const handleDeleteEditFood = () => {
    if (!editFoodModal) return;
    updateFoods((prev) => prev.filter((f) => f.id !== editFoodModal.id));
    setEditFoodModal(null);
  };

  /* ===========================
     Drag & Drop
     =========================== */

  const startDrag = (itemId: string, x: number, y: number) => {
    // Vibrate if available
    if (navigator.vibrate) navigator.vibrate(50);

    // Close any open swipe
    if (swipedItemId) {
      closeSwipe(swipedItemId);
      setSwipedItemId(null);
    }

    const el = itemRefsMap.current.get(itemId);
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const ghost = document.createElement("div");
    ghost.className = "kcals-drag-ghost";
    ghost.innerHTML = el.innerHTML;
    ghost.style.width = `${rect.width}px`;
    ghost.style.height = `${rect.height}px`;
    ghost.style.left = `${rect.left}px`;
    ghost.style.top = `${rect.top}px`;
    document.body.appendChild(ghost);

    if (dragRef.current) {
      dragRef.current.ghost = ghost;
      dragRef.current.active = true;
      dragRef.current.offsetX = x - rect.left;
      dragRef.current.offsetY = y - rect.top;
    }

    setDragItemId(itemId);
    swipeRef.current = null; // Cancel any swipe
  };

  const moveDrag = (x: number, y: number) => {
    if (!dragRef.current?.ghost) return;

    const ghost = dragRef.current.ghost;
    ghost.style.left = `${x - dragRef.current.offsetX}px`;
    ghost.style.top = `${y - dragRef.current.offsetY}px`;

    // Find drop target
    const ghostRect = ghost.getBoundingClientRect();
    let bestTarget: string | null = null;

    itemRefsMap.current.forEach((el, id) => {
      if (id === dragRef.current?.itemId) return;
      const targetRect = el.getBoundingClientRect();
      const overlapTop = Math.max(ghostRect.top, targetRect.top);
      const overlapBottom = Math.min(ghostRect.bottom, targetRect.bottom);
      const overlap = Math.max(0, overlapBottom - overlapTop);
      if (overlap / targetRect.height > DROP_OVERLAP) {
        bestTarget = id;
      }
    });

    setDropTargetId(bestTarget);
  };

  const endDrag = () => {
    if (!dragRef.current) return;

    const { ghost, itemId } = dragRef.current;
    const targetId = dropTargetId;

    // Clean up ghost
    if (ghost) ghost.remove();
    dragRef.current = null;
    setDragItemId(null);
    setDropTargetId(null);

    if (!targetId) return;

    // Find source and target items
    updateFoods((prev) => {
      const sourceIdx = prev.findIndex((f) => f.id === itemId);
      const targetIdx = prev.findIndex((f) => f.id === targetId);
      if (sourceIdx === -1 || targetIdx === -1) return prev;

      const source = prev[sourceIdx];
      const target = prev[targetIdx];

      // Remove source from list
      const without = prev.filter((_, i) => i !== sourceIdx);
      // Adjust target index after removal
      const adjTargetIdx = without.findIndex((f) => f.id === targetId);

        if (isGroup(target)) {
          // Add source to existing group
          const updatedGroup: FoodItem = {
            ...target,
            items: [...(target.items ?? []), ...(isGroup(source) ? source.items! : [source])],
          };
          updatedGroup.kcal = groupKcal(updatedGroup);
        const result = [...without];
        result[adjTargetIdx] = updatedGroup;
        // Open group modal
        setTimeout(() => {
          setGroupName(updatedGroup.name);
          setGroupModal(updatedGroup);
        }, 50);
        return result;
        } else {
          // Create new group
          const sourceItems = isGroup(source) ? source.items! : [source];
          const newGroup: FoodItem = {
            id: Date.now().toString(),
            emoji: target.emoji,
            name: "New Group",
            kcal: (target.kcal ?? 0) + sourceItems.reduce((s, i) => s + (i.kcal ?? 0), 0),
            items: [target, ...sourceItems],
            portionPercent: 100,
          };
        const result = [...without];
        result[adjTargetIdx] = newGroup;
        // Open group modal
        setTimeout(() => {
          setGroupName(newGroup.name);
          setGroupModal(newGroup);
        }, 50);
        return result;
      }
    });
  };

  /* ===========================
     Group modal handlers
     =========================== */

  const openGroupModal = (group: FoodItem) => {
    setGroupName(group.name);
    setGroupModal(group);
    setPortionValue(group.portionPercent ?? 100);
  };

  useEffect(() => {
    if (groupModal) {
      setGroupView("list");
      setPortionValue(groupModal.portionPercent ?? 100);
    }
  }, [groupModal?.id]);

  const handleSaveGroupName = (name: string) => {
    if (!groupModal) return;
    setGroupName(name);
    updateFoods((prev) =>
      prev.map((f) =>
        f.id === groupModal.id ? { ...f, name } : f
      )
    );
    setGroupModal((g) => (g ? { ...g, name } : null));
  };

  const handleRemoveFromGroup = (childId: string) => {
    if (!groupModal) return;

    let shouldClose = false;
    updateFoods((prev) => {
      const idx = prev.findIndex((f) => f.id === groupModal.id);
      if (idx === -1) return prev;
      const group = prev[idx];
      if (!group.items) return prev;

      const removed = group.items.find((i) => i.id === childId);
      const remaining = group.items.filter((i) => i.id !== childId);

      if (remaining.length <= 1) {
        // Ungroup: replace group with remaining item(s) + removed item
        const result = [...prev];
        result.splice(idx, 1, ...remaining, ...(removed ? [removed] : []));
        shouldClose = true;
        return result;
      }

      const updatedGroup: FoodItem = {
        ...group,
        items: remaining,
        emoji: remaining[0].emoji,
        kcal: remaining.reduce((s, i) => s + (i.kcal ?? 0), 0),
      };
      const result = [...prev];
      result[idx] = updatedGroup;
      // Put removed item back in list
      if (removed) result.push(removed);
      setGroupModal(updatedGroup);
      return result;
    });
    if (shouldClose) {
      setGroupModal(null);
    }
  };

  const handleDeleteGroup = () => {
    if (!groupModal) return;
    // Ungroup: replace group with its items
    updateFoods((prev) => {
      const idx = prev.findIndex((f) => f.id === groupModal.id);
      if (idx === -1) return prev;
      const group = prev[idx];
      const items = group.items ?? [];
      const result = [...prev];
      result.splice(idx, 1, ...items);
      return result;
    });
    setGroupModal(null);
  };

  const handleUpdateGroupPortion = () => {
    if (!groupModal) return;
    const percent = portionValue;
    updateFoods((prev) =>
      prev.map((f) =>
        f.id === groupModal.id
          ? { ...f, portionPercent: percent }
          : f
      )
    );
    setGroupModal((g) => (g ? { ...g, portionPercent: percent } : g));
    setGroupView("list");
  };

  const getPortionLabel = (value: number) => {
    if (value === 25) return "1/4";
    if (value === 33) return "1/3";
    if (value === 50) return "1/2";
    if (value === 100) return "All";
    return `${value}%`;
  };

  const getPortionSpriteIndex = (value: number) => {
    if (value < 20) return 5;
    if (value < 40) return 4;
    if (value < 60) return 3;
    if (value < 89) return 2;
    return 1;
  };

  useEffect(() => {
    const next = portionHeroSources[portionTab] ?? portionHeroSources[0];
    if (next === portionHero) return;
    setPortionHeroPrev(portionHero || null);
    setPortionHero(next);
    setPortionHeroAnimating(true);
    setPortionHeroAnimKey((k) => k + 1);
    const timer = setTimeout(() => {
      setPortionHeroPrev(null);
      setPortionHeroAnimating(false);
    }, 260);
    return () => clearTimeout(timer);
  }, [portionTab, portionHero]);

  const updatePortionFromPointer = (clientX: number) => {
    const el = portionSliderRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.min(Math.max(clientX - rect.left, 0), rect.width);
    const nextValue = Math.round((x / rect.width) * 100);
    const nearest = portionSnapPoints.reduce((best, point) =>
      Math.abs(point - nextValue) < Math.abs(best - nextValue) ? point : best
    , portionSnapPoints[0]);
    const snapped = Math.abs(nearest - nextValue) <= PORTION_SNAP_THRESHOLD ? nearest : nextValue;
    setPortionValue(snapped);
  };

  const updatePortionTooltipPosition = useCallback(() => {
    const sliderEl = portionSliderRef.current;
    const rangeEl = portionRangeRef.current;
    const tooltipEl = portionTooltipRef.current;
    if (!sliderEl || !rangeEl || !tooltipEl) return;
    const sliderRect = sliderEl.getBoundingClientRect();
    const rangeRect = rangeEl.getBoundingClientRect();
    const tooltipRect = tooltipEl.getBoundingClientRect();
    const centerX = rangeRect.left + (rangeRect.width * (portionValue / 100));
    let left = centerX - sliderRect.left;
    const min = tooltipRect.width / 2;
    const max = sliderRect.width - tooltipRect.width / 2;
    left = Math.min(Math.max(left, min), max);
    setPortionTooltipX((prev) => (prev != null && Math.abs(prev - left) < 0.5 ? prev : left));
  }, [portionValue]);

  useEffect(() => {
    if (groupView !== "portion") return;
    const raf = requestAnimationFrame(updatePortionTooltipPosition);
    const handleResize = () => updatePortionTooltipPosition();
    window.addEventListener("resize", handleResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", handleResize);
    };
  }, [groupView, portionValue, updatePortionTooltipPosition]);

  /* ===========================
     Close swipe on tap outside
     =========================== */

  const handleContentClick = () => {
    if (swipedItemId) {
      closeSwipe(swipedItemId);
      setSwipedItemId(null);
    }
  };

  /* ===========================
     Render helpers
     =========================== */

  const renderFoodRow = (food: FoodItem) => {
    const group = isGroup(food);
    const kcal = groupKcal(food);
    const rawGroupKcal = group ? groupKcalRaw(food) : 0;
    const groupPercent = group ? (food.portionPercent ?? 100) : 100;
    const showGroupPercent = group && groupPercent !== 100;
    const imageUrl = food.imageId ? (imageUrls[food.imageId] ?? food.image) : food.image;

    return (
      <div
        key={food.id}
        className={`kcals-swipeable${swipedItemId === food.id ? " kcals-swipe-open" : ""}${dropTargetId === food.id ? " kcals-drop-target" : ""}${dragItemId === food.id ? " kcals-dragging" : ""}`}
        ref={(el) => {
          if (el) itemRefsMap.current.set(food.id, el);
          else itemRefsMap.current.delete(food.id);
        }}
        onTouchStart={(e) => handleTouchStart(e, food.id)}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className={`kcals-food-item${group ? " kcals-group-item" : ""}`}
          onClick={group ? () => openGroupModal(food) : () => handleEditFood(food)}
        >
          <div className="kcals-food-emoji">
            {imageUrl ? (
              <img src={imageUrl} alt="" className="kcals-food-image" />
            ) : (
              food.emoji
            )}
            {group && food.items!.length > 1 && (
              <span className="kcals-group-badge">{food.items!.length}</span>
            )}
          </div>
          <div className={`kcals-food-name${food.loading ? " loading" : ""}`}>
            {food.name}
          </div>
          <div className={`kcals-food-kcal${!group && food.kcal == null && !food.loading ? " kcals-food-kcal-unknown" : ""}`}>
            {food.loading ? (
              <div className="kcals-food-loading-dots">
                <span /><span /><span />
              </div>
            ) : !group && food.kcal == null ? "? kcal" : group && showGroupPercent
              ? `+ ${kcal.toLocaleString()}kcal (${groupPercent}%)`
              : `+ ${kcal.toLocaleString()}kcal`}
          </div>
        </div>
        <div className="kcals-swipe-actions">
          <button
            className="kcals-swipe-delete"
            onClick={() => group ? handleDeleteFood(food.id) : handleDeleteFood(food.id)}
            type="button"
          >
            <DeleteItemIcon />
          </button>
        </div>
      </div>
    );
  };

  const renderWeeklyCardContent = () => {
    if (!weeklyHasData) {
      return (
        <>
          <div className="kcals-weekly-emoji">{"\u26C5"}</div>
          <div className="kcals-weekly-title">Keep logging</div>
          <div className="kcals-weekly-subtitle">
            You will see the breakdown once you start logging in calories
          </div>
        </>
      );
    }

    return (
      <>
        <div className="kcals-weekly-emoji">
          {weeklyIsOnTrack ? "\u{1F525}" : "\u{1F437}"}
        </div>
        <div className="kcals-weekly-title">
          {weeklyIsOnTrack ? "You're on track!" : "Watch out!"}
        </div>
        <div className="kcals-weekly-list">
          {weeklyVisibleEntries.map((entry) => {
            const under = entry.remaining >= 0;
            const abs = Math.abs(entry.remaining);
            const d = new Date(entry.dateKey + "T00:00:00");
            const label = new Intl.DateTimeFormat("en-US", {
              month: "short",
              day: "numeric",
            }).format(d);
            return (
              <div key={entry.dateKey} className="kcals-weekly-row">
                <div className="kcals-weekly-date">
                  <span>{under ? "\u{1F525}" : "\u{1F437}"}</span>
                  {label}
                </div>
                <div className={`kcals-weekly-value ${under ? "kcals-weekly-under" : "kcals-weekly-over"}`}>
                  {under ? `- ${abs.toLocaleString()} kcal` : `+ ${abs.toLocaleString()} kcal`}
                </div>
              </div>
            );
          })}
        </div>
        <div className="kcals-weekly-summary">
          Over the last 7 days you ate<br />
          <strong>{weeklyAbsTotal.toLocaleString()} kcal</strong> {weeklyIsOnTrack ? "less" : "over"} than the limit
        </div>
      </>
    );
  };

  return (
    <>
    <div className={`kcals-content${inputFocused ? " is-focused" : ""}`} onClick={handleContentClick} ref={contentRef}>
      <div className={`kcals-shader-bg${inputFocused ? " is-hidden" : ""}`} aria-hidden="true">
        <SmokeRing
          speed={0.9}
          scale={1.25}
          thickness={0.7}
          radius={0.24}
          innerShape={0.7}
          noiseScale={3}
          noiseIterations={8}
          offsetX={0}
          offsetY={0.94}
          frame={334878.6819999591}
          colors={shaderColors}
          colorBack="#00000000"
          minPixelRatio={1}
          style={{ backgroundColor: "#FEFDFB", width: "100%", height: "100%" }}
        />
      </div>
      {!inputFocused && (
        <div className="kcals-main">
          {/* Top Bar */}
          <div className={`kcals-topbar${isCompact ? " is-compact" : ""}`}>
            <div className="kcals-topbar-left">
              {supabase && (
                user ? (
                  <button
                    className="kcals-chip kcals-avatar-btn"
                    type="button"
                    onClick={handleOpenAccountOrAuthModal}
                  >
                    <span className="kcals-avatar-inner">
                      {showAvatarPhoto ? (
                        <img src={avatarPhoto ?? ""} alt="" />
                      ) : (
                        avatarEmojiDisplay
                      )}
                    </span>
                  </button>
                ) : (
                  <button
                    className="kcals-chip kcals-chip-btn"
                    type="button"
                    onClick={handleOpenAccountOrAuthModal}
                  >
                    <span className="kcals-chip-icon">{"\u{1F512}"}</span>
                    Sign in
                  </button>
                )
              )}
              <div className="kcals-chip">
                <span className="kcals-chip-icon">{"\u{1F5D3}\uFE0F"}</span>
                {todayLabel}
              </div>
            </div>
            <div className="kcals-topbar-right">
              <div className="kcals-chip">
                <span className="kcals-chip-icon">{"\u26A1\uFE0F"}</span>
                {streak}
              </div>
              <button className="kcals-chip kcals-chip-btn" type="button" onClick={() => setShowWeeklyModal(true)}>
                <span className="kcals-chip-icon">
                  {weeklyBreakdown.some((e) => calorieGoal - e.remaining >= 800) ? "\u{1F525}" : "\u231B\uFE0F"}
                </span>
                {weeklyBreakdown.some((e) => calorieGoal - e.remaining >= 800) ? formatCompact(weeklyBurn) : "0"}
              </button>
            </div>
            <div className="kcals-topbar-compact">
              <span className="kcals-topbar-compact-value">{totalKcal} kcal</span>
              <span className={`kcals-topbar-compact-remaining${remainingIsNegative ? " is-negative" : ""}`}>
                {remainingPrefix}
                {remaining.toLocaleString()} remaining
              </span>
            </div>
          </div>

          {/* Calorie Display */}
		          <div
		            className={`kcals-calorie-display${isCompact ? " is-hidden" : ""}`}
		            onClick={handleOpenAccountOrAuthModal}
		            role="button"
		            tabIndex={0}
		            onKeyDown={(e) => {
		              if (e.key === "Enter" || e.key === " ") {
		                e.preventDefault();
		                handleOpenAccountOrAuthModal();
		              }
		            }}
		          >
            <div className="kcals-calorie-number">
              <span className="kcals-calorie-value">{totalKcal}</span>
              <span className="kcals-calorie-unit">kcal</span>
            </div>
            <p className={`kcals-calorie-remaining${remainingIsNegative ? " is-negative" : ""}`}>
              <strong>
                {remainingPrefix}
                {remaining.toLocaleString()}kcal
              </strong>
              <span> remaining</span>
            </p>
          </div>

	          {/* Food List / Empty State */}
		          {isFoodListEmpty ? (
		            <div className="kcals-empty-state">
		              <div
                    key={`empty-variant-${emptyStateVariantIndex}`}
                    className="kcals-empty-state-content"
                    onPointerDown={rotateEmptyStateVariant}
                  >
		                <div className="kcals-empty-state-emoji">{emptyStateVariant.emoji}</div>
		                <div className="kcals-empty-state-title">{emptyStateVariant.title}</div>
		                <div className="kcals-empty-state-text">
		                  {emptyStateVariant.text}
		                </div>
		              </div>
	              <div className="kcals-empty-chip-list kcals-pills">
	                {EMPTY_STATE_QUICK_CHIPS.map((chip) => (
	                  <button
	                    key={chip.label}
	                    className="kcals-pill"
	                    type="button"
	                    onPointerDown={(e) => e.preventDefault()}
	                    onClick={() => handleEmptyStateChipTap(chip)}
	                  >
	                    <span className="kcals-pill-emoji" aria-hidden="true">{chip.emoji}</span>
	                    <span className="kcals-pill-label">{chip.label}</span>
	                  </button>
	                ))}
	              </div>
	            </div>
	          ) : (
	            <>
	              <div className="kcals-section-header">
	                <span>Food list ({foods.length})</span>
	                {foods.some((f) => f.loading) && (
	                  <span className="kcals-status-text">Fetching from USDA</span>
	                )}
	              </div>
	              <div className="kcals-food-list">
	                {foods.map(renderFoodRow)}
	              </div>
	            </>
	          )}
	        </div>
	      )}

      {/* Suggestions Panel */}
      {inputFocused && (
        <div className="kcals-suggestions" ref={suggestionsScrollRef}>
          <div
            className="kcals-suggestions-dismiss"
            onClick={dismissSuggestions}
          />
          <div className="kcals-suggestions-content">
            <div className="kcals-suggestion-section">
              <div className="kcals-suggestion-header">
                <span>Custom Food</span>
                <button
                  className="kcals-add-btn"
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={handleAddCustomFood}
                  type="button"
                >
                  <PlusIcon />
                </button>
              </div>
              {customFoods.length > 0 && (
                <div className="kcals-pills">
                  {customPillsToShow.map((food) => (
                    <button
                      key={food.id}
                      className="kcals-pill"
                      onPointerDown={(e) => {
                        e.preventDefault();
                        handlePillPointerDown("custom", food, e);
                      }}
                      onPointerMove={handlePillPointerMove}
                      onPointerUp={handlePillPointerEnd}
                      onPointerCancel={handlePillPointerEnd}
                      onClick={() => {
                        if (!pillLongPressRef.current.triggered) {
                          handleCustomPillTap(food);
                        }
                      }}
                      type="button"
                    >
                      {(food.imageId ? (imageUrls[food.imageId] ?? food.image) : food.image) ? (
                        <img
                          src={food.imageId ? (imageUrls[food.imageId] ?? food.image) : food.image}
                          alt=""
                          className="kcals-pill-image"
                        />
	                      ) : (
	                        <span className="kcals-pill-emoji">{"\u{1F4E6}"}</span>
	                      )}
	                      <span className="kcals-pill-label">{food.name}</span>
	                    </button>
	                  ))}
	                </div>
              )}
            </div>

            {baseRecentFoods.length > 0 && (
              <div className="kcals-suggestion-section">
                <div className="kcals-suggestion-header">
                  <span>Frequently Used</span>
                </div>
                <div className="kcals-pills">
                  {recentPillsToShow.map((food) => (
                    <button
                      key={food.name}
                      className="kcals-pill"
                      onPointerDown={(e) => {
                        e.preventDefault();
                        handlePillPointerDown("recent", food, e);
                      }}
                      onPointerMove={handlePillPointerMove}
                      onPointerUp={handlePillPointerEnd}
                      onPointerCancel={handlePillPointerEnd}
                      onClick={() => {
                        if (!pillLongPressRef.current.triggered) {
                          handlePillTap(food);
                        }
                      }}
                      type="button"
	                    >
	                      <span className="kcals-pill-emoji">{food.emoji}</span>
	                      <span className="kcals-pill-label">{food.name}</span>
	                    </button>
	                  ))}
	                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Input Bar */}
      <div className="kcals-input-bar">
        <div className="kcals-input-wrapper">
          {(selectedCustomFood || selectedRecentFood) && (
            <span className={`kcals-input-tag${selectedCustomFood ? " kcals-input-tag--custom" : ""}`}>
              {selectedCustomFood?.name ?? selectedRecentFood?.name}
            </span>
          )}
          <input
            ref={inputRef}
            className="kcals-input"
            type="text"
            placeholder={selectedCustomFood || selectedRecentFood ? "100g" : "Type what you ate..."}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
            enterKeyHint="send"
          />
          {inputValue || selectedCustomFood || selectedRecentFood ? (
            <button className="kcals-submit-btn" type="button" onPointerDown={(e) => e.preventDefault()} onClick={handleSubmit}>
              <ArrowUpIcon />
            </button>
          ) : (
            <button className="kcals-input-action" type="button">
              <MicIcon />
            </button>
          )}
        </div>
      </div>

      {/* Chip Context Menu */}
      {(chipMenu || closingChipMenu) && (
        <div
          className={`kcals-chip-menu-overlay${closingChipMenu ? ' kcals-closing' : ''}`}
          onPointerDown={handleChipMenuClose}
        >
          <div
            className="kcals-chip-menu"
            style={{
              left: chipMenu?.x ?? 0,
              top: (chipMenu?.y ?? 0) + 8,
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <button className="kcals-chip-menu-item" onClick={handleChipMenuInsert} type="button">
              Insert
            </button>
            {chipMenu?.type === "custom" && (
              <button className="kcals-chip-menu-item" onClick={handleChipMenuEdit} type="button">
                Edit
              </button>
            )}
            <button
              className="kcals-chip-menu-item kcals-chip-menu-danger"
              onClick={chipMenu?.type === "custom" ? handleChipMenuRemoveCustom : handleChipMenuRemoveRecent}
              type="button"
            >
              Remove
            </button>
          </div>
        </div>
      )}
    </div>

      {/* Custom Food Modal */}
      <BottomSheet open={showModal} onClose={handleCloseModal}>
        <div className="kcals-modal-handle" />
        {editingFood && (
          <button
            className="kcals-modal-delete"
            onClick={handleDeleteCustomFood}
            type="button"
          >
            <TrashIcon />
          </button>
        )}
        <div
          className={modalImageUrl ? "kcals-modal-image-wrapper" : "kcals-modal-camera"}
          onClick={() => fileInputRef.current?.click()}
          style={{ cursor: "pointer" }}
        >
          {modalImageUrl ? (
            <img src={modalImageUrl} alt="" className="kcals-modal-camera-image" />
          ) : (
            <CameraIcon />
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          style={{ display: "none" }}
        />
        <div className="kcals-modal-fields">
          <div className="kcals-modal-field">
            <input
              className="kcals-modal-input"
              type="text"
              value={modalName}
              onChange={(e) => setModalName(e.target.value)}
              placeholder="Food name"
            />
          </div>
          <div className="kcals-modal-field">
            <div className="kcals-modal-kcal-row">
              <input
                className="kcals-modal-input"
                type="number"
                value={modalKcal}
                onChange={(e) => setModalKcal(e.target.value)}
                placeholder="0"
                inputMode="numeric"
              />
              <span className="kcals-modal-kcal-suffix">kcal</span>
            </div>
          </div>
        </div>
        <button
          className="kcals-modal-submit"
          onClick={handleSaveCustomFood}
          type="button"
        >
          {editingFood ? "Update" : "Add"}
        </button>
      </BottomSheet>

      {/* Edit Food Modal */}
      <BottomSheet open={!!editFoodModal} onClose={() => setEditFoodModal(null)}>
        <div className="kcals-modal-handle" />
        <div className={(editFoodModal?.imageId ? (imageUrls[editFoodModal.imageId] ?? editFoodModal?.image) : editFoodModal?.image) ? "kcals-modal-image-wrapper" : "kcals-modal-camera"}>
          {(editFoodModal?.imageId ? (imageUrls[editFoodModal.imageId] ?? editFoodModal?.image) : editFoodModal?.image) ? (
            <img
              src={editFoodModal?.imageId ? (imageUrls[editFoodModal.imageId] ?? editFoodModal?.image) : editFoodModal?.image}
              alt=""
              className="kcals-modal-camera-image"
            />
          ) : (
            <span style={{ fontSize: 60 }}>{editFoodModal?.emoji}</span>
          )}
        </div>
        <div className="kcals-modal-fields">
          <div className="kcals-modal-field">
            <input
              className="kcals-modal-input"
              type="text"
              value={editFoodName}
              onChange={(e) => setEditFoodName(e.target.value)}
              placeholder="Food name"
            />
          </div>
          <div className="kcals-modal-field">
            <div className="kcals-modal-kcal-row">
              <input
                className="kcals-modal-input"
                type="number"
                value={editFoodGrams}
                onChange={(e) => setEditFoodGrams(e.target.value)}
                placeholder="100"
                inputMode="numeric"
              />
              <span className="kcals-modal-kcal-suffix">g</span>
            </div>
          </div>
        </div>
        {editFoodModal?.source && editFoodModal.kcalPer100g != null && (
          <div className="kcals-modal-source">
            {editFoodModal.source === "usda" ? "USDA" : "Manual"}
            {editFoodModal.sourceName ? ` \u2013 ${editFoodModal.sourceName}` : ""}
            {` \u2013 ${Math.round(editFoodModal.kcalPer100g)}kcal per 100g`}
          </div>
        )}
        <button
          className="kcals-modal-submit"
          onClick={handleSaveEditFood}
          type="button"
        >
          Update
        </button>
      </BottomSheet>

      {/* Group Modal */}
      <BottomSheet open={!!groupModal} onClose={() => setGroupModal(null)} className="kcals-group-modal">
        <div className="kcals-modal-handle" />
        {groupView === "list" ? (
          <>
            <div className="kcals-group-emoji">
              {groupModal?.emoji}
            </div>
            <input
              className="kcals-group-name-input"
              type="text"
              value={groupName}
              onChange={(e) => handleSaveGroupName(e.target.value)}
              placeholder="Group name"
            />
            <div className="kcals-group-header">
              <span className="kcals-group-header-title">Group items ({groupModal?.items?.length ?? 0})</span>
              <span className="kcals-group-header-total">
                +{groupModal ? groupKcal(groupModal).toLocaleString() : 0}kcal
                {groupModal && (groupModal.portionPercent ?? 100) !== 100
                  ? ` (of ${groupKcalRaw(groupModal).toLocaleString()}kcal)`
                  : ""}
              </span>
              <button className="kcals-group-header-link" type="button" onClick={() => setGroupView("portion")}>
                {(groupModal?.portionPercent ?? 100).toString()}%
              </button>
            </div>
            <div className="kcals-group-list">
              {groupModal?.items?.map((item) => (
                <div key={item.id} className="kcals-group-list-item">
                  <div className="kcals-food-emoji">
                    {(item.imageId ? (imageUrls[item.imageId] ?? item.image) : item.image) ? (
                      <img
                        src={item.imageId ? (imageUrls[item.imageId] ?? item.image) : item.image}
                        alt=""
                        className="kcals-food-image"
                      />
                    ) : (
                      item.emoji
                    )}
                  </div>
                  <div className="kcals-food-name">{item.name}</div>
                  <div className="kcals-food-kcal">
                    + {(item.kcal ?? 0).toLocaleString()}kcal
                  </div>
                  <button
                    className="kcals-group-remove-btn"
                    onClick={() => handleRemoveFromGroup(item.id)}
                    type="button"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="kcals-portion-view">
            <div className="kcals-portion-header">
              <button
                className="kcals-portion-back"
                type="button"
                onClick={() => setGroupView("list")}
                aria-label="Back"
              >
                <img src="/kcals/assets/back.svg" alt="" />
              </button>
              <div className="kcals-portion-title">How much did you eat?</div>
              <div className="kcals-portion-spacer" />
            </div>
            <div className="kcals-portion-hero">
              {portionHeroPrev && (
                <div
                  key={`prev-${portionHeroAnimKey}`}
                  className={`kcals-portion-hero-image is-prev${portionHeroAnimating ? " is-exiting" : ""}`}
                  aria-hidden="true"
                  style={{
                    backgroundImage: `url(${portionHeroPrev})`,
                    ["--sprite-x" as never]: `${-(getPortionSpriteIndex(portionValue) - 1) * 224}px`,
                  }}
                />
              )}
              <div
                key={`curr-${portionHeroAnimKey}`}
                className={`kcals-portion-hero-image${portionHeroAnimating ? " is-entering" : ""}${portionHero ? "" : " is-placeholder"}`}
                aria-hidden="true"
                style={{
                  backgroundImage: portionHero ? `url(${portionHero})` : "none",
                  ["--sprite-x" as never]: `${-(getPortionSpriteIndex(portionValue) - 1) * 224}px`,
                }}
              />
            </div>
            <div className="kcals-portion-tabs">
              {[
                "/kcals/assets/plate.png",
                "/kcals/assets/pot.png",
                "/kcals/assets/bakeware.png",
                "/kcals/assets/piece.png",
              ].map((src, index) => (
                <button
                  key={src}
                  className={`kcals-portion-tab${portionTab === index ? " is-active" : ""}${portionTabPressed === index ? " is-pressed" : ""}`}
                  type="button"
                  onClick={() => setPortionTab(index)}
                  onPointerDown={() => setPortionTabPressed(index)}
                  onPointerUp={() => setPortionTabPressed(null)}
                  onPointerCancel={() => setPortionTabPressed(null)}
                  onPointerLeave={() => setPortionTabPressed(null)}
                >
                  <img src={src} alt="" />
                </button>
              ))}
            </div>
            <div
              className="kcals-portion-slider"
              ref={portionSliderRef}
              style={{ ["--portion" as never]: `${portionValue}%` }}
              onPointerDown={(e) => {
                portionDraggingRef.current = true;
                updatePortionFromPointer(e.clientX);
                e.currentTarget.setPointerCapture(e.pointerId);
                e.preventDefault();
              }}
              onPointerMove={(e) => {
                if (!portionDraggingRef.current) return;
                updatePortionFromPointer(e.clientX);
              }}
              onPointerUp={(e) => {
                portionDraggingRef.current = false;
                e.currentTarget.releasePointerCapture(e.pointerId);
              }}
              onPointerCancel={(e) => {
                portionDraggingRef.current = false;
                e.currentTarget.releasePointerCapture(e.pointerId);
              }}
            >
              <div
                className="kcals-portion-tooltip"
                ref={portionTooltipRef}
                style={{ left: portionTooltipX != null ? `${portionTooltipX}px` : undefined }}
              >
                {getPortionLabel(portionValue)}
              </div>
              <input
                className="kcals-portion-range"
                ref={portionRangeRef}
                type="range"
                min={0}
                max={100}
                value={portionValue}
                onChange={(e) => {
                  const raw = Number(e.target.value);
                  const nearest = portionSnapPoints.reduce((best, point) =>
                    Math.abs(point - raw) < Math.abs(best - raw) ? point : best
                  , portionSnapPoints[0]);
                  const snapped = Math.abs(nearest - raw) <= PORTION_SNAP_THRESHOLD ? nearest : raw;
                  setPortionValue(snapped);
                }}
              />
            </div>
            <button
              className={`kcals-portion-cta${portionCtaPressed ? " is-pressed" : ""}`}
              type="button"
              onPointerDown={() => setPortionCtaPressed(true)}
              onPointerUp={() => setPortionCtaPressed(false)}
              onPointerCancel={() => setPortionCtaPressed(false)}
              onPointerLeave={() => setPortionCtaPressed(false)}
              onClick={handleUpdateGroupPortion}
            >
              Update
            </button>
          </div>
        )}
      </BottomSheet>

	      {/* Profile Modal */}
	      <BottomSheet open={showProfileModal} onClose={() => setShowProfileModal(false)} variant="center">
	        <div className="kcals-profile-modal">
          <div className="kcals-profile-avatar">
            {avatarMode === "emoji" ? (
              <input
                className="kcals-profile-emoji-input"
                type="text"
                value={avatarEmojiDisplay}
                onChange={handleAvatarEmojiChange}
                onFocus={(e) => e.currentTarget.select()}
                inputMode="text"
                aria-label="Emoji avatar"
              />
            ) : (
              <button
                className={`kcals-profile-photo-btn${avatarPhoto ? " has-photo" : ""}`}
                type="button"
                onClick={handleAvatarPhotoPick}
                aria-label="Choose avatar photo"
              >
                {avatarPhoto ? (
                  <img src={avatarPhoto} alt="" />
                ) : (
                  <span className="kcals-profile-photo-icon" aria-hidden="true" />
                )}
              </button>
            )}
          </div>
          <div className="kcals-profile-tabs">
            <button
              className={`kcals-profile-tab${avatarMode === "emoji" ? " is-active" : ""}`}
              type="button"
              onClick={() => setAvatarMode("emoji")}
              aria-pressed={avatarMode === "emoji"}
            >
              <span className="kcals-profile-tab-icon kcals-profile-tab-icon--emoji" aria-hidden="true" />
            </button>
            <button
              className={`kcals-profile-tab${avatarMode === "photo" ? " is-active" : ""}`}
              type="button"
              onClick={() => setAvatarMode("photo")}
              aria-pressed={avatarMode === "photo"}
            >
              <span className="kcals-profile-tab-icon kcals-profile-tab-icon--photo" aria-hidden="true" />
            </button>
	          </div>
	          <div className="kcals-profile-email">{user?.email ?? "Account"}</div>
            <div className="kcals-profile-settings">
              <div className="kcals-profile-settings-row">
                <span className="kcals-profile-settings-label">Calorie limit (kcal)</span>
                <input
                  className="kcals-profile-settings-input"
                  type="number"
                  value={calorieGoalInput}
                  onChange={(e) => setCalorieGoalInput(e.target.value)}
                  onBlur={(e) => commitCalorieGoal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.currentTarget.blur();
                    }
                  }}
                  placeholder={DEFAULT_CALORIE_GOAL.toString()}
                  inputMode="numeric"
                />
              </div>
              <div className="kcals-profile-settings-row">
                <span className="kcals-profile-settings-label">Day resets at</span>
                <select
                  className="kcals-profile-settings-input"
                  value={dayStartHour}
                  onChange={(e) => handleDayStartHourChange(Number(e.target.value))}
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {String(i).padStart(2, "0")}:00
                    </option>
                  ))}
                </select>
              </div>
              <div className="kcals-profile-settings-row">
                <span className="kcals-profile-settings-label">Sync automatically</span>
                <button
                  className={`kcals-toggle${autoSyncEnabled ? " is-on" : ""}`}
                  type="button"
                  onClick={toggleAutoSync}
                  aria-pressed={autoSyncEnabled}
                >
                  <span className="kcals-toggle-thumb" />
                </button>
              </div>
              {!autoSyncEnabled && (
                <div className="kcals-profile-sync-row">
                  <span className="kcals-profile-sync-last">Last sync {lastSyncRelative}</span>
                  <button
                    className="kcals-settings-link"
                    type="button"
                    onClick={handleSyncNow}
                    disabled={syncStatus === "syncing"}
                  >
                    {syncStatus === "syncing" ? "Syncing..." : "Sync now"}
                  </button>
                </div>
              )}
              {syncError && <div className="kcals-settings-error">{syncError}</div>}
            </div>
	          <button className="kcals-profile-link" type="button" onClick={handleSignOut}>
	            Log out
	          </button>
          <input
            ref={avatarPhotoInputRef}
            className="kcals-profile-photo-input"
            type="file"
            accept="image/*"
            onChange={handleAvatarPhotoChange}
          />
        </div>
      </BottomSheet>

      {/* Auth Modal */}
      <BottomSheet open={showAuthModal} onClose={() => setShowAuthModal(false)} variant="center">
        <div className="kcals-auth-modal">
          <div className="kcals-auth-title">Cloud Sync</div>
          <div className="kcals-auth-subtitle">
            {user ? "Manage your sync settings." : "Sign in to sync your data across devices."}
          </div>
          {user ? (
            <>
              <div className="kcals-auth-row">Signed in as</div>
              <div className="kcals-auth-email">{user.email ?? "Account"}</div>
              <button
                className="kcals-modal-submit"
                type="button"
                onClick={handleSyncNow}
                disabled={syncStatus === "syncing"}
              >
                {syncStatus === "syncing" ? "Syncing..." : "Sync now"}
	              </button>
	              {syncError && <div className="kcals-auth-error">{syncError}</div>}
	              {lastSyncAt && <div className="kcals-auth-hint">Last synced {lastSyncRelative}</div>}
	              <button className="kcals-auth-secondary" type="button" onClick={handleSignOut}>
	                Sign out
	              </button>
            </>
          ) : (
            <>
              {authStep === "email" ? (
                <>
                  <input
                    className="kcals-modal-input"
                    type="email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="Email address"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSendMagicLink();
                      }
                    }}
                  />
                  <button
                    className="kcals-modal-submit"
                    type="button"
                    onClick={handleSendMagicLink}
                    disabled={authStatus === "sending"}
                  >
                    {authStatus === "sending" ? "Sending..." : "Send code"}
                  </button>
                  {authStatus === "sent" && (
                    <div className="kcals-auth-hint">Check your email for the 8-digit code.</div>
                  )}
                </>
              ) : (
                <>
                  <div className="kcals-auth-inline">
                    <span className="kcals-auth-row">Code sent to</span>
                    <button
                      className="kcals-auth-link"
                      type="button"
                      onClick={() => {
                        setAuthStep("email");
                        setAuthStatus("idle");
                        setAuthError(null);
                        setAuthOtp("");
                      }}
                    >
                      Change
                    </button>
                  </div>
                  <div className="kcals-auth-email">{authEmail}</div>
                  <input
                    className="kcals-modal-input"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={authOtp}
                    onChange={(e) => {
                      const next = e.target.value.replace(/\D/g, "").slice(0, 8);
                      setAuthOtp(next);
                    }}
                    placeholder="Enter code"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleVerifyOtp();
                      }
                    }}
                  />
                  <div className="kcals-auth-hint">Enter the 8-digit code from your email.</div>
                  <button
                    className="kcals-modal-submit"
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={authStatus === "verifying"}
                  >
                    {authStatus === "verifying" ? "Verifying..." : "Verify code"}
                  </button>
                  <button
                    className="kcals-auth-link"
                    type="button"
                    onClick={handleSendMagicLink}
                  >
                    Resend code
                  </button>
                </>
              )}
              {authError && <div className="kcals-auth-error">{authError}</div>}
            </>
          )}
        </div>
      </BottomSheet>

      {/* Weekly Breakdown Modal */}
      <BottomSheet open={showWeeklyModal} onClose={() => setShowWeeklyModal(false)} variant="center">
        <>
          {renderWeeklyCardContent()}
          {weeklyHasData && (
            <button className="kcals-weekly-share" type="button" onClick={handleOpenShare}>
              <img src="/kcals/assets/share.svg" alt="" className="kcals-weekly-share-icon" />
              Share
            </button>
          )}
        </>
      </BottomSheet>

      {showShareModal && (
        <div className="kcals-share-screen">
          <div className="kcals-share-export">
            <div className="kcals-weekly-modal kcals-weekly-card" ref={shareBadgeExportRef}>
              {renderWeeklyCardContent()}
            </div>
          </div>
          <div
            className="kcals-share-canvas"
            ref={sharePreviewRef}
            style={{
              backgroundImage: "linear-gradient(135deg, #007BFF, #209E9C)",
            }}
          >
            {shareBgType === "image" && shareImage && (
              <img
                className="kcals-share-photo"
                src={shareImage}
                alt=""
                onLoad={() => setShareImageLoaded(true)}
              />
            )}
            <div
              className="kcals-share-badge"
              ref={shareBadgeRef}
              style={{
                left: badgePos.x,
                top: badgePos.y,
                transform: `scale(${badgeScale}) rotate(${badgeRotation}deg)`,
              }}
              onPointerDown={handleShareBadgePointerDown}
              onPointerMove={handleShareBadgePointerMove}
              onPointerUp={handleShareBadgePointerEnd}
              onPointerCancel={handleShareBadgePointerEnd}
            >
              <div className="kcals-weekly-modal kcals-weekly-card" ref={shareBadgeCardRef}>
                {renderWeeklyCardContent()}
              </div>
            </div>
          </div>
          <div className="kcals-share-topbar" data-share-ui>
            <button
              className="kcals-share-topbtn"
              type="button"
              onClick={() => setShowShareModal(false)}
            >
              <svg
                className="kcals-share-close-icon"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path d="M7.00006 6.99994L17.5 16.9999" stroke="#191815" strokeWidth="2" strokeLinecap="round" />
                <path d="M16.9999 7L6.99994 17" stroke="#191815" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            <button
              className="kcals-share-topbtn kcals-share-topbtn--primary"
              type="button"
              onClick={handleShareNow}
              disabled={shareStatus === "rendering"}
            >
              {shareStatus === "rendering" ? "Preparing..." : "Share"}
            </button>
          </div>
          <div className="kcals-share-bottom" data-share-ui>
            <button
              className={`kcals-share-pill${shareBgType === "image" ? " is-active" : ""}`}
              type="button"
              onClick={() => shareGalleryInputRef.current?.click()}
            >
              Image
            </button>
            <button
              className={`kcals-share-pill${shareBgType === "gradient" ? " is-active" : ""}`}
              type="button"
              onClick={() => setShareBgType("gradient")}
            >
              Solid
            </button>
          </div>
          {shareError && <div className="kcals-share-error">{shareError}</div>}
          <input
            ref={shareGalleryInputRef}
            type="file"
            accept="image/*"
            className="kcals-share-input"
            onChange={handleShareGalleryChange}
          />
        </div>
      )}
    </>
  );
}
