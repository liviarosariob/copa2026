import { findCountry } from "./countries.js";

const ESPN_BASE_URL = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";

function normalizeTeam(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function uniqueDates(rounds) {
  return [...new Set((rounds || []).map((round) => round.data).filter(Boolean))];
}

function espnDate(value) {
  return String(value || "").replace(/-/g, "");
}

function teamMatches(apiTeam, localName, localSigla) {
  const local = findCountry(localSigla) || findCountry(localName);
  const candidates = [
    apiTeam?.name,
    apiTeam?.shortDisplayName,
    apiTeam?.displayName,
    apiTeam?.abbreviation
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

function competitorByHomeAway(competition, homeAway) {
  return (competition?.competitors || []).find((competitor) => competitor.homeAway === homeAway);
}

function findMatch(game, events) {
  for (const event of events) {
    const competition = event.competitions?.[0];
    const home = competitorByHomeAway(competition, "home")?.team;
    const away = competitorByHomeAway(competition, "away")?.team;
    const direct = teamMatches(home, game.timeCasa, game.siglaCasa) && teamMatches(away, game.timeFora, game.siglaFora);
    if (direct) return { event, swapped: false };

    const swapped = teamMatches(home, game.timeFora, game.siglaFora) && teamMatches(away, game.timeCasa, game.siglaCasa);
    if (swapped) return { event, swapped: true };
  }
  return null;
}

function statusFromEspn(status) {
  const state = status?.type?.state;
  if (status?.type?.completed || state === "post") return "finalizado";
  if (state === "in") return "ao vivo";
  return "agendado";
}

function mapEventToGame(game, event, swapped) {
  const competition = event.competitions?.[0];
  const apiHome = competitorByHomeAway(competition, "home");
  const apiAway = competitorByHomeAway(competition, "away");
  const localHome = swapped ? apiAway : apiHome;
  const localAway = swapped ? apiHome : apiAway;
  const placarCasa = Number(localHome?.score);
  const placarFora = Number(localAway?.score);
  let penaltis = game.resultado?.penaltis || null;

  if (Number.isFinite(placarCasa) && Number.isFinite(placarFora) && placarCasa === placarFora) {
    if (localHome?.winner) penaltis = game.timeCasa;
    if (localAway?.winner) penaltis = game.timeFora;
  }

  return {
    ...game,
    status: statusFromEspn(competition?.status),
    resultado: Number.isFinite(placarCasa) && Number.isFinite(placarFora)
      ? {
          placarCasa,
          placarFora,
          penaltis,
          atualizadoEm: new Date().toISOString(),
          fonte: "espn"
        }
      : game.resultado
  };
}

async function fetchEspnEvents(rounds) {
  const dates = uniqueDates(rounds);
  const urls = dates.length
    ? dates.map((date) => `${ESPN_BASE_URL}?dates=${espnDate(date)}`)
    : [ESPN_BASE_URL];
  const payloads = await Promise.all(
    urls.map((url) => fetch(url).then((response) => response.ok ? response.json() : { events: [] }))
  );
  return payloads.flatMap((payload) => payload.events || []);
}

export async function updateResults(rounds) {
  if (!navigator.onLine) {
    return { rounds, status: "Offline: mantendo os dados salvos." };
  }

  try {
    const events = await fetchEspnEvents(rounds);
    let updatedCount = 0;
    const nextRounds = rounds.map((round) => ({
      ...round,
      jogos: (round.jogos || []).map((game) => {
        const found = findMatch(game, events);
        if (!found) return game;
        updatedCount += 1;
        return mapEventToGame(game, found.event, found.swapped);
      })
    }));

    return {
      rounds: nextRounds,
      status: `ESPN encontrou ${updatedCount} jogo${updatedCount === 1 ? "" : "s"}.`
    };
  } catch {
    return { rounds, status: "ESPN não respondeu agora." };
  }
}
