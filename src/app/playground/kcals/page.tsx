"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  type FoodItem,
  type CustomFood,
  type RecentFood,
  type WeeklyEntry,
  isGroup,
  groupKcal,
  loadFoodList,
  saveFoodList,
  loadCustomFoods,
  saveCustomFoods,
  loadRecentFoods,
  trackRecentFood,
  findCachedFood,
  saveCustomFoodImage,
  loadCustomFoodImage,
  deleteCustomFoodImage,
  saveDailyEntry,
  getStreak,
  getWeeklyRemaining,
  getWeeklyBreakdown,
} from "./data/storage";
import { parseFoodInput, fetchKcalPer100g, getFoodEmoji } from "./data/usda";

const CALORIE_GOAL = 1600;

function formatCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1000) {
    const k = n / 1000;
    const rounded = Math.round(k * 10) / 10;
    return `${rounded}K`;
  }
  return n.toString();
}
const SWIPE_THRESHOLD = 48;
const LONG_PRESS_MS = 1000;
const DRAG_MOVE_CANCEL = 10;
const DROP_OVERLAP = 0.3;

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

/* ===========================
   Main Component
   =========================== */

export default function KcalsPage() {
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [inputFocused, setInputFocused] = useState(false);
  const [customFoods, setCustomFoods] = useState<CustomFood[]>([]);
  const [recentFoods, setRecentFoods] = useState<RecentFood[]>([]);
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
  const blurTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pillLongPressRef = useRef<{ timer: ReturnType<typeof setTimeout> | null; triggered: boolean }>({ timer: null, triggered: false });

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
  const [editFoodKcal, setEditFoodKcal] = useState("");

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
  const itemRefsMap = useRef<Map<string, HTMLDivElement>>(new Map());

  // Group modal state
  const [groupModal, setGroupModal] = useState<FoodItem | null>(null);
  const [groupName, setGroupName] = useState("");
  const imageUrlsRef = useRef<Record<string, string>>({});
  const hasMigratedImagesRef = useRef(false);

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
  }, []);

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
  const remaining = CALORIE_GOAL - totalKcal;
  const todayLabel = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date());

  const [streak, setStreak] = useState(0);
  const [weeklyBurn, setWeeklyBurn] = useState(0);
  const [showWeeklyModal, setShowWeeklyModal] = useState(false);
  const [weeklyBreakdown, setWeeklyBreakdown] = useState<WeeklyEntry[]>([]);

  useEffect(() => {
    const hasFood = foods.some((f) => !f.loading && f.kcal != null);
    saveDailyEntry(remaining, hasFood);
    setStreak(getStreak());
    setWeeklyBurn(getWeeklyRemaining());
    setWeeklyBreakdown(getWeeklyBreakdown());
  }, [foods, remaining]);

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

  const handlePillTap = (name: string) => {
    cancelDismiss();
    setInputValue(name);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  /* ===========================
     Custom food handlers
     =========================== */

  const handleAddCustomFood = () => {
    cancelDismiss();
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
    cancelDismiss();
    setEditingFood(food);
    setModalName(food.name);
    setModalKcal(food.kcalPer100g.toString());
    setModalImageBlob(null);
    if (food.imageId) {
      const url = await ensureImageUrl(food.imageId);
      setModalImageUrl(url);
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
    setTimeout(() => inputRef.current?.focus(), 50);
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
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    if (modalImageBlob && modalImageUrl) {
      URL.revokeObjectURL(modalImageUrl);
    }
    setModalImageUrl(null);
    setModalImageBlob(null);
    setTimeout(() => inputRef.current?.focus(), 50);
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
    setInputValue("");
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handlePillTouchStart = (food: CustomFood) => {
    pillLongPressRef.current.triggered = false;
    pillLongPressRef.current.timer = setTimeout(() => {
      pillLongPressRef.current.triggered = true;
      if (navigator.vibrate) navigator.vibrate(50);
      handleEditCustomFood(food);
    }, LONG_PRESS_MS);
  };

  const handlePillTouchEnd = () => {
    if (pillLongPressRef.current.timer) {
      clearTimeout(pillLongPressRef.current.timer);
      pillLongPressRef.current.timer = null;
    }
  };

  /* ===========================
     Submit food handler
     =========================== */

  const handleSubmit = () => {
    const text = inputValue.trim();

    if (selectedCustomFood) {
      const combinedText = `${selectedCustomFood.name} ${text || "100g"}`;
      const { name, grams } = parseFoodInput(combinedText);
      const itemId = Date.now().toString();
      const displayName = `${name} ${grams}g`;
      const kcal = Math.round((selectedCustomFood.kcalPer100g * grams) / 100);

      updateFoods((prev) => [
        {
          id: itemId,
          emoji: "\u{1F4E6}",
          name: displayName,
          kcal,
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

    if (!text) return;

    const { name, grams } = parseFoodInput(text);
    const emoji = getFoodEmoji(name);
    const itemId = Date.now().toString();
    const displayName = `${name} ${grams}g`;

    // Check cache first (recent foods or custom foods)
    const cached = findCachedFood(name);
    const customMatch = customFoods.find(
      (f) => f.name.toLowerCase() === name.toLowerCase()
    );
    const cachedKcalPer100g = cached?.kcalPer100g ?? customMatch?.kcalPer100g;

    // Clear input and dismiss suggestions
    setInputValue("");
    setInputFocused(false);
    inputRef.current?.blur();

    if (cachedKcalPer100g != null) {
      // Cached: add immediately
      const kcal = Math.round((cachedKcalPer100g * grams) / 100);
      updateFoods((prev) => [
        { id: itemId, emoji, name: displayName, kcal },
        ...prev,
      ]);
      trackRecentFood(name, emoji, cachedKcalPer100g);
      setRecentFoods(loadRecentFoods());
    } else {
      // Not cached: add loading item, fetch from USDA
      updateFoods((prev) => [
        { id: itemId, emoji, name: displayName, kcal: null, loading: true },
        ...prev,
      ]);

      fetchKcalPer100g(name).then((kcalPer100g) => {
        if (kcalPer100g != null) {
          const kcal = Math.round((kcalPer100g * grams) / 100);
          updateFoods((prev) =>
            prev.map((f) =>
              f.id === itemId ? { ...f, kcal, loading: false } : f
            )
          );
          trackRecentFood(name, emoji, kcalPer100g);
          setRecentFoods(loadRecentFoods());
        } else {
          // API failed — keep kcal null so it shows as "?"
          updateFoods((prev) =>
            prev.map((f) =>
              f.id === itemId ? { ...f, kcal: null, loading: false } : f
            )
          );
        }
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Backspace" && !inputValue && selectedCustomFood) {
      setSelectedCustomFood(null);
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
    setEditFoodName(food.name);
    setEditFoodKcal(food.kcal?.toString() ?? "");
    setEditFoodModal(food);
  };

  const handleSaveEditFood = () => {
    if (!editFoodModal) return;
    const name = editFoodName.trim();
    const kcal = Number(editFoodKcal);
    if (!name || isNaN(kcal) || kcal <= 0) return;

    updateFoods((prev) =>
      prev.map((f) =>
        f.id === editFoodModal.id ? { ...f, name, kcal } : f
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
  };

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
        setGroupModal(null);
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
    const imageUrl = food.imageId ? imageUrls[food.imageId] : food.image;

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
            ) : !group && food.kcal == null ? "? kcal" : `+ ${kcal.toLocaleString()}kcal`}
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

  return (
    <div className="kcals-content" onClick={handleContentClick}>
      {!inputFocused && (
        <>
          {/* Top Bar */}
          <div className="kcals-topbar">
            <div className="kcals-chip">
              <span className="kcals-chip-icon">{"\u{1F5D3}\uFE0F"}</span>
              {todayLabel}
            </div>
            <div className="kcals-topbar-right">
              <div className="kcals-chip">
                <span className="kcals-chip-icon">{"\u26A1\uFE0F"}</span>
                {streak}
              </div>
              <button className="kcals-chip kcals-chip-btn" type="button" onClick={() => setShowWeeklyModal(true)}>
                <span className="kcals-chip-icon">{"\u{1F525}"}</span>
                {formatCompact(weeklyBurn)}
              </button>
            </div>
          </div>

          {/* Calorie Display */}
          <div className="kcals-calorie-display">
            <div className="kcals-calorie-number">
              <span className="kcals-calorie-value">{totalKcal}</span>
              <span className="kcals-calorie-unit">kcal</span>
            </div>
            <p className="kcals-calorie-remaining">
              <strong>+{remaining.toLocaleString()}kcal</strong>
              <span> remaining</span>
            </p>
          </div>

          {/* Food List */}
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

      {/* Suggestions Panel */}
      {inputFocused && (
        <div className="kcals-suggestions">
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
                  {customFoods.map((food) => (
                    <button
                      key={food.id}
                      className="kcals-pill"
                      onPointerDown={(e) => e.preventDefault()}
                      onTouchStart={() => handlePillTouchStart(food)}
                      onTouchEnd={handlePillTouchEnd}
                      onClick={() => {
                        if (!pillLongPressRef.current.triggered) {
                          handleCustomPillTap(food);
                        }
                      }}
                      type="button"
                    >
                      {(food.imageId ? imageUrls[food.imageId] : food.image) ? (
                        <img
                          src={food.imageId ? imageUrls[food.imageId] : food.image}
                          alt=""
                          className="kcals-pill-image"
                        />
                      ) : (
                        <span className="kcals-pill-emoji">{"\u{1F4E6}"}</span>
                      )}
                      {food.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {recentFoods.filter((rf) => !customFoods.some((cf) => cf.name.toLowerCase() === rf.name.toLowerCase())).length > 0 && (
              <div className="kcals-suggestion-section">
                <div className="kcals-suggestion-header">
                  <span>Frequently Used</span>
                </div>
                <div className="kcals-pills">
                  {recentFoods.filter((rf) => !customFoods.some((cf) => cf.name.toLowerCase() === rf.name.toLowerCase())).map((food) => (
                    <button
                      key={food.name}
                      className="kcals-pill"
                      onPointerDown={(e) => e.preventDefault()}
                      onClick={() => handlePillTap(food.name)}
                      type="button"
                    >
                      <span className="kcals-pill-emoji">{food.emoji}</span>
                      {food.name}
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
          {selectedCustomFood && (
            <span className="kcals-input-tag">{selectedCustomFood.name}</span>
          )}
          <input
            ref={inputRef}
            className="kcals-input"
            type="text"
            placeholder={selectedCustomFood ? "100g" : "Type what you ate..."}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
            enterKeyHint="send"
          />
          {inputValue || selectedCustomFood ? (
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

      {/* Custom Food Modal */}
      {showModal && (
        <div className="kcals-modal-overlay" onClick={handleCloseModal}>
          <div className="kcals-modal" onClick={(e) => e.stopPropagation()}>
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
                <label className="kcals-modal-label">Name</label>
                <input
                  className="kcals-modal-input"
                  type="text"
                  value={modalName}
                  onChange={(e) => setModalName(e.target.value)}
                  placeholder="Food name"
                />
              </div>
              <div className="kcals-modal-field">
                <label className="kcals-modal-label">Calories in 100g</label>
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
          </div>
        </div>
      )}

      {/* Edit Food Modal */}
      {editFoodModal && (
        <div className="kcals-modal-overlay" onClick={() => setEditFoodModal(null)}>
          <div className="kcals-modal" onClick={(e) => e.stopPropagation()}>
            <div className="kcals-modal-handle" />
            <div className={(editFoodModal.imageId ? imageUrls[editFoodModal.imageId] : editFoodModal.image) ? "kcals-modal-image-wrapper" : "kcals-modal-camera"}>
              {(editFoodModal.imageId ? imageUrls[editFoodModal.imageId] : editFoodModal.image) ? (
                <img
                  src={editFoodModal.imageId ? imageUrls[editFoodModal.imageId] : editFoodModal.image}
                  alt=""
                  className="kcals-modal-camera-image"
                />
              ) : (
                <span style={{ fontSize: 60 }}>{editFoodModal.emoji}</span>
              )}
            </div>
            <div className="kcals-modal-fields">
              <div className="kcals-modal-field">
                <label className="kcals-modal-label">Name</label>
                <input
                  className="kcals-modal-input"
                  type="text"
                  value={editFoodName}
                  onChange={(e) => setEditFoodName(e.target.value)}
                  placeholder="Food name"
                />
              </div>
              <div className="kcals-modal-field">
                <label className="kcals-modal-label">Calories</label>
                <div className="kcals-modal-kcal-row">
                  <input
                    className="kcals-modal-input"
                    type="number"
                    value={editFoodKcal}
                    onChange={(e) => setEditFoodKcal(e.target.value)}
                    placeholder="0"
                    inputMode="numeric"
                  />
                  <span className="kcals-modal-kcal-suffix">kcal</span>
                </div>
              </div>
            </div>
            <button
              className="kcals-modal-submit"
              onClick={handleSaveEditFood}
              type="button"
            >
              Update
            </button>
          </div>
        </div>
      )}

      {/* Group Modal */}
      {groupModal && (
        <div className="kcals-modal-overlay" onClick={() => setGroupModal(null)}>
          <div className="kcals-modal kcals-group-modal" onClick={(e) => e.stopPropagation()}>
            <div className="kcals-modal-handle" />
            <button
              className="kcals-modal-delete"
              onClick={handleDeleteGroup}
              type="button"
            >
              <TrashIcon />
            </button>
            <div className="kcals-group-emoji">
              {groupModal.emoji}
            </div>
            <input
              className="kcals-group-name-input"
              type="text"
              value={groupName}
              onChange={(e) => handleSaveGroupName(e.target.value)}
              placeholder="Group name"
            />
            <div className="kcals-group-header">
              <span>Group items ({groupModal.items?.length ?? 0})</span>
              <span>+{groupKcal(groupModal).toLocaleString()}Kcal</span>
            </div>
            <div className="kcals-group-list">
              {groupModal.items?.map((item) => (
                <div key={item.id} className="kcals-group-list-item">
                  <div className="kcals-food-emoji">
                    {(item.imageId ? imageUrls[item.imageId] : item.image) ? (
                      <img
                        src={item.imageId ? imageUrls[item.imageId] : item.image}
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
          </div>
        </div>
      )}

      {/* Weekly Breakdown Modal */}
      {showWeeklyModal && (() => {
        const visibleEntries = weeklyBreakdown.filter(
          (e) => CALORIE_GOAL - e.remaining >= 800
        );
        const isOnTrack = weeklyBurn >= 0;
        const absTotal = Math.abs(weeklyBurn);
        return (
          <div className="kcals-modal-overlay kcals-weekly-overlay" onClick={() => setShowWeeklyModal(false)}>
            <div className="kcals-weekly-modal" onClick={(e) => e.stopPropagation()}>
              <div className="kcals-weekly-emoji">
                {isOnTrack ? "\u{1F525}" : "\u{1F437}"}
              </div>
              <div className="kcals-weekly-title">
                {isOnTrack ? "You're on track!" : "Watch out!"}
              </div>
              <div className="kcals-weekly-list">
                {visibleEntries.map((entry) => {
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
                <strong>{absTotal.toLocaleString()} kcal</strong> {isOnTrack ? "less" : "over"} than the limit
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
