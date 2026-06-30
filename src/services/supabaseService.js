import { SUPABASE_ANON_KEY, SUPABASE_ROW_ID, SUPABASE_TABLE, SUPABASE_URL } from "./supabaseConfig.js";

function configuredUrl() {
  return SUPABASE_URL.trim().replace(/\/$/, "");
}

export function isSupabaseConfigured() {
  return Boolean(configuredUrl() && SUPABASE_ANON_KEY.trim());
}

function headers() {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json"
  };
}

export async function loadRemoteState() {
  if (!isSupabaseConfigured()) return { ok: false, data: null, message: "Supabase não configurado" };

  try {
    const url = `${configuredUrl()}/rest/v1/${SUPABASE_TABLE}?id=eq.${encodeURIComponent(SUPABASE_ROW_ID)}&select=data,updated_at`;
    const response = await fetch(url, { headers: headers() });
    if (!response.ok) return { ok: false, data: null, message: `Supabase erro ${response.status}` };
    const rows = await response.json();
    if (!rows.length) return { ok: true, data: null, message: "Nuvem vazia" };
    return { ok: true, data: rows[0].data, message: "Carregado da nuvem" };
  } catch {
    return { ok: false, data: null, message: "Falha ao carregar da nuvem" };
  }
}

export async function saveRemoteState(state) {
  if (!isSupabaseConfigured()) return { ok: false, message: "Supabase não configurado" };

  try {
    const url = `${configuredUrl()}/rest/v1/${SUPABASE_TABLE}?on_conflict=id`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        ...headers(),
        Prefer: "resolution=merge-duplicates,return=minimal"
      },
      body: JSON.stringify({
        id: SUPABASE_ROW_ID,
        data: state,
        updated_at: new Date().toISOString()
      })
    });
    if (!response.ok) return { ok: false, message: `Supabase erro ${response.status}` };
    return { ok: true, message: "Salvo na nuvem" };
  } catch {
    return { ok: false, message: "Falha ao salvar na nuvem" };
  }
}
