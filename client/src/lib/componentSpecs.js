// Client-side helpers around the /api/components catalog.
export const PROVIDERS = [
  { key: 'aws', label: 'AWS' },
  { key: 'azure', label: 'Azure' },
  { key: 'gcp', label: 'GCP' },
  { key: 'onprem', label: 'On-Prem' }
];

export function providerLabel(spec, provider) {
  return spec?.providers?.[provider] || spec?.label;
}

export function matchesSearch(spec, query) {
  if (!query) return true;
  const q = query.toLowerCase();
  const haystack = [
    spec.label,
    spec.category,
    spec.description,
    ...(spec.tags || []),
    ...Object.values(spec.providers || {})
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}
