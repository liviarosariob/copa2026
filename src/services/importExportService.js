import { PARTICIPANTES } from "./scoringService.js";
import { enrichCountryFields } from "./countries.js";

function isNumber(value) {
  return Number.isFinite(value);
}

function sortGames(games) {
  return [...games].sort((a, b) => `${a.data || ""}-${a.horario || ""}-${a.id || ""}`.localeCompare(`${b.data || ""}-${b.horario || ""}-${b.id || ""}`));
}

export function migrateRound(round) {
  if (!round || typeof round !== "object") return round;
  const { data: legacyDate, ...rest } = round;
  return {
    ...rest,
    jogos: sortGames((round.jogos || []).map((game) => enrichCountryFields({ ...game, data: game.data || legacyDate })))
  };
}

export function migrateRounds(rounds) {
  const byRound = new Map();

  (rounds || []).map(migrateRound).forEach((round) => {
    if (!round?.rodada) return;
    const current = byRound.get(round.rodada) || { rodada: round.rodada, jogos: [] };
    const gamesById = new Map(current.jogos.map((game) => [game.id, game]));
    (round.jogos || []).forEach((game) => gamesById.set(game.id, game));
    byRound.set(round.rodada, { ...current, ...round, jogos: sortGames([...gamesById.values()]) });
  });

  return [...byRound.values()].sort((a, b) => {
    const firstGameA = a.jogos[0] || {};
    const firstGameB = b.jogos[0] || {};
    return `${firstGameA.data || ""}-${a.rodada}`.localeCompare(`${firstGameB.data || ""}-${b.rodada}`);
  });
}

export function validateRound(input) {
  const errors = [];
  const round = input && typeof input === "object"
    ? migrateRound(input)
    : input;
  if (!round || typeof round !== "object") errors.push("O texto precisa conter um objeto JSON.");
  if (!round?.rodada) errors.push("Informe o nome da rodada.");
  if (!Array.isArray(round?.jogos) || round.jogos.length === 0) errors.push("Inclua pelo menos um jogo.");

  (round?.jogos || []).forEach((game, index) => {
    const label = game?.id || `jogo ${index + 1}`;
    ["id", "data", "timeCasa", "timeFora", "siglaCasa", "siglaFora", "horario"].forEach((field) => {
      if (!game?.[field]) errors.push(`${label}: campo "${field}" é obrigatório.`);
    });
    if (!Array.isArray(game?.palpites)) {
      errors.push(`${label}: inclua os palpites de Lívia e Camila.`);
      return;
    }
    const names = game.palpites.map((guess) => guess.participante).sort();
    if (names.join("|") !== [...PARTICIPANTES].sort().join("|")) {
      errors.push(`${label}: os palpites precisam ser apenas de Lívia e Camila.`);
    }
    PARTICIPANTES.forEach((name) => {
      const guess = game.palpites.find((item) => item.participante === name);
      if (!guess) errors.push(`${label}: falta o palpite de ${name}.`);
      if (guess && (!isNumber(guess.placarCasa) || !isNumber(guess.placarFora))) {
        errors.push(`${label}: o placar do palpite de ${name} precisa ser numérico.`);
      }
    });
  });

  return errors;
}

export function importRound(currentRounds, round) {
  const enrichedRound = migrateRound(round);
  const errors = validateRound(enrichedRound);
  if (errors.length) return { ok: false, errors };
  return { ok: true, rounds: migrateRounds([...currentRounds, enrichedRound]) };
}
