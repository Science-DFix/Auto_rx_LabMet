# Auto_rx LabMet

Recepção e rastreamento automático de radiossondas.

Este repositório é uma **cópia de trabalho pessoal** do [`radiosonde_auto_rx`](https://github.com/projecthorus/radiosonde_auto_rx) — todo o mérito e a autoria do projeto são dos desenvolvedores originais, creditados abaixo. Não há aqui nenhuma pretensão de propriedade sobre o projeto original: este espaço existe apenas para eu estudar o código e contribuir com melhorias pontuais, começando pela **interface web**.

## Créditos e atribuição

Todo o trabalho de captura, demodulação e decodificação de radiossondas — a parte que realmente importa neste projeto — é dos desenvolvedores abaixo. Este fork só existe em cima do trabalho deles.

<img src="autorx.png" alt="Logo do projeto original radiosonde_auto_rx" width="360">

- **Projeto original:** [projecthorus/radiosonde_auto_rx](https://github.com/projecthorus/radiosonde_auto_rx), licenciado sob GNU GPL v3 (licença mantida neste repositório — veja [`LICENSE`](LICENSE)).
- **Autores / mantenedores:** [Mark Jessop (VK5QI)](https://github.com/darksidelemm) e [Michaela Wheeler](https://github.com/TheSkorm), e todos os colaboradores listados no [histórico do projeto original](https://github.com/projecthorus/radiosonde_auto_rx/graphs/contributors).
- **Decodificadores de radiossonda:** desenvolvidos por [rs1729/RS](https://github.com/rs1729/RS).
- **Documentação completa do pipeline original** (instalação, configuração, hardware suportado): [wiki do projeto original](https://github.com/projecthorus/radiosonde_auto_rx/wiki).

Para acompanhar atualizações do projeto original, o remote `upstream` já está configurado neste repositório:

```bash
git fetch upstream
```

## Foco atual: modernizar o painel web

A ideia inicial é revisar e melhorar a camada de apresentação (o painel web de acompanhamento em tempo real), mantendo o pipeline de recepção/decodificação exatamente como está. Duas frentes em andamento:

- **Correções de confiabilidade** no painel atual (`auto_rx/autorx/templates/index.html`) — reconexão de socket, limite de crescimento do log, tratamento de falha no carregamento inicial.
- **Protótipo novo em Svelte** (`auto_rx/web-next/`) — reconstrução da interface com mapa, controles, configurações, gráfico de varredura e um diagrama Skew-T de perfil atmosférico por voo (algo que o painel original nunca chegou a integrar de fato). Veja [`auto_rx/web-next/README.md`](auto_rx/web-next/README.md) para rodar e avaliar localmente.

Isso é trabalho em andamento — o pipeline de rádio (scan, decodificadores, uploaders) segue idêntico ao upstream por enquanto.

---

## O que é o auto_rx

Construído em cima dos demoduladores de [rs1729/RS](https://github.com/rs1729/RS), o `auto_rx` recebe automaticamente sinais de [radiossondas](https://pt.wikipedia.org/wiki/Radiossonda) via RTL-SDR (ou SDRs de rede) e envia as posições para múltiplos serviços, incluindo:

* O [SondeHub Radiosonde Tracker](https://tracker.sondehub.org) — site de rastreamento dedicado a radiossondas.
* APRS-IS, para exibição em sites como o [radiosondy.info](https://radiosondy.info).
* [ChaseMapper](https://github.com/projecthorus/chasemapper), para perseguição móvel de radiossondas.

### Sondas suportadas

Fabricante | Modelo | Posição | Temperatura | Umidade | Pressão | XDATA
-----------|--------|---------|-------------|---------|---------|------
Vaisala | RS92-SGP/NGP | ✅ | ✅ | ✅ | ✅ | ✅
Vaisala | RS41-SG/SGP/SGM | ✅ | ✅ | ✅ | ✅ (para -SGP) | ✅
Graw | DFM06/09/17 | ✅ | ✅ | ❌ | ❌ | ✅
Meteomodem | M10 | ✅ | ✅ | ✅ | Não enviado | ❌
Meteomodem | M20 | ✅ | ✅ | ✅ | ✅ (em alguns modelos) | ❌
Intermet Systems | iMet-4 | ✅ | ✅ | ✅ | ✅ | ✅
Intermet Systems | iMet-54 | ✅ | ✅ | ✅ | Não enviado | ❌
Lockheed Martin | LMS6-400/1680 | ✅ | ❌ | ❌ | ❌ | Não enviado
Meisei | iMS-100 | ✅ | ✅ | ✅ | ❌ | Não enviado
Meisei | RS11G | ✅ | ✅ | ✅ | ❌ | Não enviado
Meteo-Radiy | MRZ-H1 (400 MHz) | ✅ | ✅ | ✅ | ❌ | Não enviado
Meteosis | MTS01 | ✅ | ✅ | ❌ | ❌ | Não enviado

## Licenciamento

Todo o software neste repositório é licenciado sob a GNU General Public License v3 — veja o arquivo [`LICENSE`](LICENSE) para o texto completo.

Dados de telemetria de radiossonda enviados via este software para o banco de dados do [SondeHub](https://sondehub.org/) são licenciados sob [Creative Commons BY-SA v2.0](https://creativecommons.org/licenses/by-sa/2.0/). Dados enviados para a rede APRS-IS são geralmente considerados de domínio público.

Ao habilitar os uploaders no `station.cfg`, você concorda que seus dados sejam disponibilizados sob essas licenças. O upload para o SondeHub vem habilitado por padrão.
