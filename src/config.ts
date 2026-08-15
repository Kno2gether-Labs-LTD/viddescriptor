/**
 * Public, build-time site configuration.
 *
 * Every field ships with a premium Viddescriptor default and can be
 * overridden by a `VITE_*` env var (see `.env.example`). This module is
 * imported by every landing-page section component, so its shape is a hard
 * contract.
 */

export type SocialLink = {
  label: string;
  href: string;
};

export type Tier = {
  kicker: string;
  price: string;
  per?: string;
  lines: string[];
  cta: string;
  featured?: boolean;
};

export type Pricing = {
  payg: Tier[];
  plans: Tier[];
};

export type Testimonial = {
  quote: string;
  attribution: string;
};

/** Hero headline copy — the three stacked Anton lines, the one accent word/
 *  phrase highlighted in amber wherever it first appears across them, and
 *  the subhead paragraph beneath. Config-driven so a fork can rebrand the
 *  hero without touching Hero.tsx. */
export type HeroCopy = {
  line1: string;
  line2: string;
  line3: string;
  accent: string;
  subtext: string;
};

export type SiteConfig = {
  brandName: string;
  brandAccentSplit: [string, string];
  tagline: string;
  hero: HeroCopy;
  logoUrl?: string;
  siteUrl: string;
  supportEmail: string;
  portalUrl: string;
  githubUrl: string;
  socials: SocialLink[];
  freeCredits: number;
  /** Top-bar/sticky-CTA banner line. Config-driven so a fork never ships an
   *  implied "launch week" event that isn't real — see `DEFAULT_BANNER_TEXT`. */
  bannerText: string;
  upsell: {
    amountLabel: string;
    credits: number;
    fromTo: string;
  };
  offerEndsAt?: string;
  pricing: Pricing;
  showSampleSocialProof: boolean;
  /** Real, owner-supplied testimonial quotes. Empty by default — no
   *  fabricated quotes ship for a fresh white-label deploy. The Compare
   *  section's testimonial cards render only when this is non-empty. */
  testimonials: Testimonial[];
};

/** A loosely-typed env bag: plain object in tests, `import.meta.env` at build time. */
export type EnvLike = Record<string, string | boolean | undefined>;

const DEFAULT_BRAND_NAME = 'Viddescriptor';
const DEFAULT_BRAND_ACCENT_SPLIT: [string, string] = ['VID', 'DESCRIPTOR'];
const DEFAULT_TAGLINE =
  'Type a sentence. Get a finished, film-grade video back — no crew, no editing timeline.';
const DEFAULT_HERO: HeroCopy = {
  line1: 'Describe your film.',
  line2: 'Get it back',
  line3: 'in minutes.',
  accent: 'film',
  subtext:
    'Describe the shot in a sentence — a finished, film-grade video comes back. No crew, no editing timeline.',
};
const DEFAULT_SITE_URL = 'https://viddescriptor.kno2gether.com';
const DEFAULT_SUPPORT_EMAIL = 'support@kno2gether.com';
// Placeholder — real deployments should set VITE_PORTAL_URL to their white-label portal.
const DEFAULT_PORTAL_URL = 'https://viddescriptor.kno2gether.com';
const DEFAULT_GITHUB_URL = 'https://github.com/Kno2gether-Labs-LTD/viddescriptor';
const DEFAULT_FREE_CREDITS = 300;
// `{freeCredits}` is interpolated with the resolved freeCredits value (see
// buildConfig) — no implied event ("launch week"), just the real offer.
const DEFAULT_BANNER_TEXT = 'OPEN SOURCE · {freeCredits} FREE CREDITS ON SIGNUP';
const DEFAULT_UPSELL = {
  amountLabel: '$9',
  credits: 500,
  fromTo: '300 → 800',
};

const DEFAULT_PRICING: Pricing = {
  payg: [
    {
      kicker: 'FREE',
      price: '$0',
      lines: ['300 credits on signup', 'Try every recipe category'],
      cta: 'Sign up free',
    },
    {
      kicker: 'TOP-UP · SMALL',
      price: '$12',
      lines: ['1,000 credits', 'All recipes unlocked'],
      cta: 'Buy credits',
    },
    {
      kicker: 'TOP-UP · CREATOR',
      price: '$39',
      lines: ['4,000 credits · bonus included', 'Character lock + priority render'],
      cta: 'Buy credits',
      featured: true,
    },
    {
      kicker: 'TOP-UP · STUDIO',
      price: '$129',
      lines: ['16,000 credits', 'API access + priority queue'],
      cta: 'Buy credits',
    },
  ],
  plans: [
    {
      kicker: 'FREE',
      price: '$0',
      lines: ['300 credits once', 'Try every recipe category'],
      cta: 'Start free',
    },
    {
      kicker: 'STARTER',
      price: '$15',
      per: '/mo',
      lines: ['1,600 credits / mo', 'All recipes unlocked'],
      cta: 'Choose Starter',
    },
    {
      kicker: 'PRO',
      price: '$39',
      per: '/mo',
      lines: ['5,000 credits / mo', 'Character lock + priority render'],
      cta: 'Choose Pro',
      featured: true,
    },
    {
      kicker: 'STUDIO',
      price: '$99',
      per: '/mo',
      lines: ['15,000 credits / mo', 'API access + 5 seats'],
      cta: 'Choose Studio',
    },
  ],
};

function readString(env: EnvLike, key: string, fallback: string): string {
  const raw = env[key];
  return typeof raw === 'string' && raw.trim() !== '' ? raw : fallback;
}

function readOptionalString(env: EnvLike, key: string): string | undefined {
  const raw = env[key];
  return typeof raw === 'string' && raw.trim() !== '' ? raw : undefined;
}

function readNumber(env: EnvLike, key: string, fallback: number): number {
  const raw = env[key];
  if (typeof raw !== 'string' || raw.trim() === '') return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readBoolean(env: EnvLike, key: string, fallback: boolean): boolean {
  const raw = env[key];
  if (typeof raw === 'boolean') return raw;
  if (typeof raw !== 'string' || raw.trim() === '') return fallback;
  return raw.trim().toLowerCase() === 'true' || raw.trim() === '1';
}

function readJson<T>(env: EnvLike, key: string, fallback: T): T {
  const raw = env[key];
  if (typeof raw !== 'string' || raw.trim() === '') return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    // Invalid JSON must never crash config resolution — fall back silently.
    return fallback;
  }
}

function readAccentSplit(env: EnvLike): [string, string] {
  const raw = env.VITE_BRAND_ACCENT_SPLIT;
  if (typeof raw !== 'string' || raw.trim() === '') return DEFAULT_BRAND_ACCENT_SPLIT;
  const parts = raw.split(',').map((part) => part.trim());
  if (parts.length !== 2 || parts.some((part) => part === '')) {
    return DEFAULT_BRAND_ACCENT_SPLIT;
  }
  return [parts[0]!, parts[1]!];
}

export function buildConfig(env: EnvLike): SiteConfig {
  const freeCredits = readNumber(env, 'VITE_FREE_CREDITS', DEFAULT_FREE_CREDITS);
  const bannerTemplate = readString(env, 'VITE_BANNER_TEXT', DEFAULT_BANNER_TEXT);
  return {
    brandName: readString(env, 'VITE_BRAND_NAME', DEFAULT_BRAND_NAME),
    brandAccentSplit: readAccentSplit(env),
    tagline: readString(env, 'VITE_TAGLINE', DEFAULT_TAGLINE),
    hero: {
      line1: readString(env, 'VITE_HERO_LINE1', DEFAULT_HERO.line1),
      line2: readString(env, 'VITE_HERO_LINE2', DEFAULT_HERO.line2),
      line3: readString(env, 'VITE_HERO_LINE3', DEFAULT_HERO.line3),
      accent: readString(env, 'VITE_HERO_ACCENT', DEFAULT_HERO.accent),
      subtext: readString(env, 'VITE_HERO_SUBTEXT', DEFAULT_HERO.subtext),
    },
    logoUrl: readOptionalString(env, 'VITE_LOGO_URL'),
    siteUrl: readString(env, 'VITE_SITE_URL', DEFAULT_SITE_URL),
    supportEmail: readString(env, 'VITE_SUPPORT_EMAIL', DEFAULT_SUPPORT_EMAIL),
    portalUrl: readString(env, 'VITE_PORTAL_URL', DEFAULT_PORTAL_URL),
    githubUrl: readString(env, 'VITE_GITHUB_URL', DEFAULT_GITHUB_URL),
    socials: readJson<SocialLink[]>(env, 'VITE_SOCIALS_JSON', []),
    freeCredits,
    bannerText: bannerTemplate.replace('{freeCredits}', String(freeCredits)),
    upsell: {
      amountLabel: readString(env, 'VITE_UPSELL_AMOUNT_LABEL', DEFAULT_UPSELL.amountLabel),
      credits: readNumber(env, 'VITE_UPSELL_CREDITS', DEFAULT_UPSELL.credits),
      fromTo: readString(env, 'VITE_UPSELL_FROM_TO', DEFAULT_UPSELL.fromTo),
    },
    offerEndsAt: readOptionalString(env, 'VITE_OFFER_ENDS_AT'),
    pricing: readJson<Pricing>(env, 'VITE_PRICING_JSON', DEFAULT_PRICING),
    showSampleSocialProof: readBoolean(env, 'VITE_SHOW_SAMPLE_SOCIAL_PROOF', false),
    testimonials: readJson<Testimonial[]>(env, 'VITE_TESTIMONIALS_JSON', []),
  };
}

export const siteConfig: SiteConfig = buildConfig(import.meta.env as unknown as EnvLike);
