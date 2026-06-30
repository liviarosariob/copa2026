export const COUNTRIES = [
  { name: "África do Sul", sigla: "RSA", emoji: "🇿🇦", aliases: ["africa do sul", "áfrica do sul", "south africa"] },
  { name: "Alemanha", sigla: "GER", emoji: "🇩🇪", aliases: ["alemanha", "germany"] },
  { name: "Argélia", sigla: "ALG", emoji: "🇩🇿", aliases: ["argelia", "argélia", "algeria"] },
  { name: "Argentina", sigla: "ARG", emoji: "🇦🇷", aliases: ["argentina"] },
  { name: "Austrália", sigla: "AUS", emoji: "🇦🇺", aliases: ["australia", "austrália"] },
  { name: "Áustria", sigla: "AUT", emoji: "🇦🇹", aliases: ["austria", "áustria"] },
  { name: "Bélgica", sigla: "BEL", emoji: "🇧🇪", aliases: ["belgica", "bélgica", "belgium"] },
  { name: "Bósnia", sigla: "BIH", emoji: "🇧🇦", aliases: ["bosnia", "bósnia", "bósnia e herzegovina", "bosnia e herzegovina"] },
  { name: "Brasil", sigla: "BRA", emoji: "🇧🇷", aliases: ["brasil", "brazil"] },
  { name: "Cabo Verde", sigla: "CPV", emoji: "🇨🇻", aliases: ["cabo verde", "cape verde"] },
  { name: "Colômbia", sigla: "COL", emoji: "🇨🇴", aliases: ["colombia", "colômbia"] },
  { name: "Costa do Marfim", sigla: "CIV", emoji: "🇨🇮", aliases: ["costa do marfim", "côte d'ivoire", "cote d'ivoire", "ivory coast"] },
  { name: "Croácia", sigla: "CRO", emoji: "🇭🇷", aliases: ["croacia", "croácia", "croatia"] },
  { name: "Equador", sigla: "ECU", emoji: "🇪🇨", aliases: ["equador", "ecuador"] },
  { name: "Egito", sigla: "EGY", emoji: "🇪🇬", aliases: ["egito", "egypt"] },
  { name: "Espanha", sigla: "ESP", emoji: "🇪🇸", aliases: ["espanha", "spain"] },
  { name: "Estados Unidos", sigla: "USA", emoji: "🇺🇸", aliases: ["estados unidos", "eua", "usa", "united states"] },
  { name: "França", sigla: "FRA", emoji: "🇫🇷", aliases: ["franca", "frança", "france"] },
  { name: "Gana", sigla: "GHA", emoji: "🇬🇭", aliases: ["gana", "ghana"] },
  { name: "Holanda", sigla: "NED", emoji: "🇳🇱", aliases: ["holanda", "países baixos", "paises baixos", "netherlands"] },
  { name: "Inglaterra", sigla: "ENG", emoji: "🏴", aliases: ["inglaterra", "england"] },
  { name: "Japão", sigla: "JPN", emoji: "🇯🇵", aliases: ["japao", "japão", "japan"] },
  { name: "Marrocos", sigla: "MAR", emoji: "🇲🇦", aliases: ["marrocos", "morocco"] },
  { name: "México", sigla: "MEX", emoji: "🇲🇽", aliases: ["mexico", "méxico"] },
  { name: "Noruega", sigla: "NOR", emoji: "🇳🇴", aliases: ["noruega", "norway"] },
  { name: "Paraguai", sigla: "PAR", emoji: "🇵🇾", aliases: ["paraguai", "paraguay"] },
  { name: "Portugal", sigla: "POR", emoji: "🇵🇹", aliases: ["portugal"] },
  { name: "RD Congo", sigla: "COD", emoji: "🇨🇩", aliases: ["rd congo", "dr congo", "congo dr", "república democrática do congo", "republica democratica do congo"] },
  { name: "Senegal", sigla: "SEN", emoji: "🇸🇳", aliases: ["senegal"] },
  { name: "Suécia", sigla: "SWE", emoji: "🇸🇪", aliases: ["suecia", "suécia", "sweden"] },
  { name: "Suíça", sigla: "SUI", emoji: "🇨🇭", aliases: ["suica", "suíça", "switzerland"] },
  { name: "Ucrânia", sigla: "UKR", emoji: "🇺🇦", aliases: ["ucrania", "ucrânia", "ukraine"] }
];

function normalize(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function findCountry(value) {
  const query = normalize(value);
  if (!query) return null;
  return COUNTRIES.find((country) => {
    const names = [country.name, country.sigla, ...country.aliases];
    return names.some((item) => normalize(item) === query);
  }) || null;
}

export function enrichCountryFields(game) {
  const home = findCountry(game.timeCasa || game.siglaCasa);
  const away = findCountry(game.timeFora || game.siglaFora);
  return {
    ...game,
    timeCasa: game.timeCasa || home?.name || "",
    timeFora: game.timeFora || away?.name || "",
    siglaCasa: game.siglaCasa || home?.sigla || "",
    siglaFora: game.siglaFora || away?.sigla || "",
    emojiCasa: game.emojiCasa || home?.emoji || "",
    emojiFora: game.emojiFora || away?.emoji || ""
  };
}
