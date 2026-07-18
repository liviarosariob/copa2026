import { calculateTournament } from "./services/scoringService.js";
import { importRound, migrateRounds } from "./services/importExportService.js";
import { loadState, saveState } from "./services/storageService.js";
import { isSupabaseConfigured, loadRemoteState, saveRemoteState } from "./services/supabaseService.js";
import { updateResults } from "./services/footballResultsService.js";
import { findCountry } from "./services/countries.js";

const app = document.querySelector("#app");
const loadedState = loadState();
const state = { ...loadedState, rounds: migrateRounds(loadedState.rounds), view: viewFromHash(), errors: [], showImport: false, importText: "", selectedDate: "", selectedRound: "" };

function viewFromHash() {
  if (location.hash === "#print") return "print";
  if (location.hash === "#todos") return "all";
  return "dashboard";
}

function persistedState() {
  return {
    rounds: migrateRounds(state.rounds),
    lastUpdatedAt: state.lastUpdatedAt,
    updatedAt: state.updatedAt,
    apiStatus: state.apiStatus
  };
}

async function persistState() {
  state.updatedAt = new Date().toISOString();
  state.rounds = migrateRounds(state.rounds);
  saveState(persistedState());

  if (!isSupabaseConfigured()) {
    state.syncStatus = "Supabase não configurado";
    saveState(persistedState());
    return;
  }

  state.syncStatus = "Salvando na nuvem...";
  render();
  const result = await saveRemoteState(persistedState());
  state.syncStatus = result.message;
  saveState(persistedState());
  render();
}

async function loadCloudState() {
  if (!isSupabaseConfigured()) return;
  state.syncStatus = "Carregando nuvem...";
  render();
  const result = await loadRemoteState();

  if (result.ok && result.data) {
    const remoteState = result.data;
    const localTime = Date.parse(state.updatedAt || state.lastUpdatedAt || 0);
    const remoteTime = Date.parse(remoteState.updatedAt || remoteState.remoteUpdatedAt || remoteState.lastUpdatedAt || 0);

    if (localTime > remoteTime) {
      state.syncStatus = "Navegador tinha dados mais novos. Salvando na nuvem...";
      render();
      await persistState();
      return;
    }

    const { remoteUpdatedAt, ...cleanRemoteState } = remoteState;
    Object.assign(state, cleanRemoteState, { rounds: migrateRounds(cleanRemoteState.rounds), updatedAt: cleanRemoteState.updatedAt || remoteUpdatedAt || null, syncStatus: result.message });
    saveState(persistedState());
    render();
    return;
  }

  if (result.ok && !result.data && state.rounds.length) {
    state.syncStatus = "Criando registro na nuvem...";
    render();
    await persistState();
    return;
  }

  state.syncStatus = result.message;
  saveState(persistedState());
  render();
}

function moneyDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(`${value}T12:00:00`));
}

function shortDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(new Date(`${value}T12:00:00`));
}

function participantIcon(name) {
  const slug = name === "Lívia" ? "livia" : "camila";
  return `
    <span class="avatar">
      <img src="icons/${slug}.svg" alt="${name}" onerror="this.style.display='none';this.nextElementSibling.style.display='grid'" />
      <span class="avatarFallback">${name.slice(0, 1)}</span>
    </span>
  `;
}

function appLogo() {
  return `
    <span class="appLogo">
      <img src="logo.png" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='grid'" />
      <span>LC</span>
    </span>
  `;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function sortedRounds(rounds) {
  return migrateRounds(rounds);
}

function sortedGames(rounds) {
  return sortedRounds(rounds)
    .flatMap((round) => (round.jogos || []).map((game) => ({ ...game, rodada: round.rodada })))
    .sort((a, b) => `${a.data || ""}-${a.horario || ""}-${a.id || ""}`.localeCompare(`${b.data || ""}-${b.horario || ""}-${b.id || ""}`));
}

function uniqueDates(rounds) {
  return [...new Set(sortedGames(rounds).map((game) => game.data).filter(Boolean))];
}

function availableDates(rounds) {
  return [...new Set([todayIso(), ...uniqueDates(rounds)])].sort();
}

function uniqueRoundNames(rounds) {
  return [...new Set(sortedRounds(rounds).map((round) => round.rodada).filter(Boolean))];
}

function selectedDate(rounds) {
  const dates = availableDates(rounds);
  if (state.selectedDate && dates.includes(state.selectedDate)) return state.selectedDate;
  return todayIso();
}

function selectedRoundName(rounds) {
  const names = uniqueRoundNames(rounds);
  if (!names.length) return "";
  if (state.selectedRound && names.includes(state.selectedRound)) return state.selectedRound;
  return names[0];
}

function gamesForDate(rounds, date) {
  return sortedGames(rounds).filter((game) => game.data === date);
}

function gamesForRound(rounds, roundName) {
  return sortedGames(rounds).filter((game) => game.rodada === roundName);
}

function groupGamesByDate(games) {
  return [...games.reduce((groups, game) => {
    const date = game.data || "";
    groups.set(date, [...(groups.get(date) || []), game]);
    return groups;
  }, new Map())].sort(([dateA], [dateB]) => dateA.localeCompare(dateB));
}

function groupedGames(games) {
  if (!games.length) return "";
  return `
    <div class="dateGroups">
      ${groupGamesByDate(games).map(([date, items]) => `
        <section class="dateGroup">
          <h3>${moneyDate(date)}</h3>
          <div class="gameGrid">${items.map(gameCard).join("")}</div>
        </section>
      `).join("")}
    </div>
  `;
}

function datePager(rounds, activeDate) {
  const dates = availableDates(rounds);
  const activeIndex = Math.max(0, dates.indexOf(activeDate));
  const previousDate = dates[activeIndex - 1] || "";
  const nextDate = dates[activeIndex + 1] || "";
  return `
    <div class="datePager" aria-label="Navegar por dia">
      <button class="dateNav" data-date="${previousDate}" ${previousDate ? "" : "disabled"} aria-label="Dia anterior">‹</button>
      <strong>${moneyDate(activeDate)}</strong>
      <button class="dateNav" data-date="${nextDate}" ${nextDate ? "" : "disabled"} aria-label="Próximo dia">›</button>
    </div>
  `;
}

function roundTabs(rounds, activeRound) {
  const names = uniqueRoundNames(rounds);
  if (names.length <= 1) return "";
  return `
    <div class="filterTabs" aria-label="Filtrar por rodada">
      ${names.map((name) => `<button class="roundFilter ${name === activeRound ? "active" : ""}" data-round="${escapeHtml(name)}">${name}</button>`).join("")}
    </div>
  `;
}

function scoreLine(game) {
  const result = game.resultado;
  if (!gameHasStarted(game) || !result || !Number.isFinite(result.placarCasa) || !Number.isFinite(result.placarFora)) return "x";
  const officialHome = Number.isFinite(result.placarOficialCasa) ? result.placarOficialCasa : result.placarCasa;
  const officialAway = Number.isFinite(result.placarOficialFora) ? result.placarOficialFora : result.placarFora;
  const hasDifferentRegularScore = officialHome !== result.placarCasa || officialAway !== result.placarFora;
  const classified = result.classificado || result.ganhador || result.vencedor || result.penaltis;
  const regular = hasDifferentRegularScore
    ? `<small>${result.placarCasa === result.placarFora ? "empate no tempo regulamentar" : "tempo regulamentar"}: ${result.placarCasa} x ${result.placarFora}</small>`
    : "";
  const decision = classified && game.mataMata && result.placarCasa === result.placarFora
    ? `<small>${result.decisao || "decisão"}: ${classified}</small>`
    : "";
  return `${officialHome} x ${officialAway}${regular}${decision}`;
}

function gameHasStarted(game) {
  return !["agendado", "programado", "não iniciado", "nao iniciado"].includes(String(game?.status || "").trim().toLocaleLowerCase("pt-BR"));
}

function guessLine(guess) {
  if (!guess) return "-";
  const classified = guess.classificado || guess.ganhador || guess.vencedor || guess.penaltis;
  const decision = classified ? `<small>classificado: ${classified}</small>` : "";
  return `<strong>${guess.placarCasa} x ${guess.placarFora}</strong>${decision}`;
}

function statusClass(status) {
  return String(status || "agendado").replace(/\s+/g, "-");
}

function scoreFor(game, name) {
  return game.pontuacao.find((score) => score.participante === name) || { pontos: 0, descricaoCurta: "Sem pontuação" };
}

function teamMeta(name, sigla, emoji) {
  const country = findCountry(sigla) || findCountry(name);
  return {
    name: name || country?.name || "",
    sigla: sigla || country?.sigla || "",
    emoji: emoji || country?.emoji || ""
  };
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isOkStatus(value) {
  const text = String(value || "").toLocaleLowerCase("pt-BR");
  return ["salvo", "carregado", "encontrou", "mantendo", "mais novos"].some((item) => text.includes(item));
}

function compactStatus(kind, value) {
  const ok = isOkStatus(value);
  const mainIcon = kind === "cloud" ? "☁" : "●";
  const label = kind === "cloud" ? "Nuvem" : "API";
  return `
    <span class="miniStatus ${ok ? "ok" : "error"}" title="${label}: ${escapeHtml(value || "Sem status")}" aria-label="${label}: ${escapeHtml(value || "Sem status")}">
      <b>${mainIcon}</b>
      <em>${ok ? "✓" : "×"}</em>
    </span>
  `;
}

function rankingCard(person, other) {
  const diff = person.pontos - other.pontos;
  return `
    <article class="rivalCard ${diff > 0 ? "leading" : ""}">
      <div class="rivalTop">
        ${participantIcon(person.participante)}
        <div>
          <h2>${person.participante}</h2>
          <p>${diff > 0 ? `lidera por ${diff}` : diff === 0 ? "empatada" : `${Math.abs(diff)} atrás`}</p>
        </div>
      </div>
      <strong class="bigPoints">${person.pontos}</strong>
      <div class="statGrid">
        <span><b>${person.placaresExatos}</b> placares exatos</span>
        <span><b>${person.vencedoresAcertados}</b> vencedores</span>
        <span><b>${person.jogosPontuados}</b> jogos pontuados</span>
        <span><b>${person.aproveitamento}%</b> aproveitamento</span>
      </div>
    </article>
  `;
}

function gameCard(game) {
  const home = teamMeta(game.timeCasa, game.siglaCasa, game.emojiCasa);
  const away = teamMeta(game.timeFora, game.siglaFora, game.emojiFora);
  const liviaGuess = game.palpites.find((guess) => guess.participante === "Lívia");
  const camilaGuess = game.palpites.find((guess) => guess.participante === "Camila");
  const liviaScore = scoreFor(game, "Lívia");
  const camilaScore = scoreFor(game, "Camila");
  const hasResult = gameHasStarted(game) && game.resultado && Number.isFinite(game.resultado.placarCasa) && Number.isFinite(game.resultado.placarFora);
  const duel = !hasResult ? "Aguardando resultado" : liviaScore.pontos === camilaScore.pontos ? "Mesma pontuação" : liviaScore.pontos > camilaScore.pontos ? "Lívia +" + (liviaScore.pontos - camilaScore.pontos) : "Camila +" + (camilaScore.pontos - liviaScore.pontos);

  return `
    <article class="gameCard">
      <div class="gameHeader">
        <span class="status ${statusClass(game.status)}">${game.status || "agendado"}</span>
        <span>${game.data ? `${shortDate(game.data)} - ` : ""}${game.horario}</span>
      </div>
      <div class="matchup">
        <div><b>${home.sigla}</b><small>${home.name}</small></div>
        <strong>${scoreLine(game)}</strong>
        <div><b>${away.sigla}</b><small>${away.name}</small></div>
      </div>
      <div class="guesses">
        <div class="${liviaScore.acertouPlacar ? "exact" : ""}">
          <span>${participantIcon("Lívia")} Lívia</span>
          ${guessLine(liviaGuess)}
          <em>${liviaScore.pontos} pts - ${liviaScore.descricaoCurta}</em>
        </div>
        <div class="${camilaScore.acertouPlacar ? "exact" : ""}">
          <span>${participantIcon("Camila")} Camila</span>
          ${guessLine(camilaGuess)}
          <em>${camilaScore.pontos} pts - ${camilaScore.descricaoCurta}</em>
        </div>
      </div>
      <footer>${duel}</footer>
    </article>
  `;
}

function dashboard(calculated) {
  const [livia, camila] = calculated.ranking;
  const activeDate = selectedDate(calculated.rounds);
  const dayGames = gamesForDate(calculated.rounds, activeDate);
  const roundLabel = [...new Set(dayGames.map((game) => game.rodada).filter(Boolean))].join(" + ");
  return `
    <section class="shell">
      <header class="topBar">
        <div class="brand">
          ${appLogo()}
          <div>
          <h1>Lívia e Camila</h1>
          </div>
        </div>
        <nav>
          <button id="importBtn" class="actionImport">Importar JSON</button>
          <button id="refreshBtn" class="iconButton actionRefresh" aria-label="Atualizar agora" title="Atualizar agora">↻</button>
          <button id="allGamesBtn" class="actionSecondary">Todos os jogos</button>
          <button id="printBtn" class="primary">Modo Print</button>
        </nav>
      </header>

      <section class="heroScore">
        <div>${participantIcon("Lívia")}<span>Lívia</span><strong>${livia.pontos}</strong></div>
        <b>x</b>
        <div>${participantIcon("Camila")}<span>Camila</span><strong>${camila.pontos}</strong></div>
      </section>

      <section class="summary">
        <span>Líder atual: <b>${calculated.lider}</b></span>
        <span>Diferença: <b>${calculated.diferenca} ponto${calculated.diferenca === 1 ? "" : "s"}</b></span>
        <span>Dia: <b>${activeDate ? moneyDate(activeDate) : "Nenhuma rodada importada"}</b></span>
        ${compactStatus("api", state.apiStatus)}
        ${compactStatus("cloud", state.syncStatus || "Nuvem não configurada")}
      </section>

      ${state.showImport ? `
        <section class="importPanel">
          <div class="sectionTitle">
            <h2>Colar JSON</h2>
            <p>Cole o texto gerado pelo ChatGPT e importe a rodada.</p>
          </div>
          <textarea id="jsonInput" spellcheck="false" placeholder='{"rodada":"Oitavas de Final","jogos":[{"data":"2026-07-06", ...}]}' >${escapeHtml(state.importText)}</textarea>
          <div class="importActions">
            <button id="confirmImportBtn" class="primary">Importar texto</button>
            <button id="cancelImportBtn">Cancelar</button>
          </div>
        </section>
      ` : ""}

      ${state.errors.length ? `<aside class="errors">${state.errors.map((error) => `<p>${error}</p>`).join("")}</aside>` : ""}

      <section class="rivals">
        ${rankingCard(livia, camila)}
        ${rankingCard(camila, livia)}
      </section>

      <section class="roundSection">
        <div class="sectionTitle">
          <h2>${activeDate ? "Jogos do dia" : "Importe uma rodada para começar"}</h2>
          <p>${activeDate ? `${moneyDate(activeDate)} - ${roundLabel}` : "Use o botão Importar JSON e cole o texto do JSON."}</p>
        </div>
        ${datePager(calculated.rounds, activeDate)}
        <div class="gameGrid">${dayGames.length ? dayGames.map(gameCard).join("") : `<article class="emptyState">Nenhum jogo importado para ${moneyDate(activeDate)}.</article>`}</div>
      </section>
    </section>
  `;
}

function allGamesPage(calculated) {
  const [livia, camila] = calculated.ranking;
  const activeRound = selectedRoundName(calculated.rounds);
  const games = gamesForRound(calculated.rounds, activeRound);
  return `
    <section class="shell">
      <header class="topBar">
        <div class="brand">
          ${appLogo()}
          <div><h1>Todos os jogos</h1></div>
        </div>
        <nav>
          <button id="homeBtn" class="actionSecondary">Principal</button>
          <button id="importBtn" class="actionImport">Importar JSON</button>
          <button id="refreshBtn" class="iconButton actionRefresh" aria-label="Atualizar agora" title="Atualizar agora">↻</button>
          <button id="printBtn" class="primary">Modo Print</button>
        </nav>
      </header>

      <section class="summary">
        <span>Lívia: <b>${livia.pontos} pts</b></span>
        <span>Camila: <b>${camila.pontos} pts</b></span>
        <span>Filtro: <b>${activeRound || "Nenhuma rodada"}</b></span>
        ${compactStatus("api", state.apiStatus)}
        ${compactStatus("cloud", state.syncStatus || "Nuvem não configurada")}
      </section>

      ${state.showImport ? `
        <section class="importPanel">
          <div class="sectionTitle">
            <h2>Colar JSON</h2>
            <p>Cole o texto gerado pelo ChatGPT e importe a rodada.</p>
          </div>
          <textarea id="jsonInput" spellcheck="false" placeholder='{"rodada":"Oitavas de Final","jogos":[{"data":"2026-07-06", ...}]}' >${escapeHtml(state.importText)}</textarea>
          <div class="importActions">
            <button id="confirmImportBtn" class="primary">Importar texto</button>
            <button id="cancelImportBtn">Cancelar</button>
          </div>
        </section>
      ` : ""}

      ${state.errors.length ? `<aside class="errors">${state.errors.map((error) => `<p>${error}</p>`).join("")}</aside>` : ""}

      <section class="roundSection">
        <div class="sectionTitle">
          <h2>${activeRound || "Rodadas"}</h2>
          <p>${games.length} jogo${games.length === 1 ? "" : "s"}</p>
        </div>
        ${roundTabs(calculated.rounds, activeRound)}
        ${groupedGames(games)}
      </section>
    </section>
  `;
}

function printMode(calculated) {
  const [livia, camila] = calculated.ranking;
  const activeDate = selectedDate(calculated.rounds);
  const dayGames = gamesForDate(calculated.rounds, activeDate);
  const roundLabel = [...new Set(dayGames.map((game) => game.rodada).filter(Boolean))].join(" + ");
  return `
    <section class="printPage">
      <div class="printBrand">
        ${appLogo()}
        <div>
          <p class="eyebrow">Modo Print</p>
          <h1>Lívia e Camila</h1>
        </div>
      </div>
      <div class="printMeta">
        <span>${roundLabel || "Rodada"}</span>
        <span>${moneyDate(activeDate) || new Intl.DateTimeFormat("pt-BR").format(new Date())}</span>
      </div>
      <div class="printDuel">
        <div>${participantIcon("Lívia")}<b>${livia.pontos}</b><span>Lívia</span></div>
        <strong>x</strong>
        <div>${participantIcon("Camila")}<b>${camila.pontos}</b><span>Camila</span></div>
      </div>
      <p class="leader">Líder atual: <b>${calculated.lider}</b> ${calculated.diferenca ? `por ${calculated.diferenca} ponto${calculated.diferenca === 1 ? "" : "s"}` : ""}</p>
      <div class="printGames">${dayGames.length ? dayGames.map(gameCard).join("") : "<p>Importe uma rodada para gerar o print.</p>"}</div>
      <div class="printTotals">
        <span>Lívia: ${livia.placaresExatos} exatos, ${livia.vencedoresAcertados} vencedores</span>
        <span>Camila: ${camila.placaresExatos} exatos, ${camila.vencedoresAcertados} vencedores</span>
      </div>
    </section>
  `;
}

function render() {
  const calculated = calculateTournament(state.rounds);
  app.innerHTML = state.view === "print" ? printMode(calculated) : state.view === "all" ? allGamesPage(calculated) : dashboard(calculated);
  bindEvents(calculated);
}

function bindEvents(calculated) {
  document.querySelector("#printBtn")?.addEventListener("click", () => {
    state.view = "print";
    location.hash = "print";
    render();
  });

  document.querySelector("#allGamesBtn")?.addEventListener("click", () => {
    state.view = "all";
    location.hash = "todos";
    render();
  });

  document.querySelector("#homeBtn")?.addEventListener("click", () => {
    state.view = "dashboard";
    location.hash = "";
    render();
  });

  document.querySelector("#importBtn")?.addEventListener("click", () => {
    state.showImport = !state.showImport;
    state.errors = [];
    render();
  });

  document.querySelector("#jsonInput")?.addEventListener("input", (event) => {
    state.importText = event.target.value;
  });

  document.querySelector("#cancelImportBtn")?.addEventListener("click", () => {
    state.showImport = false;
    state.importText = "";
    state.errors = [];
    render();
  });

  document.querySelector("#confirmImportBtn")?.addEventListener("click", async () => {
    try {
      const round = JSON.parse(state.importText);
      const result = importRound(state.rounds, round);
      if (!result.ok) {
        state.errors = result.errors;
      } else {
        state.rounds = result.rounds;
        state.errors = [];
        state.showImport = false;
        state.importText = "";
        await persistState();
      }
    } catch {
      state.errors = ["Não foi possível ler o texto. Verifique se o JSON está completo e sem comentários."];
    }
    render();
  });

  document.querySelector("#refreshBtn")?.addEventListener("click", refreshResults);

  document.querySelectorAll(".dateNav").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedDate = button.dataset.date || "";
      render();
    });
  });

  document.querySelectorAll(".roundFilter").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedRound = button.dataset.round || "";
      render();
    });
  });

  if (!calculated.rounds.length) {
    document.addEventListener("keydown", seedExample, { once: true });
  }
}

async function refreshResults() {
  const result = await updateResults(state.rounds);
  state.rounds = result.rounds;
  state.apiStatus = result.status;
  state.lastUpdatedAt = new Date().toISOString();
  await persistState();
  render();
}

async function seedExample(event) {
  if (event.key.toLowerCase() !== "e") return;
  const response = await fetch("data/exemplo-rodada.json");
  const round = await response.json();
  state.rounds = [round];
  state.errors = [];
  await persistState();
  render();
}

window.addEventListener("hashchange", () => {
  state.view = viewFromHash();
  render();
});

window.addEventListener("online", refreshResults);

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}

render();
loadCloudState();
