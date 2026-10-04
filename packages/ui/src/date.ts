/** The one date-display format for the whole app: dd/mm/yyyy. Deliberately
 *  not Intl/toLocaleDateString-based — those vary by locale/options (several
 *  call sites used 'en-IN'/'hi-IN' with a spelled-out month, others 'en-GB',
 *  none consistently), so this builds the string directly from the date's
 *  own fields for a guaranteed, locale-independent result. Numeric dd/mm/yyyy
 *  doesn't need a Hindi/English variant — it reads the same in both. */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/** dd/mm/yyyy, hh:mm — for places that showed a time alongside the date
 *  (e.g. "last accessed", "sent at"). 24-hour, zero-padded, same
 *  locale-independent approach as formatDate. */
export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '';
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${formatDate(d)}, ${hh}:${min}`;
}
