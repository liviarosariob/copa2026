# Lívia e Camila - Copa do Mundo 2026

Aplicação local para acompanhar o bolão entre Lívia e Camila, com cálculo automático de pontuação, ranking em formato de duelo, importação/exportação de JSON, Modo Print e PWA offline.

## Como rodar

1. Instale o Node.js.
2. Abra esta pasta no terminal.
3. Rode:

```bash
npm run start
```

4. Acesse o endereço que aparecer no terminal. Normalmente será:

```text
http://localhost:4173
```

Se essa porta já estiver ocupada, o app abre automaticamente na próxima porta livre, por exemplo `http://localhost:4174`.

## Ícones da Lívia e da Camila

Os arquivos ficam em:

```text
icons/livia.svg
icons/camila.svg
```

Já existem ícones simples de placeholder. Para usar os desenhos finais, substitua esses dois arquivos mantendo os mesmos nomes.

## Importar JSON

Use o botão **Importar JSON**, cole o texto do JSON no campo que aparece e clique em **Importar texto**.

O formato base está no exemplo:

```text
data/exemplo-rodada.json
```

O app valida:

- se a rodada tem data e jogos;
- se existem apenas Lívia e Camila;
- se cada jogo tem palpite das duas;
- se os placares dos palpites são numéricos.

Depois da importação, os dados ficam salvos no navegador e continuam lá após fechar e abrir de novo.

## Regras de pontuação

A camada de cálculo fica em:

```text
src/services/scoringService.js
```

Ela recebe jogo, resultado e palpite, e retorna:

- pontos;
- acertouVencedor;
- acertouPlacar;
- descricaoCurta.

Pontuação:

- acertou vencedor ou classificado: +1;
- acertou placar exato: +2;
- em mata-mata, o placar exato é o dos 90 minutos e o classificado vem de `penaltis`.

## Exportar dados

Use **Exportar dados** para baixar um backup com:

- rodadas;
- jogos;
- palpites;
- resultados;
- pontuação calculada;
- ranking;
- líder;
- diferença de pontos.

## API de resultados

O serviço de API fica isolado em:

```text
src/services/footballResultsService.js
```

Hoje o serviço está preparado para `football-data.org`, usando:

```text
GET /v4/competitions/WC/matches?season=2026
Header: X-Auth-Token
```

Quando houver rodadas importadas, o app também envia `dateFrom` e `dateTo` para buscar apenas o período necessário.

Referências:

- https://www.football-data.org/documentation/quickstart/
- https://docs.football-data.org/general/v4/lookup_tables.html

Para trocar de API futuramente, altere apenas esse arquivo.

Na primeira vez que você clicar em **Atualizar agora**, o app pede a API key e salva no navegador local. A chave não fica no código do GitHub.

O app tenta atualizar:

- ao clicar em **Atualizar agora**;
- quando a internet volta;
- mantendo os dados locais quando estiver offline.

## Modo Print

Clique em **Modo Print** ou acesse:

```text
http://localhost:4173/#print
```

Essa tela é otimizada para screenshot vertical no celular e não mostra menus, botões ou controles.

## PWA e offline

O app registra um service worker e pode ser instalado pelo navegador. Depois do primeiro acesso em `localhost`, os arquivos principais ficam disponíveis offline.

## Subir no GitHub

Este projeto é estático e pode ficar no GitHub como backup do código. Também pode ser publicado pelo GitHub Pages.

Passos básicos:

```bash
git init
git add .
git commit -m "Primeira versão do bolão"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/NOME_DO_REPOSITORIO.git
git push -u origin main
```

Para publicar no GitHub Pages:

1. Abra o repositório no GitHub.
2. Vá em **Settings**.
3. Entre em **Pages**.
4. Em **Build and deployment**, escolha **Deploy from a branch**.
5. Escolha branch `main` e pasta `/root`.
6. Salve.

O endereço ficará parecido com:

```text
https://SEU_USUARIO.github.io/NOME_DO_REPOSITORIO/
```

Aviso importante: como o app roda no navegador, a chave informada fica salva somente no navegador de quem usar o app. Em um repositório público, não coloque a chave direto no código.
