import { calculateTournament } from "./services/scoringService.js";
import { buildExportPayload, importRound } from "./services/importExportService.js";
import { loadState, saveState } from "./services/storageService.js";
import { updateResults } from "./services/footballResultsService.js";
import { findCountry } from "./services/countries.js";

const app = document.querySelector("#app");
const state = { ...loadState(), view: location.hash === "#print" ? "print" : "dashboard", errors: [], showImport: false, importText: "" };

function moneyDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(`${value}T12:00:00`));
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

function currentRound(rounds) {
  return rounds[rounds.length - 1] || null;
}

function scoreLine(game) {
  const result = game.resultado;
  if (!result || !Number.isFinite(result.placarCasa) || !Number.isFinite(result.placarFora)) return "x";
  return `${result.placarCasa} x ${result.placarFora}`;
}

function guessLine(guess) {
  if (!guess) return "-";
  const penalties = guess.penaltis ? `<small>pênaltis: ${guess.penaltis}</small>` : "";
  return `<strong>${guess.placarCasa} x ${guess.placarFora}</strong>${penalties}`;
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
  const duel = liviaScore.pontos === camilaScore.pontos ? "Empate no jogo" : liviaScore.pontos > camilaScore.pontos ? "Lívia +" + (liviaScore.pontos - camilaScore.pontos) : "Camila +" + (camilaScore.pontos - liviaScore.pontos);

  return `
    <article class="gameCard">
      <div class="gameHeader">
        <span class="status ${statusClass(game.status)}">${game.status || "agendado"}</span>
        <span>${game.horario}</span>
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
  const round = currentRound(calculated.rounds);
  return `
    <section class="shell">
      <header class="topBar">
        <div class="brand">
          ${appLogo()}
          <div>
          <p class="eyebrow">Bolão premium</p>
          <h1>Lívia e Camila</h1>
          </div>
        </div>
        <nav>
          <button id="importBtn">Importar JSON</button>
          <button id="exportBtn">Exportar dados</button>
          <button id="refreshBtn">Atualizar agora</button>
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
        <span>Rodada: <b>${round?.rodada || "Nenhuma rodada importada"}</b></span>
        <span>API: <b>${state.apiStatus}</b></span>
      </section>

      ${state.showImport ? `
        <section class="importPanel">
          <div class="sectionTitle">
            <h2>Colar JSON</h2>
            <p>Cole o texto gerado pelo ChatGPT e importe a rodada.</p>
          </div>
          <textarea id="jsonInput" spellcheck="false" placeholder='{"rodada":"Oitavas de Final","data":"2026-06-30","jogos":[...]}' >${escapeHtml(state.importText)}</textarea>
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
          <h2>${round ? round.rodada : "Importe uma rodada para começar"}</h2>
          <p>${round ? moneyDate(round.data) : "Use o botão Importar JSON e cole o texto do JSON."}</p>
        </div>
        <div class="gameGrid">${round ? round.jogos.map(gameCard).join("") : ""}</div>
      </section>
    </section>
  `;
}

function printMode(calculated) {
  const [livia, camila] = calculated.ranking;
  const round = currentRound(calculated.rounds);
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
        <span>${round?.rodada || "Rodada"}</span>
        <span>${moneyDate(round?.data) || new Intl.DateTimeFormat("pt-BR").format(new Date())}</span>
      </div>
      <div class="printDuel">
        <div>${participantIcon("Lívia")}<b>${livia.pontos}</b><span>Lívia</span></div>
        <strong>x</strong>
        <div>${participantIcon("Camila")}<b>${camila.pontos}</b><span>Camila</span></div>
      </div>
      <p class="leader">Líder atual: <b>${calculated.lider}</b> ${calculated.diferenca ? `por ${calculated.diferenca} ponto${calculated.diferenca === 1 ? "" : "s"}` : ""}</p>
      <div class="printGames">${round ? round.jogos.map(gameCard).join("") : "<p>Importe uma rodada para gerar o print.</p>"}</div>
      <div class="printTotals">
        <span>Lívia: ${livia.placaresExatos} exatos, ${livia.vencedoresAcertados} vencedores</span>
        <span>Camila: ${camila.placaresExatos} exatos, ${camila.vencedoresAcertados} vencedores</span>
      </div>
    </section>
  `;
}

function render() {
  const calculated = calculateTournament(state.rounds);
  app.innerHTML = state.view === "print" ? printMode(calculated) : dashboard(calculated);
  bindEvents(calculated);
}

function bindEvents(calculated) {
  document.querySelector("#printBtn")?.addEventListener("click", () => {
    state.view = "print";
    location.hash = "print";
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

  document.querySelector("#confirmImportBtn")?.addEventListener("click", () => {
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
        saveState(state);
      }
    } catch {
      state.errors = ["Não foi possível ler o texto. Verifique se o JSON está completo e sem comentários."];
    }
    render();
  });

  document.querySelector("#exportBtn")?.addEventListener("click", () => {
    const payload = buildExportPayload(state);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "backup-bolao-livia-camila.json";
    link.click();
    URL.revokeObjectURL(url);
  });

  document.querySelector("#refreshBtn")?.addEventListener("click", refreshResults);

  if (!calculated.rounds.length) {
    document.addEventListener("keydown", seedExample, { once: true });
  }
}

async function refreshResults() {
  const result = await updateResults(state.rounds);
  state.rounds = result.rounds;
  state.apiStatus = result.status;
  state.lastUpdatedAt = new Date().toISOString();
  saveState(state);
  render();
}

async function seedExample(event) {
  if (event.key.toLowerCase() !== "e") return;
  const response = await fetch("data/exemplo-rodada.json");
  const round = await response.json();
  state.rounds = [round];
  state.errors = [];
  saveState(state);
  render();
}

window.addEventListener("hashchange", () => {
  state.view = location.hash === "#print" ? "print" : "dashboard";
  render();
});

window.addEventListener("online", refreshResults);

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}

render();
