import { AppError } from './errors/app-error';

/** Resolves a value that's either a real ID or a human-typed exact name
 *  (case-insensitive) into its real ID — for fields staff naturally type a
 *  name into rather than hunt down a UUID for (e.g. a Course/Subject/Batch
 *  assignment target with no search picker yet). Ambiguous names (same name
 *  reused elsewhere) get a clear "use the ID instead" error rather than
 *  silently picking one; no match gets a clear not-found error rather than
 *  a raw foreign-key failure or, worse, silently persisting the unresolved
 *  name string into an ID column. */
export async function resolveByIdOrName(
  idOrName: string,
  label: string,
  finder: (id: string) => Promise<{ id: string } | null>,
  searcher: (name: string) => Promise<{ id: string }[]>,
): Promise<string> {
  const byId = await finder(idOrName);
  if (byId) return byId.id;
  const name = idOrName.trim();
  const matches = await searcher(name);
  if (matches.length === 1) return matches[0]!.id;
  if (matches.length > 1) throw AppError.conflict(`Multiple ${label}s are named "${idOrName}" — use its ID instead of its name.`);
  throw AppError.notFound(`${label} not found: "${idOrName}". Use its ID, or its exact name.`);
}
