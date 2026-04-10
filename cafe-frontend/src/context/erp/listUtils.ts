export function normalizeLabel(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

export function uniqueByLower(items: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const v = normalizeLabel(raw);
    if (!v) continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

export function cleanInitialList(items: string[] | undefined, legacy: Set<string>) {
  const cleaned = uniqueByLower(items ?? []);
  if (cleaned.length > 0 && cleaned.every(v => legacy.has(v))) return [];
  return cleaned;
}
