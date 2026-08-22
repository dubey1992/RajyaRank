interface LeadAttribution {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  referrerHost: string | null;
  landingPath: string | null;
}

/** Turns a lead's stored first-touch attribution into a compact,
 *  human-readable line for the admin queue. UTM params win when present
 *  (an intentional campaign link); otherwise falls back to the external
 *  referrer host; otherwise it's a direct/bookmarked visit. */
export function formatLeadSource(row: LeadAttribution, hi: boolean): string {
  const channel = row.utmSource
    ? row.utmMedium
      ? `${row.utmSource} / ${row.utmMedium}`
      : row.utmSource
    : row.referrerHost || (hi ? 'सीधा' : 'Direct');
  const parts = [channel];
  if (row.utmCampaign) parts.push(`"${row.utmCampaign}"`);
  if (row.landingPath && row.landingPath !== '/') parts.push(hi ? `→ ${row.landingPath}` : `landed on ${row.landingPath}`);
  return parts.join(' · ');
}
