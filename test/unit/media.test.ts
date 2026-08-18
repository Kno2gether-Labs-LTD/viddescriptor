import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { MEDIA, PENDING_MEDIA, type SlotId } from '../../src/lib/media';

const PUBLIC_DIR = fileURLToPath(new URL('../../public', import.meta.url));

describe('MEDIA slot registry (production media set)', () => {
  const slotIds = Object.keys(MEDIA) as SlotId[];
  const shippedSlotIds = slotIds.filter((id) => !PENDING_MEDIA.has(id));

  it('has all 43 slots, all shipped (PENDING_MEDIA is empty)', () => {
    expect(slotIds.length).toBe(43);
    expect(shippedSlotIds.length).toBe(43);
    expect(PENDING_MEDIA.size).toBe(0);
  });

  // Only slots without a dashed-stem override (see PENDING_STEMS in
  // src/lib/media.ts) and without an image-slot override (charSheet) follow
  // the plain `/media/<id>.mp4` convention — derive the list from the
  // actual registry rather than re-hardcoding the exception list here.
  const plainConventionIds = slotIds.filter((id) => MEDIA[id].src === `/media/${id}.mp4`);

  it.each(plainConventionIds)('slot "%s" has src+poster following the /media/<slot> convention', (id) => {
    const entry = MEDIA[id];
    expect(entry.src).toBe(`/media/${id}.mp4`);
    expect(entry.poster).toBe(`/media/posters/${id}.jpg`);
  });

  it('never references the Higgsfield-branded placeholder set', () => {
    for (const id of slotIds) {
      const entry = MEDIA[id];
      expect(entry.src.toLowerCase()).not.toContain('placeholder');
      if (entry.poster) {
        expect(entry.poster.toLowerCase()).not.toContain('placeholder');
      }
    }
  });

  it.each(shippedSlotIds)('shipped slot "%s" src and poster files actually exist on disk under public/ (strict)', (id) => {
    const entry = MEDIA[id];
    const srcPath = path.join(PUBLIC_DIR, entry.src);
    expect(existsSync(srcPath), `expected ${srcPath} to exist`).toBe(true);
    if (entry.poster) {
      const posterPath = path.join(PUBLIC_DIR, entry.poster);
      expect(existsSync(posterPath), `expected ${posterPath} to exist`).toBe(true);
    }
  });

  it('dashed-stem slots map to /media/<stem>.mp4 (+poster), not /media/<id>.mp4', () => {
    expect(MEDIA.w2got.src).toBe('/media/w2-got.mp4');
    expect(MEDIA.w2got.poster).toBe('/media/posters/w2-got.jpg');
    expect(MEDIA.w2expressions.src).toBe('/media/w2-expressions.mp4');
    expect(MEDIA.w2festival.src).toBe('/media/w2-festival.mp4');
    expect(MEDIA.w2baby.src).toBe('/media/w2-baby.mp4');
    expect(MEDIA.w2emotional.src).toBe('/media/w2-emotional.mp4');

    expect(MEDIA.own1.src).toBe('/media/own-1.mp4');
    expect(MEDIA.own2.src).toBe('/media/own-2.mp4');
    expect(MEDIA.own3.src).toBe('/media/own-3.mp4');
    expect(MEDIA.own4.src).toBe('/media/own-4.mp4');
    expect(MEDIA.own5.src).toBe('/media/own-5.mp4');
    expect(MEDIA.own6.src).toBe('/media/own-6.mp4');

    expect(MEDIA.showcaseAerial.src).toBe('/media/showcase-aerial.mp4');
    expect(MEDIA.ownAlley.src).toBe('/media/own-alley.mp4');
    expect(MEDIA.emberCity.src).toBe('/media/ember-city.mp4');
    expect(MEDIA.rainGlass.src).toBe('/media/rain-glass.mp4');

    expect(MEDIA.filmPaperBoat.src).toBe('/media/film-paper-boat.mp4');
    expect(MEDIA.filmPaperBoat.poster).toBe('/media/posters/film-paper-boat.jpg');
    expect(MEDIA.filmLighthouse.src).toBe('/media/film-lighthouse.mp4');
    expect(MEDIA.filmCave.src).toBe('/media/film-cave.mp4');
  });

  it('charSheet is a still image, not a video — no .mp4/poster', () => {
    expect(MEDIA.charSheet.src).toBe('/media/character-sheet.jpg');
    expect(MEDIA.charSheet.poster).toBeUndefined();
  });

  it('the four Cinema stills are still images, not videos — no .mp4/poster', () => {
    expect(MEDIA.filmStoryboard.src).toBe('/media/film-storyboard.jpg');
    expect(MEDIA.filmStoryboard.poster).toBeUndefined();
    expect(MEDIA.filmSheetBoat.src).toBe('/media/film-sheet-boat.jpg');
    expect(MEDIA.filmSheetBoat.poster).toBeUndefined();
    expect(MEDIA.filmSheetDuck.src).toBe('/media/film-sheet-duck.jpg');
    expect(MEDIA.filmSheetDuck.poster).toBeUndefined();
    expect(MEDIA.filmContact.src).toBe('/media/film-contact.jpg');
    expect(MEDIA.filmContact.poster).toBeUndefined();
  });
});
