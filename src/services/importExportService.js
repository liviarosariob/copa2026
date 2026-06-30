import { PARTICIPANTES } from "./scoringService.js";
import { enrichCountryFields } from "./countries.js";

function isNumber(value) {
  return Number.isFinite(value);
}

export function validateRound(input) {
  const errors = [];
  const round = input && typeof input === "object"
    ? { ...input, jogos: (input.jogos || []).map(enrichCountryFields) }
    : input;
  if (!round || typeof round !== "object") errors.push("O texto precisa conter um objeto JSON.");
  if (!round?.rodada) errors.push("Informe o nome da rodada.");
  if (!round?.data) errors.push("Informe a data da rodada.");
  if (!Array.isArray(round?.jogos) || round.jogos.length === 0) errors.push("Inclua pelo menos um jogo.");

  (round?.jogos || []).forEach((game, index) => {
    const label = game?.id || `jogo ${index + 1}`;
    ["id", "timeCasa", "timeFora", "siglaCasa", "siglaFora", "horario"].forEach((field) => {
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
  const enrichedRound = { ...round, jogos: (round.jogos || []).map(enrichCountryFields) };
  const errors = validateRound(enrichedRound);
  if (errors.length) return { ok: false, errors };
  const nextRounds = [...currentRounds.filter((item) => item.rodada !== enrichedRound.rodada || item.data !== enrichedRound.data), enrichedRound];
  return { ok: true, rounds: nextRounds };
}
