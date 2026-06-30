# Lívia e Camila - Copa do Mundo 2026

App simples para acompanhar o bolão da Copa entre Lívia e Camila.

O foco é importar os palpites em JSON, atualizar resultados pela ESPN, calcular a pontuação e abrir o **Modo Print** para mandar screenshot no WhatsApp.

## Como Usar

### Pelo GitHub Pages

Depois de publicar o repositório no GitHub Pages, abra a URL no celular:

```text
https://SEU_USUARIO.github.io/copa2026/
```

Os dados ficam salvos no navegador do próprio celular. Quem abrir o mesmo link em outro aparelho verá o app vazio.

### Localmente

```bash
npm run start
```

Abra o endereço mostrado no terminal, por exemplo:

```text
http://localhost:4173
```

Se a porta estiver ocupada, o servidor usa a próxima porta livre.

## Fluxo

1. Cole o texto do WhatsApp no ChatGPT e peça o JSON.
2. No app, clique em **Importar JSON**.
3. Cole o JSON no campo.
4. Clique em **Importar texto**.
5. Clique em **Atualizar agora** para buscar resultados na ESPN.
6. Abra **Modo Print**.
7. Tire o print e envie para Camila.

## Formato do JSON

O app aceita JSON neste formato:

```json
{
  "rodada": "16 avos de final",
  "data": "2026-06-30",
  "jogos": [
    {
      "id": "CIV-NOR-2026-06-30",
      "timeCasa": "Costa do Marfim",
      "timeFora": "Noruega",
      "horario": "14:00",
      "mataMata": true,
      "palpites": [
        {
          "participante": "Lívia",
          "placarCasa": 1,
          "placarFora": 1,
          "penaltis": "Noruega"
        },
        {
          "participante": "Camila",
          "placarCasa": 1,
          "placarFora": 1,
          "penaltis": "Noruega"
        }
      ]
    }
  ]
}
```

Campos opcionais que o app consegue completar para os países cadastrados:

- `siglaCasa`
- `siglaFora`
- `emojiCasa`
- `emojiFora`

Exemplo completo em:

```text
data/exemplo-rodada.json
```

## Resultado Manual

Se a ESPN não encontrar um jogo, você pode importar o resultado manualmente no próprio JSON:

```json
"resultado": {
  "placarCasa": 1,
  "placarFora": 2,
  "penaltis": null
}
```

Em mata-mata, `penaltis` deve ser o país classificado nos pênaltis. Se o jogo não foi para pênaltis, use `null`.

## Pontuação

- Acertou vencedor ou classificado: `+1`
- Acertou placar exato: `+2`

Em mata-mata:

- o placar exato é o placar do tempo normal;
- se terminar empatado e houver pênaltis, o campo `penaltis` define quem passou.

A lógica fica em:

```text
src/services/scoringService.js
```

## Atualização de Resultados

O app usa a API pública da ESPN, sem chave:

```text
https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=YYYYMMDD
```

O serviço fica em:

```text
src/services/footballResultsService.js
```

Quando você clica em **Atualizar agora**, o app busca os jogos nas datas das rodadas importadas.

## Armazenamento

Os dados ficam salvos no navegador usando `localStorage`.

Chave usada:

```text
bolao-livia-camila-2026
```

Isso significa:

- continua salvo ao fechar e abrir o navegador;
- funciona no celular;
- não salva nada no GitHub;
- se limpar os dados do navegador, apaga;
- outro aparelho começa vazio.

Use **Exportar dados** para baixar backup em JSON.

## Modo Print

Clique em **Modo Print** ou acesse:

```text
#print
```

Essa tela não mostra botões nem controles, só o conteúdo para screenshot vertical.

## GitHub Pages

Para publicar:

1. Abra o repositório no GitHub.
2. Vá em **Settings**.
3. Entre em **Pages**.
4. Em **Build and deployment**, escolha **Deploy from a branch**.
5. Branch: `main`.
6. Folder: `/root`.
7. Salve.

URL esperada:

```text
https://SEU_USUARIO.github.io/copa2026/
```

## Ícones da Lívia e da Camila

Os arquivos ficam em:

```text
icons/livia.svg
icons/camila.svg
```

Pode substituir esses dois SVGs mantendo os mesmos nomes.
