/**
 * Media slot registry.
 *
 * Every section of the landing page that needs a video/poster pulls it from
 * `MEDIA` by a stable `SlotId` rather than hard-coding a path, so creative can
 * be swapped without touching component code. Every slot points at a real
 * encoded clip in `public/media/<slot>.mp4` with a poster at
 * `public/media/posters/<slot>.jpg`, produced by `scripts/encode-media.sh`
 * from the accepted raws in `media-src/raw/` (see `docs/media-brief.md` for
 * the creative brief and slot-to-raw mapping).
 */

export type SlotId =
  | 'wall1'
  | 'wall2'
  | 'wall3'
  | 'wall4'
  | 'wall5'
  | 'wall6'
  | 'wall7'
  | 'wall8'
  | 'g1'
  | 'g2'
  | 'g3'
  | 'g4'
  | 'g5'
  | 'b1'
  | 'r1'
  | 'r2'
  | 'r3'
  | 'r4'
  | 'p1'
  | 'm1'
  // Wave-2 diversity batch — encoded from media-src/wave2/ into
  // public/media/w2-<name>.mp4 by scripts/encode-media.sh's wave-2 section.
  | 'w2got'
  | 'w2expressions'
  | 'w2festival'
  | 'w2baby'
  | 'w2emotional'
  // Owner-supplied "own character" batch — a real recurring man across six
  // portrait 9:16 worlds, for the character-lock showcase (see
  // CharacterLock.tsx).
  | 'own1'
  | 'own2'
  | 'own3'
  | 'own4'
  | 'own5'
  | 'own6'
  // Gallery expander closer — landscape drone showcase shot.
  | 'showcaseAerial'
  // Second addendum batch — the character-sheet still (the recipe output
  // itself), an alley clip for the "second character" proof row, and two
  // more Gallery-expander plates.
  | 'charSheet'
  | 'ownAlley'
  | 'emberCity'
  | 'rainGlass';

export type MediaEntry = {
  src: string;
  poster?: string;
};

/**
 * Slot ids that can't carry a dash (not a valid identifier char) map to a
 * different on-disk file stem here. Every other slot's stem is just its id.
 */
const PENDING_STEMS: Partial<Record<SlotId, string>> = {
  w2got: 'w2-got',
  w2expressions: 'w2-expressions',
  w2festival: 'w2-festival',
  w2baby: 'w2-baby',
  w2emotional: 'w2-emotional',
  own1: 'own-1',
  own2: 'own-2',
  own3: 'own-3',
  own4: 'own-4',
  own5: 'own-5',
  own6: 'own-6',
  showcaseAerial: 'showcase-aerial',
  charSheet: 'character-sheet',
  ownAlley: 'own-alley',
  emberCity: 'ember-city',
  rainGlass: 'rain-glass',
};

/**
 * All wave-2/owner clips have landed under public/media/ (see
 * scripts/encode-media.sh's wave-2 section) — this allowlist is now empty
 * so the disk-existence check in test/unit/media.test.ts is strict for
 * every slot, with no exceptions.
 */
export const PENDING_MEDIA: ReadonlySet<SlotId> = new Set();

function slot(id: SlotId): MediaEntry {
  const stem = PENDING_STEMS[id] ?? id;
  return { src: `/media/${stem}.mp4`, poster: `/media/posters/${stem}.jpg` };
}

/** For still-image slots (e.g. a recipe's actual output card) — no poster, src is the image itself. */
function imageSlot(id: SlotId): MediaEntry {
  const stem = PENDING_STEMS[id] ?? id;
  return { src: `/media/${stem}.jpg` };
}

export const MEDIA: Record<SlotId, MediaEntry> = {
  // Hero video wall — 4 columns of 2 clips each, alternating drift direction.
  wall1: slot('wall1'),
  wall2: slot('wall2'),
  wall3: slot('wall3'),
  wall4: slot('wall4'),
  wall5: slot('wall5'),
  wall6: slot('wall6'),
  wall7: slot('wall7'),
  wall8: slot('wall8'),
  // Gallery grid.
  g1: slot('g1'),
  g2: slot('g2'),
  g3: slot('g3'),
  g4: slot('g4'),
  g5: slot('g5'),
  // Image -> video before/after.
  b1: slot('b1'),
  // Recipes curated grid.
  r1: slot('r1'),
  r2: slot('r2'),
  r3: slot('r3'),
  r4: slot('r4'),
  // Entry overlay popup background.
  p1: slot('p1'),
  // Signup modal showreel clip.
  m1: slot('m1'),
  // Wave-2 diversity batch.
  w2got: slot('w2got'),
  w2expressions: slot('w2expressions'),
  w2festival: slot('w2festival'),
  w2baby: slot('w2baby'),
  w2emotional: slot('w2emotional'),
  // Owner "own character" batch — jungle selfie-climb, ancient temple
  // wander, shocked close-up at home, aurora night ski run, jellyfish dive,
  // slot-canyon divine light. All portrait 9:16, same man throughout.
  own1: slot('own1'),
  own2: slot('own2'),
  own3: slot('own3'),
  own4: slot('own4'),
  own5: slot('own5'),
  own6: slot('own6'),
  // Gallery expander closer.
  showcaseAerial: slot('showcaseAerial'),
  // Character Sheet — the "Character Sheet" recipe's actual output card for
  // a third character ("Arthur Penhaligon"). A still image, not a clip.
  charSheet: imageSlot('charSheet'),
  // Character A, second-character proof row.
  ownAlley: slot('ownAlley'),
  // Gallery expander plates.
  emberCity: slot('emberCity'),
  rainGlass: slot('rainGlass'),
};
