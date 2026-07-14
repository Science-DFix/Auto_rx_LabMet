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
| Geral | Indicador de conexão + reconexão automática, aviso de nova versão |

**Simplificação assumida:** o Skew-T aqui mostra isóbaras, isotermas e as curvas de temperatura/ponto de orvalho, mas não tem adiabáticas nem barbelas de vento (um Skew-T meteorológico completo). Cobre a leitura principal (como temperatura/umidade variaram com a altitude) com bem menos código.

## Requisitos

- O backend do auto_rx já rodando (`python auto_rx.py`, como sempre) — este protótipo **não substitui** o backend, só a página que você abre no navegador.
- Node.js 18+ e npm, só para rodar este protótipo (não é uma dependência do projeto principal).

## Como rodar

```bash
cd auto_rx/web-next
npm install      # só na primeira vez
npm run dev
```

Isso sobe um servidor de desenvolvimento em `http://127.0.0.1:5173`. Abra essa URL no navegador — o protótipo faz proxy de todas as chamadas de API e do Socket.IO para o backend Flask em `http://127.0.0.1:5000` (a porta padrão do `web_port` no `station.cfg`).

Se o seu `station.cfg` usa uma porta diferente, aponte o proxy para ela:

```bash
AUTORX_BACKEND=http://127.0.0.1:5050 npm run dev
```

Não precisa editar nenhum arquivo do backend — o proxy fica todo contido no `vite.config.js` deste protótipo.

## Como usar

- **Ao vivo / Histórico** — alterna no topo entre o painel de rastreamento em tempo real e a lista de voos já registrados.
- **Camadas do mapa** — botões no canto superior direito do mapa (Ruas, Satélite, Escuro, Voyager, Topográfico). A escolha fica salva no navegador.
- **Tela cheia** — botão ⤢ no canto superior esquerdo do mapa.
- **Controles** — botão "Controles" no topo abre um painel lateral. Digite a senha configurada em `web_password` no `station.cfg` e clique em "Verificar" antes de usar as ações (elas ficam desabilitadas até autenticar). Só aparece funcional se `web_control = True` no `station.cfg`.
- **Config** — botão "Config" no topo abre o painel de preferências (unidades, UTC, tema). Fica salvo no navegador, não no servidor.
- **Histórico** — clique em um voo na lista à esquerda para ver a trilha no mapa, o resumo (lançamento/estouro/alcance) e o Skew-T. Links de exportação (log em zip, KML) ficam no cabeçalho de cada seção.

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
│   │   └── HistoricalView.svelte
│   └── app.css               # variáveis de tema (claro/escuro)
└── vite.config.js            # proxy para o backend Flask
```
