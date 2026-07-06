# Lívia e Camila - Copa do Mundo 2026

App simples para acompanhar o bolão da Copa entre Lívia e Camila.

O foco é importar os palpites em JSON, atualizar resultados pela ESPN, calcular a pontuação e abrir o **Modo Print** para mandar screenshot no WhatsApp.

## Como Usar

### Pelo GitHub Pages

Depois de publicar o repositório no GitHub Pages, abra a URL no celular:

```text
https://SEU_USUARIO.github.io/copa2026/
```

Os dados ficam salvos no Supabase quando ele estiver configurado. Assim celular, PC e outros navegadores veem o mesmo bolão.

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
  "jogos": [
    {
      "id": "CIV-NOR-2026-06-30",
      "data": "2026-06-30",
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

Quando você clica em **Atualizar agora**, o app busca os jogos nas datas informadas em cada jogo importado.

## Armazenamento

Os dados ficam salvos no Supabase quando ele estiver configurado.

O navegador também mantém um cache local com `localStorage`, para o app continuar abrindo mesmo se a internet falhar.

Chave usada:

```text
bolao-livia-camila-2026
```

Isso significa:

- celular, PC e outros navegadores passam a ver o mesmo bolão;
- ao importar ou atualizar resultados, o app salva na nuvem;
- se a internet cair, o último estado ainda abre pelo cache local.

Com o Supabase configurado, não precisa baixar backup pelo app. A fonte principal passa a ser a tabela `bolao_state`.

## Configurar Supabase

Crie um projeto no Supabase e rode este SQL no **SQL Editor**:

```sql
create table if not exists public.bolao_state (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.bolao_state enable row level security;

drop policy if exists "bolao public read" on public.bolao_state;
drop policy if exists "bolao public insert" on public.bolao_state;
drop policy if exists "bolao public update" on public.bolao_state;

create policy "bolao public read"
on public.bolao_state
for select
using (true);

create policy "bolao public insert"
on public.bolao_state
for insert
with check (id = 'principal');

create policy "bolao public update"
on public.bolao_state
for update
using (id = 'principal')
with check (id = 'principal');
```

Para já inserir a rodada inicial que você mandou, rode também:

```sql
insert into public.bolao_state (id, data, updated_at)
values (
  'principal',
  '{
    "rounds": [
      {
        "rodada": "16 avos de final",
        "jogos": [
          {
            "id": "CIV-NOR-2026-06-30",
            "data": "2026-06-30",
            "timeCasa": "Costa do Marfim",
            "timeFora": "Noruega",
            "siglaCasa": "CIV",
            "siglaFora": "NOR",
            "horario": "14:00",
            "mataMata": true,
            "status": "encerrado",
            "resultado": {
              "placarCasa": 1,
              "placarFora": 2,
              "penaltis": null
            },
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
          },
          {
            "id": "FRA-SWE-2026-06-30",
            "data": "2026-06-30",
            "timeCasa": "França",
            "timeFora": "Suécia",
            "siglaCasa": "FRA",
            "siglaFora": "SWE",
            "horario": "18:00",
            "mataMata": true,
            "status": "agendado",
            "resultado": null,
            "palpites": [
              {
                "participante": "Lívia",
                "placarCasa": 3,
                "placarFora": 0,
                "penaltis": null
              },
              {
                "participante": "Camila",
                "placarCasa": 3,
                "placarFora": 1,
                "penaltis": null
              }
            ]
          },
          {
            "id": "MEX-ECU-2026-06-30",
            "data": "2026-06-30",
            "timeCasa": "México",
            "timeFora": "Equador",
            "siglaCasa": "MEX",
            "siglaFora": "ECU",
            "horario": "22:00",
            "mataMata": true,
            "status": "agendado",
            "resultado": null,
            "palpites": [
              {
                "participante": "Lívia",
                "placarCasa": 2,
                "placarFora": 2,
                "penaltis": "Equador"
              },
              {
                "participante": "Camila",
                "placarCasa": 2,
                "placarFora": 1,
                "penaltis": null
              }
            ]
          }
        ]
      }
    ],
    "lastUpdatedAt": null,
    "apiStatus": "Resultado da Noruega inserido manualmente"
  }'::jsonb,
  now()
)
on conflict (id) do update
set data = excluded.data,
    updated_at = now();
```

Depois copie no Supabase:

- **Project URL**
- **anon public key**

E cole em:

```text
src/services/supabaseConfig.js
```

Exemplo:

```js
export const SUPABASE_URL = "https://xxxx.supabase.co";
export const SUPABASE_ANON_KEY = "sua_anon_key";
```

O app salva tudo em uma única linha:

```text
tabela: bolao_state
id: principal
```

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
