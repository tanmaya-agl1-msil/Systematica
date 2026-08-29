const BASE = '/api';

async function req(path, opts = {}) {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  health: () => req('/health'),
  components: () => req('/components'),
  evaluate: (nodes, edges) =>
    req('/evaluate', { method: 'POST', body: JSON.stringify({ nodes, edges }) }),
  listDesigns: () => req('/designs'),
  getDesign: (id) => req('/designs/' + id),
  saveDesign: (payload) =>
    req('/designs', { method: 'POST', body: JSON.stringify(payload) }),
  updateDesign: (id, payload) =>
    req('/designs/' + id, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteDesign: (id) => req('/designs/' + id, { method: 'DELETE' })
};
