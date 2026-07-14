# auto_rx web-next (protótipo)

Protótipo local do painel web do `radiosonde_auto_rx`, reconstruído com **Svelte 5 + Vite**. Consome os mesmos endpoints REST e o mesmo Socket.IO do backend Flask existente (`autorx/web.py`) — nenhuma API do servidor foi alterada, só a camada de apresentação.

**Este diretório é um protótipo de avaliação local.** Ele roda lado a lado com o painel antigo (`autorx/templates/index.html`), sem substituí-lo. Nada aqui afeta produção até que se decida adotar.

## O que mudou

### 1. Correções no painel antigo (`autorx/templates/index.html`)

Três bugs de confiabilidade do live tracking, corrigidos diretamente no HTML/JS original:

- Falha ao carregar o histórico de telemetria na abertura da página travava as atualizações ao vivo para sempre (sem aviso). Agora um erro nessa chamada não impede o resto de funcionar.
- Não havia tratamento de reconexão do Socket.IO — a página ficava "congelada" silenciosamente após uma queda de rede. Agora existe um banner de "conexão perdida" e a telemetria é ressincronizada ao reconectar.
- A tabela de log crescia sem limite ao longo de uma sessão longa. Agora fica limitada às últimas 300 linhas.

### 2. Protótipo novo (`web-next/`)

Reconstrução da interface com Svelte, mantendo o mesmo contrato de API:

| Área | O que tem |
|---|---|
| Mapa ao vivo | Marcadores/trilhas por sonde, seletor de camadas (Ruas, Satélite, Escuro, Voyager, Topográfico), tela cheia |
| Varredura | Gráfico de espectro nativo (SVG), sem as libs mortas (c3.js, d3 duplicado) do painel antigo |
| Controles | Senha, iniciar/parar decoder, habilitar/desabilitar scanner, mover/homear rotador |
| Configurações | Unidades métrico/imperial, UTC, tema escuro/claro/automático |
| Histórico | Lista de voos, mapa da trilha, resumo do voo, exportação (zip/KML) |
| Skew-T | Diagrama de perfil atmosférico por voo — **gap que o painel antigo nunca chegou a integrar** (existia só como página de teste isolada) |
| Gráficos | Aba com painéis Grafana em tempo real: velocidade x altitude, deslocamento x tempo, temperatura/umidade/pressão x altitude |
| Geral | Indicador de conexão + reconexão automática, aviso de nova versão |

**Simplificação assumida:** o Skew-T aqui mostra isóbaras, isotermas e as curvas de temperatura/ponto de orvalho, mas não tem adiabáticas nem barbelas de vento (um Skew-T meteorológico completo). Cobre a leitura principal (como temperatura/umidade variaram com a altitude) com bem menos código.

## Requisitos

- O backend do auto_rx compilado e configurado (veja o [README raiz](../../README.md) para compilar os decodificadores) — este protótipo **não substitui** o backend, só a página que você abre no navegador. Pode já estar rodando à parte, ou ser iniciado junto (veja `AUTORX_START_BACKEND` abaixo).
- Node.js 18+ e npm.
- **Docker** — só se você quiser a aba "Gráficos" (Grafana). O resto do protótipo (Ao vivo, Histórico) funciona perfeitamente sem Docker.

Tudo roda 100% na sua própria máquina, em `127.0.0.1`/`localhost` — nenhuma peça depende de rede externa ou de serviço na nuvem.

## Como rodar

**Opção 1 — um único comando pra tudo**, incluindo o próprio `auto_rx.py` (recepção + bridge + Grafana + Vite):

```bash
cd auto_rx/web-next
npm install      # só na primeira vez

AUTORX_START_BACKEND=1 npm run dev:all
```

Isso é o mais próximo de "um comando só para acompanhar a sondagem em tempo real": sobe o backend Python (se `auto_rx/station.cfg` já existir e estiver configurado - veja o [README raiz](../../README.md) para compilar/configurar), o serviço-ponte de histórico, o Grafana (se o Docker estiver disponível) e o Vite, todos juntos. `Ctrl+C` encerra tudo que este script iniciou (o container do Grafana fica rodando entre sessões — é só `docker compose ... down` se quiser derrubar de vez, veja abaixo).

Se preferir usar um Python específico (ex.: de um venv) ou passar argumentos extra pro `auto_rx.py`:

```bash
AUTORX_START_BACKEND=1 AUTORX_PYTHON=/caminho/para/venv/bin/python3 AUTORX_PY_ARGS="--verbose" npm run dev:all
```

**Opção 2 — tudo, exceto o backend** (se você já roda o `auto_rx.py` à parte, ou ainda não compilou/configurou):

```bash
npm run dev:all
```

Sobe bridge + Grafana + Vite, assumindo que o `auto_rx.py` já está rodando em outro terminal (comportamento padrão, sem `AUTORX_START_BACKEND`).

**Opção 3 — só a interface**, sem bridge nem Grafana:

```bash
npm run dev
```

---

Em qualquer uma das opções, o protótipo faz proxy de todas as chamadas de API e do Socket.IO para o backend Flask em `http://127.0.0.1:5000` (a porta padrão do `web_port` no `station.cfg`). Se o seu `station.cfg` usa uma porta diferente:

```bash
AUTORX_BACKEND=http://127.0.0.1:5050 npm run dev:all
```

Não precisa editar nenhum arquivo do backend — o proxy fica todo contido no `vite.config.js` deste protótipo.

## Aba "Gráficos" (Grafana)

O Flask/Socket.IO original só guarda a trilha (lat/lon/alt) de uma sonde em voo em memória — não acumula um histórico de velocidade/temperatura/umidade/pressão em nenhum lugar consultável por HTTP. Para a aba de gráficos funcionar em tempo real sem tocar no backend, existem duas peças extras, ambas locais:

1. **`bridge/server.mjs`** — um serviço Node pequeno que assina o mesmo Socket.IO que a interface usa, acumula o histórico completo por sonde em memória, e serve isso via HTTP simples para o Grafana consultar. Escuta em `http://127.0.0.1:4500`.
2. **`grafana/`** — Grafana OSS rodando via Docker (container local, não é um serviço hospedado), com o plugin [Infinity](https://github.com/grafana-infinity-datasource/grafana-infinity-datasource) já provisionado apontando para o serviço acima, e um dashboard pronto com os painéis pedidos. Escuta em `http://localhost:3000`.

`npm run dev:all` já sobe as duas coisas junto com o Vite (pulando o Grafana automaticamente se o Docker não estiver instalado). Para subir/derrubar só o Grafana manualmente:

```bash
cd auto_rx/web-next/grafana
docker compose up -d      # subir
docker compose down       # derrubar (apaga o container, mantém os dashboards no volume)
```

Depois é só abrir a aba **Gráficos** no protótipo — ela embute o dashboard do Grafana num iframe, com um seletor para escolher qual sonde ativa visualizar.

**Aviso de segurança:** para o iframe funcionar sem tela de login, o `docker-compose.yml` habilita acesso anônimo e libera embedding no Grafana (`GF_AUTH_ANONYMOUS_ENABLED`, `GF_SECURITY_ALLOW_EMBEDDING`). Isso é aceitável só porque tudo roda em `127.0.0.1`/`localhost`, para avaliação local. **Não exponha essa configuração numa rede compartilhada ou na internet.**

**Sobre rodar todas as abas ao mesmo tempo:** a conexão Socket.IO com o backend é aberta uma única vez (em `App.svelte`), independente da aba selecionada — trocar entre Ao vivo/Histórico/Gráficos não reconecta nem interrompe a recepção de telemetria, só troca o que é exibido. O serviço-ponte também mantém sua própria conexão independente com o backend. Se o Grafana ou o bridge não estiverem rodando, só a aba Gráficos fica indisponível (iframe com erro) — as outras abas continuam funcionando normalmente.

**Limitações conhecidas desta primeira versão:**
- O serviço-ponte guarda histórico só em memória (reinicia zerado, sem persistência, e cada sonde é limitada a 5000 pontos).
- Os painéis do tipo "X por Y" (velocidade x altitude, variáveis x altitude) usam o painel `xychart` do Grafana, configurado via JSON diretamente — não tive como conferir visualmente o resultado neste ambiente (sem navegador gráfico). Se algum eixo aparecer errado, é só ajustar pelo editor de painel do próprio Grafana (`http://localhost:3000`).

## Como usar

- **Ao vivo / Histórico** — alterna no topo entre o painel de rastreamento em tempo real e a lista de voos já registrados.
- **Camadas do mapa** — botões no canto superior direito do mapa (Ruas, Satélite, Escuro, Voyager, Topográfico). A escolha fica salva no navegador.
- **Tela cheia** — botão ⤢ no canto superior esquerdo do mapa.
- **Controles** — botão "Controles" no topo abre um painel lateral. Digite a senha configurada em `web_password` no `station.cfg` e clique em "Verificar" antes de usar as ações (elas ficam desabilitadas até autenticar). Só aparece funcional se `web_control = True` no `station.cfg`.
- **Config** — botão "Config" no topo abre o painel de preferências (unidades, UTC, tema). Fica salvo no navegador, não no servidor.
- **Histórico** — clique em um voo na lista à esquerda para ver a trilha no mapa, o resumo (lançamento/estouro/alcance) e o Skew-T. Links de exportação (log em zip, KML) ficam no cabeçalho de cada seção.
- **Gráficos** — painéis Grafana ao vivo (atualização a cada 5s). Escolha a sonde no seletor no topo da aba. Requer o serviço-ponte e o Grafana rodando (veja seção acima) — sem eles, o iframe aparece vazio/com erro de conexão.

## Build de produção

```bash
npm run build
```

Gera arquivos estáticos em `dist/`. **Ainda não há integração para o Flask servir esses arquivos** — hoje o uso é só via `npm run dev` para avaliação. Se decidirmos adotar este protótipo definitivamente, o próximo passo natural é servir o `dist/` a partir do próprio `autorx/web.py` (ou de um servidor estático separado) no lugar de `templates/index.html`.

## Estrutura

```
web-next/
├── src/
│   ├── App.svelte           # layout principal, navegação, drawers
│   ├── lib/
│   │   ├── store.svelte.js  # estado reativo compartilhado
│   │   ├── api.js           # chamadas REST ao backend Flask
│   │   ├── socket.js        # conexão Socket.IO + sincronização
│   │   ├── units.js         # conversão de unidades / formatação de hora
│   │   ├── mapLayers.js     # camadas de mapa compartilhadas (ao vivo + histórico)
│   │   ├── MapView.svelte, HistoricalMap.svelte
│   │   ├── SondeTable.svelte, LogPanel.svelte, ScanChart.svelte, SkewT.svelte
│   │   ├── ControlPanel.svelte, SettingsPanel.svelte
│   │   ├── HistoricalView.svelte
│   │   └── GrafanaView.svelte     # iframe da aba "Gráficos"
│   └── app.css               # variáveis de tema (claro/escuro)
├── bridge/
│   └── server.mjs            # serviço-ponte de histórico (Socket.IO -> HTTP JSON)
├── grafana/
│   ├── docker-compose.yml
│   └── provisioning/         # datasource Infinity + dashboard, como código
├── dev-all.mjs                # sobe backend (opcional) + bridge + Grafana + Vite juntos (npm run dev:all)
└── vite.config.js            # proxy para o backend Flask
```
