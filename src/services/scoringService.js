export const PARTICIPANTES = ["Lívia", "Camila"];

function hasFinalScore(result) {
  return result && Number.isFinite(result.placarCasa) && Number.isFinite(result.placarFora);
}

function hasStarted(game) {
  return !["agendado", "programado", "não iniciado", "nao iniciado"].includes(String(game?.status || "").trim().toLocaleLowerCase("pt-BR"));
}

function sideFromScore(home, away) {
  if (home > away) return "casa";
  if (away > home) return "fora";
  return "empate";
}

function normalized(value) {
  return String(value || "").trim().toLocaleLowerCase("pt-BR");
}

function declaredWinner(resultLike) {
  return normalized(resultLike.penaltis || resultLike.classificado || resultLike.ganhador || resultLike.vencedor);
}

function qualifiedTeam(game, resultLike) {
  const scoreSide = sideFromScore(resultLike.placarCasa, resultLike.placarFora);
  if (!game.mataMata || scoreSide !== "empate") return scoreSide;
  const winner = declaredWinner(resultLike);
  if (!winner) return "";
  if (winner === normalized(game.timeCasa) || winner === normalized(game.siglaCasa)) return "casa";
  if (winner === normalized(game.timeFora) || winner === normalized(game.siglaFora)) return "fora";
  return winner;
}

export function calculateScore(game, result, palpite) {
  if (!palpite) {
    return {
      participante: "",
      pontos: 0,
      acertouVencedor: false,
      acertouPlacar: false,
      descricaoCurta: "Sem palpite"
    };
  }

  if (!hasStarted(game) || !hasFinalScore(result)) {
    return {
      participante: palpite.participante,
      pontos: 0,
      acertouVencedor: false,
      acertouPlacar: false,
      descricaoCurta: "Aguardando resultado"
    };
  }

  const acertouPlacar = result.placarCasa === palpite.placarCasa && result.placarFora === palpite.placarFora;
  const winnerResult = qualifiedTeam(game, result);
  const winnerGuess = qualifiedTeam(game, palpite);
  const acertouVencedor = Boolean(winnerResult && winnerGuess && winnerResult === winnerGuess);
  const pontos = (acertouVencedor ? 1 : 0) + (acertouPlacar ? 2 : 0);
  const descricaoCurta = acertouPlacar && acertouVencedor
    ? `Acertou placar e ${game.mataMata ? "classificado" : "vencedor"}`
    : acertouPlacar
      ? "Acertou placar exato"
      : acertouVencedor
        ? `Acertou ${game.mataMata ? "classificado" : "vencedor"}`
        : "Não pontuou";

  return {
    participante: palpite.participante,
    pontos,
    acertouVencedor,
    acertouPlacar,
    descricaoCurta
  };
}

export function calculateRound(round) {
  const jogos = (round.jogos || []).map((game) => {
    const result = game.resultado || {};
    const scores = PARTICIPANTES.map((name) => {
      const palpite = (game.palpites || []).find((item) => item.participante === name);
      return calculateScore(game, result, palpite);
    });
    return { ...game, pontuacao: scores };
  });
  return { ...round, jogos };
}

export function calculateTournament(rounds) {
  const calculatedRounds = (rounds || []).map(calculateRound);
  const ranking = PARTICIPANTES.map((name) => {
    const allScores = calculatedRounds.flatMap((round) => round.jogos.flatMap((game) => game.pontuacao.filter((score) => score.participante === name)));
    const pontos = allScores.reduce((sum, score) => sum + score.pontos, 0);
    const placaresExatos = allScores.filter((score) => score.acertouPlacar).length;
    const vencedoresAcertados = allScores.filter((score) => score.acertouVencedor).length;
    const jogosPontuados = allScores.filter((score) => score.pontos > 0).length;
    const jogosFinalizados = allScores.filter((score) => score.descricaoCurta !== "Aguardando resultado").length;
    const aproveitamento = jogosFinalizados ? Math.round((pontos / (jogosFinalizados * 3)) * 100) : 0;
    return { participante: name, pontos, placaresExatos, vencedoresAcertados, jogosPontuados, aproveitamento };
  });
  const [livia, camila] = ranking;
  const diferenca = Math.abs(livia.pontos - camila.pontos);
  const lider = livia.pontos === camila.pontos ? "Empate" : livia.pontos > camila.pontos ? "Lívia" : "Camila";
  return { rounds: calculatedRounds, ranking, lider, diferenca };
}
