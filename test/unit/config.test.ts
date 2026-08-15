import { describe, it, expect } from 'vitest';
import { buildConfig, siteConfig } from '../../src/config';

describe('buildConfig defaults (Viddescriptor brand)', () => {
  it('bakes in the Viddescriptor brand defaults', () => {
    const config = buildConfig({});
    expect(config.brandName).toBe('Viddescriptor');
    expect(config.brandAccentSplit).toEqual(['VID', 'DESCRIPTOR']);
    expect(config.tagline.length).toBeGreaterThan(0);
    expect(config.hero).toEqual({
      line1: 'Describe your film.',
      line2: 'Get it back',
      line3: 'in minutes.',
      accent: 'film',
      subtext:
        'Describe the shot in a sentence — a finished, film-grade video comes back. No crew, no editing timeline.',
    });
    expect(config.logoUrl).toBeUndefined();
    expect(config.siteUrl).toBe('https://viddescriptor.kno2gether.com');
    expect(config.supportEmail).toBe('support@kno2gether.com');
    expect(config.portalUrl).toBe('https://viddescriptor.kno2gether.com');
    expect(config.portalUrl.length).toBeGreaterThan(0);
    expect(config.githubUrl).toBe('https://github.com/Kno2gether-Labs-LTD/viddescriptor');
    expect(config.socials).toEqual([]);
  });

  it('bakes in the free credit + upsell defaults', () => {
    const config = buildConfig({});
    expect(config.freeCredits).toBe(300);
    expect(config.upsell).toEqual({
      amountLabel: '$9',
      credits: 500,
      fromTo: '300 → 800',
    });
  });

  it('hides the countdown by leaving offerEndsAt unset', () => {
    const config = buildConfig({});
    expect(config.offerEndsAt).toBeUndefined();
  });

  it('bakes in a default bannerText that names the real free-credit offer, not a fake launch event', () => {
    const config = buildConfig({});
    expect(config.bannerText).toBe('OPEN SOURCE · 300 FREE CREDITS ON SIGNUP');
    expect(config.bannerText).not.toMatch(/launch week/i);
  });

  it('defaults sample social proof to hidden', () => {
    const config = buildConfig({});
    expect(config.showSampleSocialProof).toBe(false);
  });

  it('defaults testimonials to an empty array (no fabricated quotes ship by default)', () => {
    const config = buildConfig({});
    expect(config.testimonials).toEqual([]);
  });

  it('ships at least 4 payg tiers and 4 plan tiers with a featured tier in each', () => {
    const config = buildConfig({});
    expect(config.pricing.payg.length).toBeGreaterThanOrEqual(3);
    expect(config.pricing.plans.length).toBeGreaterThanOrEqual(3);
    expect(config.pricing.payg.some((tier) => tier.featured)).toBe(true);
    expect(config.pricing.plans.some((tier) => tier.featured)).toBe(true);
    // Every tier line-item is short enough to render in a pricing card.
    for (const tier of [...config.pricing.payg, ...config.pricing.plans]) {
      expect(tier.kicker.length).toBeGreaterThan(0);
      expect(tier.price.length).toBeGreaterThan(0);
      expect(tier.cta.length).toBeGreaterThan(0);
      expect(tier.lines.length).toBeGreaterThan(0);
    }
  });
});

describe('buildConfig env overrides', () => {
  it('respects VITE_BRAND_NAME', () => {
    expect(buildConfig({ VITE_BRAND_NAME: 'X' }).brandName).toBe('X');
  });

  it('respects VITE_BRAND_ACCENT_SPLIT as a two-part comma split', () => {
    const config = buildConfig({ VITE_BRAND_ACCENT_SPLIT: 'FOO,BAR' });
    expect(config.brandAccentSplit).toEqual(['FOO', 'BAR']);
  });

  it('falls back to the default accent split when malformed', () => {
    const config = buildConfig({ VITE_BRAND_ACCENT_SPLIT: 'ONLY-ONE-PART' });
    expect(config.brandAccentSplit).toEqual(['VID', 'DESCRIPTOR']);
  });

  it('respects VITE_SITE_URL, VITE_SUPPORT_EMAIL, VITE_PORTAL_URL, VITE_GITHUB_URL', () => {
    const config = buildConfig({
      VITE_SITE_URL: 'https://example.com',
      VITE_SUPPORT_EMAIL: 'help@example.com',
      VITE_PORTAL_URL: 'https://portal.example.com',
      VITE_GITHUB_URL: 'https://github.com/example/example',
    });
    expect(config.siteUrl).toBe('https://example.com');
    expect(config.supportEmail).toBe('help@example.com');
    expect(config.portalUrl).toBe('https://portal.example.com');
    expect(config.githubUrl).toBe('https://github.com/example/example');
  });

  it('respects the VITE_HERO_* overrides', () => {
    const config = buildConfig({
      VITE_HERO_LINE1: 'One line.',
      VITE_HERO_LINE2: 'Two line',
      VITE_HERO_LINE3: 'in seconds.',
      VITE_HERO_ACCENT: 'seconds',
      VITE_HERO_SUBTEXT: 'A custom subhead.',
    });
    expect(config.hero).toEqual({
      line1: 'One line.',
      line2: 'Two line',
      line3: 'in seconds.',
      accent: 'seconds',
      subtext: 'A custom subhead.',
    });
  });

  it('falls back to hero defaults per-field when individual VITE_HERO_* vars are unset', () => {
    const config = buildConfig({ VITE_HERO_ACCENT: 'minutes' });
    expect(config.hero.line1).toBe('Describe your film.');
    expect(config.hero.line2).toBe('Get it back');
    expect(config.hero.line3).toBe('in minutes.');
    expect(config.hero.accent).toBe('minutes');
  });

  it('respects VITE_LOGO_URL', () => {
    expect(buildConfig({ VITE_LOGO_URL: 'https://example.com/logo.svg' }).logoUrl).toBe(
      'https://example.com/logo.svg',
    );
  });

  it('parses VITE_FREE_CREDITS as a number, ignoring garbage', () => {
    expect(buildConfig({ VITE_FREE_CREDITS: '750' }).freeCredits).toBe(750);
    expect(buildConfig({ VITE_FREE_CREDITS: 'not-a-number' }).freeCredits).toBe(300);
  });

  it('respects upsell overrides', () => {
    const config = buildConfig({
      VITE_UPSELL_AMOUNT_LABEL: '$19',
      VITE_UPSELL_CREDITS: '1000',
      VITE_UPSELL_FROM_TO: '300 → 1300',
    });
    expect(config.upsell).toEqual({
      amountLabel: '$19',
      credits: 1000,
      fromTo: '300 → 1300',
    });
  });

  it('respects VITE_BANNER_TEXT and interpolates {freeCredits} against the resolved value', () => {
    expect(
      buildConfig({ VITE_BANNER_TEXT: 'CUSTOM · {freeCredits} FREE', VITE_FREE_CREDITS: '500' }).bannerText,
    ).toBe('CUSTOM · 500 FREE');
    // Literal overrides with no placeholder pass through unchanged.
    expect(buildConfig({ VITE_BANNER_TEXT: 'JUST A BANNER' }).bannerText).toBe('JUST A BANNER');
  });

  it('shows the countdown once VITE_OFFER_ENDS_AT is set', () => {
    expect(buildConfig({ VITE_OFFER_ENDS_AT: '2026-09-01T00:00:00Z' }).offerEndsAt).toBe(
      '2026-09-01T00:00:00Z',
    );
  });

  it('respects VITE_SHOW_SAMPLE_SOCIAL_PROOF truthy values', () => {
    expect(buildConfig({ VITE_SHOW_SAMPLE_SOCIAL_PROOF: 'true' }).showSampleSocialProof).toBe(
      true,
    );
    expect(buildConfig({ VITE_SHOW_SAMPLE_SOCIAL_PROOF: 'false' }).showSampleSocialProof).toBe(
      false,
    );
  });

  it('parses VITE_TESTIMONIALS_JSON into testimonials', () => {
    const config = buildConfig({
      VITE_TESTIMONIALS_JSON: JSON.stringify([
        { quote: 'Great tool', attribution: 'A REAL CUSTOMER' },
      ]),
    });
    expect(config.testimonials).toEqual([{ quote: 'Great tool', attribution: 'A REAL CUSTOMER' }]);
  });

  it('falls back to an empty testimonials array without throwing when VITE_TESTIMONIALS_JSON is invalid', () => {
    expect(() => buildConfig({ VITE_TESTIMONIALS_JSON: '{not valid json' })).not.toThrow();
    expect(buildConfig({ VITE_TESTIMONIALS_JSON: '{not valid json' }).testimonials).toEqual([]);
  });

  it('parses VITE_SOCIALS_JSON into socials', () => {
    const config = buildConfig({
      VITE_SOCIALS_JSON: JSON.stringify([{ label: 'X', href: 'https://x.com/vid' }]),
    });
    expect(config.socials).toEqual([{ label: 'X', href: 'https://x.com/vid' }]);
  });

  it('replaces pricing entirely when VITE_PRICING_JSON is valid', () => {
    const customPricing = {
      payg: [{ kicker: 'ONLY', price: '$1', lines: ['one credit'], cta: 'Buy' }],
      plans: [{ kicker: 'ONLY', price: '$1', per: '/mo', lines: ['one credit/mo'], cta: 'Buy' }],
    };
    const config = buildConfig({ VITE_PRICING_JSON: JSON.stringify(customPricing) });
    expect(config.pricing).toEqual(customPricing);
  });

  it('falls back to default pricing without throwing when VITE_PRICING_JSON is invalid', () => {
    expect(() => buildConfig({ VITE_PRICING_JSON: '{not valid json' })).not.toThrow();
    const config = buildConfig({ VITE_PRICING_JSON: '{not valid json' });
    expect(config.pricing.payg.length).toBeGreaterThanOrEqual(3);
    expect(config.pricing).toEqual(buildConfig({}).pricing);
  });
});

describe('siteConfig', () => {
  it('is exported and built from import.meta.env', () => {
    expect(siteConfig.brandName).toBe('Viddescriptor');
    expect(siteConfig.freeCredits).toBe(300);
    expect(siteConfig.bannerText).toBe('OPEN SOURCE · 300 FREE CREDITS ON SIGNUP');
  });
});
