export type Env = {
  ASSETS: Fetcher;
  PARTNER_API_BASE: string;
  PARTNER_API_KEY: string;
  /**
   * Which transport to use to reach the partner platform with the same
   * pkt_ key:
   *  - 'gateway' (default when unset): base is the MCP gateway
   *    (https://mcp.knotie-ai.pro), auth via `Authorization: Bearer`, hits
   *    the /api/partner-rest/tools/<tool> REST wrappers.
   *  - 'direct': base is the app (https://app.knotie-ai.pro), auth via
   *    `x-api-key`, hits the /api/partner/... routes directly.
   * See worker/partnerApi.ts for the op → (method, path) mapping.
   */
  PARTNER_API_STYLE?: 'gateway' | 'direct';
  EXPERIENCE_TYPE: string;
  FREE_PLAN_ID?: string;
  /** JSON object of feature toggles applied at onboarding (PlanFeatures-shaped overrides).
   *  Default {"showMediaStudio":true} — the onboard API binds the experience but does NOT
   *  switch the studio nav on by itself; without this the customer sees "Media Studio Not Enabled". */
  ONBOARD_FEATURES_JSON?: string;
  FREE_CREDITS: string;
  UPSELL_AMOUNT_CENTS: string;
  UPSELL_CURRENCY: string;
  UPSELL_CREDITS: string;
  SITE_URL: string;
};
