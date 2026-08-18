/**
 * The real 53-recipe Media Studio catalog, mirrored from the platform's
 * production recipe catalog.
 *
 * Every title below is a real, one-click recipe available in the product.
 * No per-recipe cost is shown anywhere this data feeds — the platform bills
 * in credits consumed per render, not a fixed per-recipe number, so a fake
 * "8s / 4s" style label would be a fabricated claim.
 */

export type RecipeCategoryId = 'video-effects' | 'bring-to-life' | 'marketing' | 'audio';

export type Recipe = {
  key: string;
  title: string;
  category: RecipeCategoryId;
};

export const RECIPES: Recipe[] = [
  { key: 'impossible-transition', title: 'Impossible Transition', category: 'video-effects' },
  { key: 'photo-parallax', title: 'Bring a Photo to Life', category: 'bring-to-life' },
  { key: 'timelapse-from-photo', title: 'Day-to-Night Timelapse', category: 'bring-to-life' },
  { key: 'add-character', title: 'Add a Character to Your Shot', category: 'video-effects' },
  { key: 'remove-object', title: 'Remove Something From a Shot', category: 'video-effects' },
  { key: 'replace-object', title: 'Swap an Object', category: 'video-effects' },
  { key: 'replace-background', title: 'Change the Location', category: 'video-effects' },
  { key: 'change-clothing', title: 'Change the Outfit', category: 'video-effects' },
  { key: 'cinematic-broll', title: 'Establishing Shot of Anywhere', category: 'marketing' },
  { key: 'movie-poster', title: 'Movie Poster', category: 'marketing' },
  { key: 'youtube-thumbnail', title: 'Scroll-Stopping Thumbnail', category: 'marketing' },
  { key: 'product-placement', title: 'Put Your Product in the Shot', category: 'marketing' },
  { key: 'speed-ramp-move', title: 'Two Photos, One Camera Move', category: 'video-effects' },
  { key: 'character-swap', title: 'Swap Who Is in the Shot', category: 'video-effects' },
  { key: 'change-weather', title: 'Change the Weather', category: 'video-effects' },
  { key: 'green-screen-replace', title: 'Green Screen, Gone', category: 'video-effects' },
  { key: 'practical-vfx', title: 'Effects Without the Budget', category: 'video-effects' },
  { key: 'sketch-animation', title: 'Sketch to Motion', category: 'bring-to-life' },
  { key: 'aging-transition', title: 'Twenty Years in Six Seconds', category: 'bring-to-life' },
  { key: 'animated-infographic', title: 'Animated Infographic', category: 'marketing' },
  { key: 'studio-headshot', title: 'Studio Headshot From a Selfie', category: 'marketing' },
  { key: 'product-on-a-model', title: 'Product on a Model', category: 'marketing' },
  { key: 'relight-product', title: 'Relight a Product Shot', category: 'marketing' },
  { key: 'turntable-from-one-photo', title: 'Turntable From One Photo', category: 'marketing' },
  { key: 'empty-room-furnished', title: 'Empty Room, Furnished', category: 'marketing' },
  { key: 'before-and-after-reveal', title: 'Before and After Reveal', category: 'marketing' },
  { key: 'review-quote-card', title: 'Review as a Quote Card', category: 'marketing' },
  { key: 'logo-sting', title: 'Logo Sting', category: 'marketing' },
  { key: 'voice-over', title: 'Voice-Over From a Script', category: 'audio' },
  { key: 'background-music', title: 'Background Music', category: 'audio' },
  { key: 'sound-effect', title: 'Sound Effect', category: 'audio' },
  { key: 'talking-photo', title: 'Talking Presenter From a Photo', category: 'bring-to-life' },
  { key: 'voiceover-and-captions', title: 'Voiceover and Captions', category: 'marketing' },
  { key: 'resize-every-ad-size', title: 'Resize to Every Ad Size', category: 'marketing' },
  { key: 'upscale-image', title: 'Make a Picture Bigger', category: 'video-effects' },
  { key: 'upscale-video', title: 'Make a Clip Sharper', category: 'video-effects' },
  { key: 'photo-restoration', title: 'Repair an Old Photo', category: 'video-effects' },
  { key: 'character-sheet', title: 'Character Sheet', category: 'bring-to-life' },
  { key: 'product-sheet', title: 'Product Sheet', category: 'marketing' },
  { key: 'location-statics-pack', title: 'Lock the Location', category: 'video-effects' },
  { key: 'wardrobe-look', title: 'Change Their Outfit', category: 'bring-to-life' },
  { key: 'cartoon-character', title: 'Cartoon Character', category: 'bring-to-life' },
  { key: 'ugc-talking-head', title: 'Talking-Head Ad', category: 'marketing' },
  { key: 'product-reveal', title: 'Product Reveal', category: 'marketing' },
  { key: 'lifestyle-plandid', title: 'Caught Moment', category: 'marketing' },
  { key: 'grwm-mirror', title: 'Mirror Routine', category: 'marketing' },
  { key: 'brand-integration', title: 'Just There', category: 'marketing' },
  { key: 'cartoon-series', title: 'Cartoon Episode', category: 'bring-to-life' },
  { key: 'change-the-voice', title: 'Change the Voice', category: 'marketing' },
  { key: 'perform-as-character', title: 'Perform as my Character', category: 'bring-to-life' },
  { key: 'relight-this-footage', title: 'Relight this Footage', category: 'video-effects' },
  { key: 'change-the-world', title: 'Change the World', category: 'video-effects' },
  { key: 'start-end-frame-vfx', title: 'Start/End-Frame VFX', category: 'video-effects' },
];

type CategoryDef = { id: RecipeCategoryId; label: string; value: number };

/** Real category order + display labels, per the Media Studio catalog. */
const CATEGORY_DEFS: CategoryDef[] = [
  { id: 'video-effects', label: 'Video effects', value: 1 },
  { id: 'bring-to-life', label: 'Bring to life', value: 2 },
  { id: 'marketing', label: 'Marketing', value: 3 },
  { id: 'audio', label: 'Audio', value: 4 },
];

const CATEGORY_VALUE_BY_ID: Record<RecipeCategoryId, number> = CATEGORY_DEFS.reduce(
  (acc, def) => {
    acc[def.id] = def.value;
    return acc;
  },
  {} as Record<RecipeCategoryId, number>,
);

export type RecipeChip = {
  name: string;
  cat: number;
};

/**
 * Flattened for the Recipes section's chip grid + category filter. `cat`
 * is 1-based and lines up positionally with `CATEGORY_LABELS` (index 0 of
 * CATEGORY_LABELS is the "All N" pseudo-category, matched by every recipe
 * when the filter value is 0; `CATEGORY_LABELS[chip.cat]` gives the real
 * category label for any chip).
 */
export const RECIPE_CHIPS: RecipeChip[] = RECIPES.map((recipe) => ({
  name: recipe.title,
  cat: CATEGORY_VALUE_BY_ID[recipe.category],
}));

/**
 * `CATEGORY_LABELS[0]` is the "All <n>" pseudo-category, with `n` derived
 * live from the real catalog count (never hardcoded); the remaining four
 * are the real Media Studio recipe categories in their real display order.
 */
export const CATEGORY_LABELS: string[] = [
  `All ${RECIPE_CHIPS.length}`,
  ...CATEGORY_DEFS.map((def) => def.label),
];
