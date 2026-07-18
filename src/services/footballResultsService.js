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
  return [...new Set((rounds || []).flatMap((round) => (round.jogos || []).map((game) => game.data)).filter(Boolean))];
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

function numericScore(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function scoreFromLinescores(competitor) {
  const linescores = competitor?.linescores;
  if (!Array.isArray(linescores) || linescores.length < 2) return null;
  const firstHalf = numericScore(linescores[0]?.value ?? linescores[0]?.displayValue);
  const secondHalf = numericScore(linescores[1]?.value ?? linescores[1]?.displayValue);
  if (firstHalf === null || secondHalf === null) return null;
  return firstHalf + secondHalf;
}

function regularTimeScore(game, localHome, localAway, fallbackHome, fallbackAway) {
  if (!game.mataMata) return { placarCasa: fallbackHome, placarFora: fallbackAway };
  const regularHome = scoreFromLinescores(localHome);
  const regularAway = scoreFromLinescores(localAway);
  if (regularHome === null || regularAway === null) return { placarCasa: fallbackHome, placarFora: fallbackAway };
  return { placarCasa: regularHome, placarFora: regularAway };
}

function decisionMethod(placarCasa, placarFora, finalScoreCasa, finalScoreFora) {
  if (finalScoreCasa !== placarCasa || finalScoreFora !== placarFora) return "prorrogação";
  return "pênaltis";
}

function mapEventToGame(game, event, swapped) {
  const competition = event.competitions?.[0];
  const apiHome = competitorByHomeAway(competition, "home");
  const apiAway = competitorByHomeAway(competition, "away");
  const localHome = swapped ? apiAway : apiHome;
  const localAway = swapped ? apiHome : apiAway;
  const finalScoreCasa = Number(localHome?.score);
  const finalScoreFora = Number(localAway?.score);
  const status = statusFromEspn(competition?.status);
  const regularScore = regularTimeScore(game, localHome, localAway, finalScoreCasa, finalScoreFora);
  const placarCasa = regularScore.placarCasa;
  const placarFora = regularScore.placarFora;
  let classificado = game.resultado?.classificado || game.resultado?.ganhador || game.resultado?.vencedor || game.resultado?.penaltis || null;
  let decisao = game.resultado?.decisao || null;
  let penaltis = game.resultado?.penaltis || null;

  if (game.mataMata && Number.isFinite(placarCasa) && Number.isFinite(placarFora)) {
    if (placarCasa === placarFora) {
      if (localHome?.winner) classificado = game.timeCasa;
      if (localAway?.winner) classificado = game.timeFora;
      if (classificado) decisao = decisionMethod(placarCasa, placarFora, finalScoreCasa, finalScoreFora);
      penaltis = decisao === "pênaltis" ? classificado : null;
    } else {
      classificado = null;
      decisao = null;
      penaltis = null;
    }
  }

  return {
    ...game,
    status,
    resultado: status !== "agendado" && Number.isFinite(placarCasa) && Number.isFinite(placarFora)
      ? {
          placarCasa,
          placarFora,
          placarOficialCasa: finalScoreCasa,
          placarOficialFora: finalScoreFora,
          penaltis,
          classificado,
          decisao,
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
