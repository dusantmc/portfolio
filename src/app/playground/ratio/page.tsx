"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import s from "./styles.module.css";

// ── Types ─────────────────────────────────────────────────────────────────────

type Ingredient = { name: string; unit: string; ratio: number };

type Recipe = {
  id: string;
  name: string;
  emoji: string;
  ingredients: Ingredient[];
  defaultMainIndex: number;
  sliderMin: number;   // min value of slider for defaultMainIndex ingredient
  sliderMax: number;
  sliderStep: number;
  sliderDefault: number; // also = 1 serving amount for cocktails
  showServings?: boolean;
};

type View =
  | { type: "home" }
  | { type: "recipe"; recipe: Recipe }
  | { type: "add" };

type NewIngredient = { name: string; unit: string; ratio: string };

// ── Default recipes ───────────────────────────────────────────────────────────

const BUILT_IN: Recipe[] = [
  {
    id: "french-press",
    name: "French Press",
    emoji: "🫖",
    ingredients: [
      { name: "Coffee", unit: "g", ratio: 1 },
      { name: "Water", unit: "ml", ratio: 15 },
    ],
    defaultMainIndex: 0,
    sliderMin: 10,
    sliderMax: 100,
    sliderStep: 1,
    sliderDefault: 30,
  },
  {
    id: "filter-coffee",
    name: "Filter Coffee",
    emoji: "☕️",
    ingredients: [
      { name: "Coffee", unit: "g", ratio: 1 },
      { name: "Water", unit: "ml", ratio: 16 },
    ],
    defaultMainIndex: 0,
    sliderMin: 10,
    sliderMax: 100,
    sliderStep: 1,
    sliderDefault: 25,
  },
  {
    id: "pina-colada",
    name: "Pina Colada",
    emoji: "🍹",
    // base = 1 serving: 60ml rum, 30ml coconut cream, 60ml pineapple
    ingredients: [
      { name: "Rum", unit: "ml", ratio: 1 },
      { name: "Coconut Cream", unit: "ml", ratio: 0.5 },
      { name: "Pineapple Juice", unit: "ml", ratio: 1 },
    ],
    defaultMainIndex: 0,
    sliderMin: 30,    // 0.5 servings
    sliderMax: 360,   // 6 servings
    sliderStep: 10,
    sliderDefault: 60, // 1 serving = 60ml rum
    showServings: true,
  },
  {
    id: "caipirinha",
    name: "Caipirinha",
    emoji: "🍋",
    // base = 1 serving: 30ml lime, 50ml cachaça, 1.5 tsp sugar
    ingredients: [
      { name: "Lime Juice", unit: "ml", ratio: 1 },
      { name: "Cachaça", unit: "ml", ratio: 1.667 },
      { name: "Sugar", unit: "tsp", ratio: 0.05 },
    ],
    defaultMainIndex: 0,
    sliderMin: 15,    // 0.5 servings
    sliderMax: 180,   // 6 servings
    sliderStep: 5,
    sliderDefault: 30, // 1 serving = 30ml lime juice
    showServings: true,
  },
];

// ── Storage ───────────────────────────────────────────────────────────────────

const STORAGE_KEY = "ratio_app_custom_recipes_v1";

function loadCustom(): Recipe[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveCustom(recipes: Recipe[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(val: number): string {
  if (val === 0) return "0";
  if (Math.abs(val) < 0.1) return val.toFixed(2);
  if (Math.abs(val) < 1) return val.toFixed(1);
  if (val % 1 === 0) return String(Math.round(val));
  if (Math.abs(val) < 10) return val.toFixed(1);
  return String(Math.round(val));
}

function fmtServings(val: number): string {
  if (val % 1 === 0) return String(val);
  return val.toFixed(1);
}

// ── Vertical Slider ───────────────────────────────────────────────────────────

function VerticalSlider({
  value,
  min,
  max,
  step,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const updateFromY = useCallback(
    (y: number) => {
      if (!trackRef.current) return;
      const { top, height } = trackRef.current.getBoundingClientRect();
      const rawRatio = 1 - (y - top) / height;
      const clamped = Math.max(0, Math.min(1, rawRatio));
      const raw = min + clamped * (max - min);
      const snapped = Math.round(raw / step) * step;
      onChange(Math.max(min, Math.min(max, snapped)));
    },
    [min, max, step, onChange]
  );

  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div
      ref={trackRef}
      className={s.sliderTrack}
      style={{ width: 60, height: "100%", touchAction: "none" }}
      onPointerDown={(e) => {
        dragging.current = true;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        updateFromY(e.clientY);
      }}
      onPointerMove={(e) => {
        if (dragging.current) updateFromY(e.clientY);
      }}
      onPointerUp={() => { dragging.current = false; }}
      onPointerCancel={() => { dragging.current = false; }}
    >
      {/* Fill */}
      <div
        className={s.sliderFill}
        style={{ height: `${pct}%` }}
      />
      {/* Thumb */}
      <div
        className={s.sliderThumbWrapper}
        style={{
          width: 60,
          height: 60,
          bottom: `${pct}%`,
          transform: "translateX(-50%) translateY(50%)",
        }}
      >
        <div className={s.sliderThumb}>
          <div className={s.sliderThumbLine} />
          <div className={s.sliderThumbLine} />
        </div>
      </div>
    </div>
  );
}

// ── Home view ─────────────────────────────────────────────────────────────────

function HomeView({
  recipes,
  onSelect,
  onAdd,
}: {
  recipes: Recipe[];
  onSelect: (r: Recipe) => void;
  onAdd: () => void;
}) {
  return (
    <div className={s.homeContainer}>
      <div className={s.homeHeader}>
        <h1 className={s.homeTitle}>Ratios</h1>
        <p className={s.homeSubtitle}>Perfect measures, every time</p>
      </div>

      <div className={s.homeGrid}>
        {recipes.map((r) => (
          <button
            key={r.id}
            onClick={() => onSelect(r)}
            className={s.recipeCard}
          >
            <span className={s.recipeEmoji}>{r.emoji}</span>
            <span className={s.recipeName}>{r.name}</span>
          </button>
        ))}

        <button
          onClick={onAdd}
          className={s.addCard}
        >
          <span className={s.addCardIcon}>+</span>
          <span className={s.addCardLabel}>Add New</span>
        </button>
      </div>
    </div>
  );
}

// ── Recipe view ───────────────────────────────────────────────────────────────

function toGrams(amount: number, unit: string): { amount: number; unit: string } {
  if (unit === "ml") return { amount, unit: "g" };
  if (unit === "tsp") return { amount: Math.round(amount * 4 * 10) / 10, unit: "g" };
  return { amount, unit };
}

function RecipeView({
  recipe,
  onBack,
}: {
  recipe: Recipe;
  onBack: () => void;
}) {
  const [mainIdx, setMainIdx] = useState(recipe.defaultMainIndex);
  const [sliderVal, setSliderVal] = useState(recipe.sliderDefault);
  const [useGrams, setUseGrams] = useState(false);

  // Derived slider range for current main
  const defaultMainRatio = recipe.ingredients[recipe.defaultMainIndex].ratio;
  const currentMainRatio = recipe.ingredients[mainIdx].ratio;
  const scale = currentMainRatio / defaultMainRatio;

  const effectiveMin = recipe.sliderMin * scale;
  const effectiveMax = recipe.sliderMax * scale;
  const effectiveStep = Math.max(0.05, recipe.sliderStep * scale);

  const handleToggleMain = useCallback(
    (newIdx: number) => {
      if (newIdx === mainIdx) return;
      const newRatio = recipe.ingredients[newIdx].ratio;
      const newScale = newRatio / defaultMainRatio;
      const newMin = recipe.sliderMin * newScale;
      const newMax = recipe.sliderMax * newScale;
      const newStep = Math.max(0.05, recipe.sliderStep * newScale);
      // Convert current value to new main's amount
      const raw = sliderVal * (newRatio / currentMainRatio);
      const clamped = Math.max(newMin, Math.min(newMax, raw));
      const snapped = Math.round(clamped / newStep) * newStep;
      setMainIdx(newIdx);
      setSliderVal(snapped);
    },
    [mainIdx, sliderVal, currentMainRatio, defaultMainRatio, recipe]
  );

  const mainIngredient = recipe.ingredients[mainIdx];

  // All calculated amounts
  const amounts = recipe.ingredients.map((ing) => ({
    ...ing,
    amount: sliderVal * (ing.ratio / mainIngredient.ratio),
  }));

  // Servings (only for cocktails)
  const servings = recipe.showServings
    ? sliderVal / (recipe.sliderDefault * scale)
    : null;

  return (
    <div className={s.recipeContainer}>
      {/* Header */}
      <div className={s.recipeHeader}>
        <button
          onClick={onBack}
          className={s.backButton}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 4L6 9L11 14" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <span className={s.recipeTitle}>{recipe.emoji} {recipe.name}</span>
        <button
          onClick={() => setUseGrams((v) => !v)}
          className={`${s.gramsToggle} ${useGrams ? s.gramsToggleActive : s.gramsToggleInactive}`}
        >
          g
        </button>
      </div>

      {/* Toggle – only shown when there's more than 1 ingredient */}
      {recipe.ingredients.length > 1 && (
        <div className={s.ingredientToggleRow}>
          {recipe.ingredients.map((ing, i) => (
            <button
              key={i}
              onClick={() => handleToggleMain(i)}
              className={`${s.ingredientToggleBtn} ${i === mainIdx ? s.ingredientToggleBtnActive : s.ingredientToggleBtnInactive}`}
            >
              {ing.name}
            </button>
          ))}
        </div>
      )}

      {/* Big value display */}
      <div className={s.bigValueContainer}>
        <div className={s.bigValueRow}>
          <span className={s.bigValue}>
            {fmt(useGrams ? toGrams(sliderVal, mainIngredient.unit).amount : sliderVal)}
          </span>
          <span className={s.bigValueUnit}>
            {useGrams ? toGrams(sliderVal, mainIngredient.unit).unit : mainIngredient.unit}
          </span>
        </div>
        <div className={s.bigValueMeta}>
          <span className={s.bigValueLabel}>{mainIngredient.name}</span>
          {servings !== null && (
            <>
              <span className={s.bigValueDot}>·</span>
              <span className={s.bigValueServings}>{fmtServings(servings)} {servings === 1 ? "serving" : "servings"}</span>
            </>
          )}
        </div>
      </div>

      {/* Slider */}
      <div className={s.sliderArea}>
        <VerticalSlider
          value={sliderVal}
          min={effectiveMin}
          max={effectiveMax}
          step={effectiveStep}
          onChange={setSliderVal}
        />
      </div>

      {/* Ingredients breakdown */}
      <div className={s.breakdown}>
        <div className={s.breakdownCard}>
          {amounts.map((ing, i) => (
            <div
              key={i}
              className={`${s.breakdownRow} ${i < amounts.length - 1 ? s.breakdownRowBorder : ""}`}
            >
              <span className={i === mainIdx ? s.breakdownIngredientActive : s.breakdownIngredientInactive}>
                {ing.name}
              </span>
              <span className={s.breakdownAmount}>
                {(() => {
                  const converted = useGrams ? toGrams(ing.amount, ing.unit) : { amount: ing.amount, unit: ing.unit };
                  return <>{fmt(converted.amount)}{" "}<span className={s.breakdownUnit}>{converted.unit}</span></>;
                })()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Add recipe view ───────────────────────────────────────────────────────────

function AddRecipeView({
  onSave,
  onCancel,
}: {
  onSave: (r: Recipe) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("");
  const [ingredients, setIngredients] = useState<NewIngredient[]>([
    { name: "", unit: "", ratio: "1" },
    { name: "", unit: "", ratio: "" },
  ]);
  const [mainIdx, setMainIdx] = useState(0);
  const [sliderMin, setSliderMin] = useState("10");
  const [sliderMax, setSliderMax] = useState("100");
  const [sliderDefault, setSliderDefault] = useState("50");

  const addIngredient = () =>
    setIngredients((p) => [...p, { name: "", unit: "", ratio: "" }]);

  const removeIngredient = (i: number) => {
    if (ingredients.length <= 2) return;
    setIngredients((p) => p.filter((_, idx) => idx !== i));
    if (i <= mainIdx) setMainIdx(Math.max(0, mainIdx - 1));
  };

  const updateIng = (i: number, field: keyof NewIngredient, val: string) =>
    setIngredients((p) => p.map((ing, idx) => (idx === i ? { ...ing, [field]: val } : ing)));

  const isValid =
    name.trim() !== "" &&
    emoji.trim() !== "" &&
    ingredients.every((ing) => ing.name.trim() !== "") &&
    ingredients.every((ing, i) => i === mainIdx || parseFloat(ing.ratio) > 0);

  const handleSave = () => {
    if (!isValid) return;
    onSave({
      id: `custom-${Date.now()}`,
      name: name.trim(),
      emoji: emoji.trim(),
      ingredients: ingredients.map((ing, i) => ({
        name: ing.name.trim() || `Ingredient ${i + 1}`,
        unit: ing.unit.trim() || "ml",
        ratio: i === mainIdx ? 1 : parseFloat(ing.ratio) || 1,
      })),
      defaultMainIndex: mainIdx,
      sliderMin: parseFloat(sliderMin) || 10,
      sliderMax: parseFloat(sliderMax) || 100,
      sliderStep: 1,
      sliderDefault: parseFloat(sliderDefault) || 50,
    });
  };

  const mainName = ingredients[mainIdx]?.name || "main ingredient";
  const mainUnit = ingredients[mainIdx]?.unit || "unit";

  return (
    <div className={s.addContainer}>
      {/* Header */}
      <div className={s.addHeader}>
        <button onClick={onCancel} className={s.cancelButton}>
          Cancel
        </button>
        <span className={s.addHeaderTitle}>New Recipe</span>
        <button
          onClick={handleSave}
          disabled={!isValid}
          className={`${s.saveButton} ${isValid ? s.saveButtonActive : s.saveButtonDisabled}`}
        >
          Save
        </button>
      </div>

      <div className={s.addScrollArea}>
        {/* Name + Emoji */}
        <div className={s.nameRow}>
          <input
            type="text"
            placeholder="🍸"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            maxLength={4}
            className={s.emojiInput}
            style={{ fontSize: 32 }}
          />
          <input
            type="text"
            placeholder="Recipe name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoCorrect="off"
            className={s.nameInput}
            style={{ fontSize: 16 }}
          />
        </div>

        {/* Ingredients */}
        <p className={s.sectionLabel}>Ingredients</p>
        <div className={s.ingredientList}>
          {ingredients.map((ing, i) => (
            <div
              key={i}
              className={`${s.ingredientItem} ${i < ingredients.length - 1 ? s.ingredientItemBorder : ""}`}
            >
              <div className={s.ingredientItemHeader}>
                <button
                  onClick={() => setMainIdx(i)}
                  className={`${s.radioButton} ${i === mainIdx ? s.radioButtonActive : s.radioButtonInactive}`}
                />
                <span className={s.ingredientHint}>
                  {i === mainIdx ? "Slider controls this" : `Per 1 ${mainUnit} of ${mainName}`}
                </span>
                {ingredients.length > 2 && (
                  <button
                    onClick={() => removeIngredient(i)}
                    className={s.removeButton}
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className={s.ingredientFields}>
                <input
                  type="text"
                  placeholder="Name"
                  value={ing.name}
                  onChange={(e) => updateIng(i, "name", e.target.value)}
                  autoCorrect="off"
                  className={s.fieldName}
                  style={{ fontSize: 16 }}
                />
                <input
                  type="text"
                  placeholder="Unit"
                  value={ing.unit}
                  onChange={(e) => updateIng(i, "unit", e.target.value)}
                  autoCorrect="off"
                  className={s.fieldUnit}
                  style={{ fontSize: 16 }}
                />
                {i !== mainIdx && (
                  <input
                    type="number"
                    placeholder="×"
                    value={ing.ratio}
                    onChange={(e) => updateIng(i, "ratio", e.target.value)}
                    inputMode="decimal"
                    className={s.fieldRatio}
                    style={{ fontSize: 16 }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        <button onClick={addIngredient} className={s.addIngredientButton}>
          + Add ingredient
        </button>

        {/* Slider range */}
        <p className={s.sectionLabel}>
          Slider Range{mainUnit ? ` (${mainUnit})` : ""}
        </p>
        <div className={s.sliderRangeList}>
          {[
            { label: "Minimum", value: sliderMin, setter: setSliderMin },
            { label: "Maximum", value: sliderMax, setter: setSliderMax },
            { label: "Default", value: sliderDefault, setter: setSliderDefault },
          ].map(({ label, value, setter }, i, arr) => (
            <div
              key={label}
              className={`${s.sliderRangeRow} ${i < arr.length - 1 ? s.sliderRangeRowBorder : ""}`}
            >
              <span className={s.sliderRangeLabel}>{label}</span>
              <input
                type="number"
                value={value}
                onChange={(e) => setter(e.target.value)}
                inputMode="decimal"
                className={s.sliderRangeInput}
                style={{ fontSize: 16 }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function RatioPage() {
  const [customRecipes, setCustomRecipes] = useState<Recipe[]>([]);
  const [view, setView] = useState<View>({ type: "home" });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setCustomRecipes(loadCustom());
    setMounted(true);
    // Dark background for this page
    document.body.style.background = "#000";
    return () => { document.body.style.background = ""; };
  }, []);

  const allRecipes = [...BUILT_IN, ...customRecipes];

  const handleSaveRecipe = useCallback(
    (recipe: Recipe) => {
      const updated = [...customRecipes, recipe];
      setCustomRecipes(updated);
      saveCustom(updated);
      setView({ type: "home" });
    },
    [customRecipes]
  );

  if (!mounted) return <div className={s.pagePlaceholder} />;

  return (
    <div className={s.page}>
      {view.type === "home" && (
        <HomeView
          recipes={allRecipes}
          onSelect={(r) => setView({ type: "recipe", recipe: r })}
          onAdd={() => setView({ type: "add" })}
        />
      )}
      {view.type === "recipe" && (
        <RecipeView recipe={view.recipe} onBack={() => setView({ type: "home" })} />
      )}
      {view.type === "add" && (
        <AddRecipeView
          onSave={handleSaveRecipe}
          onCancel={() => setView({ type: "home" })}
        />
      )}
    </div>
  );
}
