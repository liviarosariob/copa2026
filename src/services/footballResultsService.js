import { findCountry } from "./countries.js";

const API_KEY_STORAGE = "football-data-api-key";
const API_BASE_URL = "https://api.football-data.org/v4";
const COMPETITION_CODE = "WC";
const SEASON = "2026";

function normalizeTeam(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function statusFromApi(status) {
  if (status === "FINISHED") return "finalizado";
  if (["IN_PLAY", "PAUSED", "LIVE", "EXTRA_TIME", "PENALTY_SHOOTOUT"].includes(status)) return "ao vivo";
  return "agendado";
}

function dateRange(rounds) {
  const dates = (rounds || []).map((round) => round.data).filter(Boolean).sort();
  if (!dates.length) return null;
  return { from: dates[0], to: dates[dates.length - 1] };
}

function buildMatchesUrl(rounds) {
  const url = new URL(`${API_BASE_URL}/competitions/${COMPETITION_CODE}/matches`);
  url.searchParams.set("season", SEASON);
  const range = dateRange(rounds);
  if (range) {
    url.searchParams.set("dateFrom", range.from);
    url.searchParams.set("dateTo", range.to);
  }
  return url;
}

function teamMatches(apiTeam, localName, localSigla) {
  const local = findCountry(localSigla) || findCountry(localName);
  const candidates = [
    apiTeam?.name,
    apiTeam?.shortName,
    apiTeam?.tla
  ].map(normalizeTeam);

  const expected = [
    localName,
    localSigla,
    local?.name,
    local?.sigla,
    ...(local?.aliases || [])
  ].map(normalizeTeam);

  return expected.some((item) => item && candidates.includes(item));
}

function findMatch(game, matches) {
  for (const match of matches) {
    const direct =
      teamMatches(match.homeTeam, game.timeCasa, game.siglaCasa) &&
      teamMatches(match.awayTeam, game.timeFora, game.siglaFora);
    if (direct) return { match, swapped: false };

    const swapped =
      teamMatches(match.homeTeam, game.timeFora, game.siglaFora) &&
      teamMatches(match.awayTeam, game.timeCasa, game.siglaCasa);
    if (swapped) return { match, swapped: true };
  }
  return null;
}

function penaltyWinner(game, match, swapped) {
  const fullTime = match.score?.fullTime || {};
  if (fullTime.home !== fullTime.away) return game.resultado?.penaltis || null;
  if (match.score?.winner === "HOME_TEAM") return swapped ? game.timeFora : game.timeCasa;
  if (match.score?.winner === "AWAY_TEAM") return swapped ? game.timeCasa : game.timeFora;
  return game.resultado?.penaltis || null;
}

function headerValue(headers, names) {
  return names.map((name) => headers.get(name)).find(Boolean) || "";
}

function apiStatusMessage(response, updatedCount) {
  const available = headerValue(response.headers, ["X-RequestsAvailable", "X-Requests-Available", "X-RequestsAvailable-Minute", "X-Requests-Available-Minute"]);
  const reset = headerValue(response.headers, ["X-RequestCounter-Reset", "X-Request-Counter-Reset"]);
  const limit = available ? ` Restam ${available} chamadas.` : "";
  const wait = reset ? ` Limite reseta em ${reset}s.` : "";
  return `Resultados atualizados pela API. ${updatedCount} jogo${updatedCount === 1 ? "" : "s"} encontrado${updatedCount === 1 ? "" : "s"}.${limit}${wait}`;
}

function getApiKey() {
  const saved = localStorage.getItem(API_KEY_STORAGE);
  if (saved) return saved;
  const typed = window.prompt("Cole sua API key da football-data.org para atualizar os resultados:");
  const apiKey = String(typed || "").trim();
  if (apiKey) localStorage.setItem(API_KEY_STORAGE, apiKey);
  return apiKey;
}

export async function updateResults(rounds) {
  if (!navigator.onLine) {
    return { rounds, status: "Offline: mantendo os dados salvos." };
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    return { rounds, status: "API key não configurada. Use resultados manuais no JSON ou informe a chave ao atualizar." };
  }

  const response = await fetch(buildMatchesUrl(rounds), {
    headers: { "X-Auth-Token": apiKey }
  });

  if (!response.ok) {
    const reset = headerValue(response.headers, ["X-RequestCounter-Reset", "X-Request-Counter-Reset"]);
    const wait = reset ? ` Tente de novo em ${reset}s.` : "";
    return { rounds, status: `API respondeu erro ${response.status}.${wait}` };
  }

  const payload = await response.json();
  const matches = payload.matches || [];
  let updatedCount = 0;
  const nextRounds = rounds.map((round) => ({
    ...round,
    jogos: (round.jogos || []).map((game) => {
      const found = findMatch(game, matches);
      if (!found) return game;
      const { match, swapped } = found;
      updatedCount += 1;
      const apiFullTime = match.score?.fullTime || {};
      const fullTime = swapped
        ? { home: apiFullTime.away, away: apiFullTime.home }
        : apiFullTime;
      return {
        ...game,
        status: statusFromApi(match.status),
        resultado: Number.isFinite(fullTime.home) && Number.isFinite(fullTime.away)
          ? {
              placarCasa: fullTime.home,
              placarFora: fullTime.away,
              penaltis: penaltyWinner(game, match, swapped),
              atualizadoEm: new Date().toISOString()
            }
          : game.resultado
      };
    })
  }));

  return { rounds: nextRounds, status: apiStatusMessage(response, updatedCount) };
}
