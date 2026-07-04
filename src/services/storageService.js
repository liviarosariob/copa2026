const STORAGE_KEY = "bolao-livia-camila-2026";

const defaultState = {
  rounds: [],
  lastUpdatedAt: null,
  updatedAt: null,
  apiStatus: "Ainda não atualizado",
  syncStatus: "Nuvem não configurada"
};

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...defaultState, ...JSON.parse(raw) } : defaultState;
  } catch {
    return defaultState;
  }
}

export function saveState(state) {
  const nextState = { ...defaultState, ...state };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
  return nextState;
}

export function clearState() {
  localStorage.removeItem(STORAGE_KEY);
  return defaultState;
}
