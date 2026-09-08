import type { SeedCategory, SeedProduct } from "@/db/seed/types";

/**
 * The catalog fixture: what `bun run db/seed/index.ts` writes.
 *
 * Data only — no ids, no database. Every row is plausible Brazilian retail:
 * prices in BRL cents, weights and dimensions a carrier could quote freight
 * on, and user-facing copy in Brazilian Portuguese (`AGENTS.md`).
 */

/**
 * The one picture every seeded Product carries, as an S3 object key rather
 * than a URL — "buckets and CDNs change, history should not"
 * (`db/schema/catalog.ts`). `s3KeyToUrl` in `@/lib/utils/url` joins it onto
 * `NEXT_PUBLIC_ASSET_URL`.
 *
 * One key for the whole fixture is the deliberate shortcut: the seed exists to
 * fill the browse, search and admin surfaces with rows, and thirty distinct
 * photographs would be thirty uploads that teach nothing the layout does not
 * already show. Replace these two constants when real photography lands.
 */
export const PRODUCT_IMAGE_S3_KEY =
  "products/01a081e9-e6e9-74fb-bf9f-cd9b1868f24e.webp";

/** The Category tile picture. Same shortcut, different S3 prefix. */
export const CATEGORY_IMAGE_S3_KEY =
  "categories/01a081eb-a7d0-76e9-9849-62ac80438852.webp";

/**
 * A Brand is a name and nothing else (`CONTEXT.md`), so this is a list of
 * strings. "Hertz Lab" is the house brand the cables and stands sit under.
 */
export const BRANDS = [
  "AKG",
  "Audio-Technica",
  "Behringer",
  "Bose",
  "Edifier",
  "Focal",
  "Hertz Lab",
  "JBL",
  "Logitech",
  "Marshall",
  "Pioneer",
  "Sennheiser",
  "Shure",
  "Sony",
  "Taramps",
] as const;

/**
 * The browse tree, one level deep. Slugs are derived with `slugify`, so
 * "Áudio Automotivo" becomes `audio-automotivo` and the `categorySlug` on a
 * Product below has to match that derived form.
 */
export const CATEGORIES: SeedCategory[] = [
  {
    name: "Fones de Ouvido",
    description:
      "Fones over-ear, in-ear e gamer para ouvir música, trabalhar e jogar.",
    children: [
      {
        name: "Fones Bluetooth",
        description:
          "Fones sem fio com cancelamento de ruído e bateria para o dia inteiro.",
      },
      {
        name: "Fones In-Ear",
        description:
          "Intra-auriculares compactos, do uso diário ao monitoramento em palco.",
      },
      {
        name: "Fones Gamer",
        description:
          "Headsets com microfone destacável, áudio posicional e baixa latência.",
      },
    ],
  },
  {
    name: "Caixas de Som",
    description:
      "Do portátil à caixa de festa, com autonomia de bateria e resistência à água.",
    children: [
      {
        name: "Caixas Bluetooth",
        description:
          "Caixas portáteis à prova d'água para levar na mochila ou na praia.",
      },
      {
        name: "Caixas de Festa",
        description:
          "Alta potência, iluminação sincronizada e entrada para microfone.",
      },
      {
        name: "Soundbars",
        description:
          "Som de cinema na sala, com subwoofer sem fio e canais de altura.",
      },
    ],
  },
  {
    name: "Áudio Automotivo",
    description:
      "Módulos, alto-falantes e subwoofers para montar o som do seu carro.",
    children: [
      {
        name: "Módulos Amplificadores",
        description:
          "Amplificadores mono e multicanal de fabricação nacional, de 400 W a 3.000 W RMS.",
      },
      {
        name: "Alto-Falantes",
        description:
          "Coaxiais e kits de duas vias para portas dianteiras e traseiras.",
      },
      {
        name: "Subwoofers",
        description:
          "Graves para porta-malas, em impedâncias de 2 Ω, 4 Ω e 8 Ω.",
      },
    ],
  },
  {
    name: "Estúdio e Gravação",
    description:
      "O que você precisa para gravar voz, podcast e instrumentos em casa.",
    children: [
      {
        name: "Microfones",
        description:
          "Dinâmicos e condensadores para locução, podcast e captação de instrumentos.",
      },
      {
        name: "Interfaces de Áudio",
        description:
          "Conversores USB com pré-amplificadores e alimentação phantom de 48 V.",
      },
      {
        name: "Monitores de Referência",
        description:
          "Caixas ativas de resposta plana para mixar sem colorir o som.",
      },
    ],
  },
  {
    name: "Acessórios",
    description: "Cabos, suportes e pedestais para completar a montagem.",
    children: [
      {
        name: "Cabos",
        description: "Cabos P2, P10 e XLR com blindagem e conectores metálicos.",
      },
      {
        name: "Suportes e Pedestais",
        description:
          "Braços articulados, pedestais girafa e suportes de mesa para microfone.",
      },
    ],
  },
];

export const PRODUCTS: SeedProduct[] = [
  {
    name: "JBL Tune 770NC",
    brand: "JBL",
    categorySlug: "fones-bluetooth",
    description:
      "Fone over-ear com cancelamento de ruído adaptativo e até 70 horas de bateria com o ANC desligado. O JBL Pure Bass entrega graves encorpados sem embolar as vozes, e a recarga rápida devolve três horas de uso em cinco minutos na tomada. Dobrável, com estojo de transporte e conexão simultânea com dois aparelhos.",
    status: "active",
    skuPrefix: "JBL-T770NC",
    variants: [
      {
        name: "Preto",
        skuSuffix: "PRT",
        priceAmount: 59900,
        compareAtPriceAmount: 74900,
        stockQuantity: 42,
        weightGrams: 220,
        lengthMm: 195,
        widthMm: 170,
        heightMm: 80,
      },
      {
        name: "Branco",
        skuSuffix: "BRC",
        priceAmount: 59900,
        compareAtPriceAmount: 74900,
        stockQuantity: 18,
        weightGrams: 220,
        lengthMm: 195,
        widthMm: 170,
        heightMm: 80,
      },
      {
        name: "Azul",
        skuSuffix: "AZL",
        priceAmount: 62900,
        stockQuantity: 7,
        weightGrams: 220,
        lengthMm: 195,
        widthMm: 170,
        heightMm: 80,
      },
    ],
    specifications: [
      { label: "Tipo", value: "Over-ear fechado" },
      { label: "Driver", value: "40 mm dinâmico" },
      { label: "Resposta de frequência", value: "20 Hz – 20 kHz" },
      { label: "Impedância", value: "32 Ω" },
      { label: "Bluetooth", value: "5.3 com multiponto" },
      { label: "Autonomia", value: "Até 70 h (ANC desligado)" },
      { label: "Conexão com fio", value: "P2 de 3,5 mm" },
    ],
  },
  {
    name: "Sony WH-1000XM5",
    brand: "Sony",
    categorySlug: "fones-bluetooth",
    description:
      "A referência em cancelamento de ruído: oito microfones e dois processadores dedicados leem o ambiente e o silenciam antes que ele chegue ao seu ouvido. O driver de 30 mm com diafragma de fibra de carbono mantém os agudos limpos em volumes altos, e a captação de voz com redução de ruído deixa suas chamadas inteligíveis mesmo na rua.",
    status: "active",
    skuPrefix: "SNY-WH1000XM5",
    variants: [
      {
        name: "Preto",
        skuSuffix: "PRT",
        priceAmount: 279900,
        compareAtPriceAmount: 329900,
        stockQuantity: 12,
        weightGrams: 250,
        lengthMm: 250,
        widthMm: 200,
        heightMm: 90,
      },
      {
        name: "Prata",
        skuSuffix: "PRA",
        priceAmount: 279900,
        stockQuantity: 5,
        weightGrams: 250,
        lengthMm: 250,
        widthMm: 200,
        heightMm: 90,
      },
    ],
    specifications: [
      { label: "Tipo", value: "Over-ear fechado" },
      { label: "Driver", value: "30 mm com diafragma de fibra de carbono" },
      { label: "Resposta de frequência", value: "4 Hz – 40 kHz" },
      { label: "Impedância", value: "48 Ω" },
      { label: "Bluetooth", value: "5.2 com LDAC e multiponto" },
      { label: "Autonomia", value: "Até 30 h com ANC" },
      { label: "Peso", value: "250 g" },
    ],
  },
  {
    name: "Bose QuietComfort Ultra",
    brand: "Bose",
    categorySlug: "fones-bluetooth",
    description:
      "Cancelamento de ruído com o conforto que deu nome à linha, agora com Áudio Imersivo: o som fica ancorado à sua frente em vez de dentro da cabeça, e acompanha o movimento. O modo Aware deixa passar o que importa sem tirar o fone, e o estojo rígido protege a estrutura dobrável na mochila.",
    status: "active",
    skuPrefix: "BSE-QCU",
    variants: [
      {
        name: "Preto",
        skuSuffix: "PRT",
        priceAmount: 349900,
        stockQuantity: 9,
        weightGrams: 254,
        lengthMm: 240,
        widthMm: 195,
        heightMm: 85,
      },
      {
        name: "Branco",
        skuSuffix: "BRC",
        priceAmount: 349900,
        compareAtPriceAmount: 379900,
        stockQuantity: 4,
        weightGrams: 254,
        lengthMm: 240,
        widthMm: 195,
        heightMm: 85,
      },
    ],
    specifications: [
      { label: "Tipo", value: "Over-ear fechado" },
      { label: "Bluetooth", value: "5.3 com aptX Adaptive" },
      { label: "Autonomia", value: "Até 24 h (18 h com Áudio Imersivo)" },
      { label: "Microfones", value: "Arranjo de 6 para voz e ANC" },
      { label: "Peso", value: "254 g" },
    ],
  },
  {
    name: "Sennheiser Accentum Plus",
    brand: "Sennheiser",
    categorySlug: "fones-bluetooth",
    description:
      "A assinatura sonora da Sennheiser em um fone de uso diário: médios honestos, graves controlados e um equalizador de cinco bandas no aplicativo para ajustar ao seu gosto. Cinquenta horas de bateria, controle por toque e detecção de uso que pausa a música quando você tira o fone.",
    status: "active",
    skuPrefix: "SEN-ACCP",
    variants: [
      {
        name: "Preto",
        skuSuffix: "PRT",
        priceAmount: 159900,
        compareAtPriceAmount: 189900,
        stockQuantity: 15,
        weightGrams: 227,
        lengthMm: 200,
        widthMm: 180,
        heightMm: 85,
      },
      {
        name: "Branco",
        skuSuffix: "BRC",
        priceAmount: 159900,
        stockQuantity: 6,
        weightGrams: 227,
        lengthMm: 200,
        widthMm: 180,
        heightMm: 85,
      },
    ],
    specifications: [
      { label: "Tipo", value: "Over-ear fechado" },
      { label: "Driver", value: "37 mm dinâmico" },
      { label: "Resposta de frequência", value: "10 Hz – 22 kHz" },
      { label: "Bluetooth", value: "5.2 com aptX Adaptive" },
      { label: "Autonomia", value: "Até 50 h" },
    ],
  },
  {
    name: "Marshall Major V",
    brand: "Marshall",
    categorySlug: "fones-bluetooth",
    description:
      "Cem horas de bateria e carregamento sem fio em um on-ear que carrega o vinil texturizado e a logo dourada dos amplificadores da marca. O botão multidirecional controla reprodução, volume e chamadas sem que você precise olhar para o telefone.",
    status: "active",
    skuPrefix: "MSH-MAJ5",
    variants: [
      {
        name: "Preto",
        skuSuffix: "PRT",
        priceAmount: 119900,
        stockQuantity: 11,
        weightGrams: 186,
        lengthMm: 180,
        widthMm: 160,
        heightMm: 75,
      },
      {
        name: "Marrom",
        skuSuffix: "MRR",
        priceAmount: 124900,
        stockQuantity: 3,
        weightGrams: 186,
        lengthMm: 180,
        widthMm: 160,
        heightMm: 75,
      },
    ],
    specifications: [
      { label: "Tipo", value: "On-ear fechado" },
      { label: "Driver", value: "40 mm dinâmico" },
      { label: "Bluetooth", value: "5.3 com LE Audio" },
      { label: "Autonomia", value: "Até 100 h" },
      { label: "Carregamento sem fio", value: "Qi" },
    ],
  },
  {
    name: "Sony WF-1000XM5",
    brand: "Sony",
    categorySlug: "fones-in-ear",
    description:
      "O cancelamento de ruído da linha 1000X em um corpo 25% menor que o da geração anterior. O driver Dynamic Driver X separa graves e agudos sem perder o corpo do som, e as ponteiras de espuma com memória vedam o canal auditivo sem apertar. Resistência a respingos IPX4 para treinar sem preocupação.",
    status: "active",
    skuPrefix: "SNY-WF1000XM5",
    variants: [
      {
        name: "Preto",
        skuSuffix: "PRT",
        priceAmount: 189900,
        compareAtPriceAmount: 219900,
        stockQuantity: 22,
        weightGrams: 39,
        lengthMm: 65,
        widthMm: 45,
        heightMm: 30,
      },
      {
        name: "Prata",
        skuSuffix: "PRA",
        priceAmount: 189900,
        stockQuantity: 8,
        weightGrams: 39,
        lengthMm: 65,
        widthMm: 45,
        heightMm: 30,
      },
    ],
    specifications: [
      { label: "Tipo", value: "Intra-auricular sem fio" },
      { label: "Driver", value: "8,4 mm Dynamic Driver X" },
      { label: "Bluetooth", value: "5.3 com LDAC" },
      { label: "Autonomia", value: "8 h + 16 h no estojo" },
      { label: "Resistência à água", value: "IPX4" },
    ],
  },
  {
    name: "JBL Tune Beam 2",
    brand: "JBL",
    categorySlug: "fones-in-ear",
    description:
      "Intra-auricular com cancelamento de ruído ativo, teste de encaixe no aplicativo e quarenta horas de autonomia contando o estojo. O formato em haste mantém os microfones perto da boca, o que se nota nas chamadas feitas na rua.",
    status: "active",
    skuPrefix: "JBL-TB2",
    variants: [
      {
        name: "Preto",
        skuSuffix: "PRT",
        priceAmount: 44900,
        compareAtPriceAmount: 54900,
        stockQuantity: 60,
        weightGrams: 48,
        lengthMm: 60,
        widthMm: 50,
        heightMm: 28,
      },
      {
        name: "Azul",
        skuSuffix: "AZL",
        priceAmount: 44900,
        stockQuantity: 24,
        weightGrams: 48,
        lengthMm: 60,
        widthMm: 50,
        heightMm: 28,
      },
      {
        name: "Roxo",
        skuSuffix: "RXO",
        priceAmount: 44900,
        stockQuantity: 0,
        weightGrams: 48,
        lengthMm: 60,
        widthMm: 50,
        heightMm: 28,
      },
    ],
    specifications: [
      { label: "Tipo", value: "Intra-auricular sem fio" },
      { label: "Driver", value: "10 mm dinâmico" },
      { label: "Bluetooth", value: "5.3 com multiponto" },
      { label: "Autonomia", value: "12 h + 28 h no estojo" },
      { label: "Resistência à água", value: "IP54" },
    ],
  },
  {
    name: "Sennheiser IE 200",
    brand: "Sennheiser",
    categorySlug: "fones-in-ear",
    description:
      "Monitor com fio de driver único TrueResponse, feito para quem quer ouvir a mixagem e não uma versão colorida dela. O cabo removível com conector MMCX aceita troca por balanceado, e o ajuste de graves nas ponteiras dá dois níveis de extensão sem tocar em equalizador.",
    status: "active",
    skuPrefix: "SEN-IE200",
    variants: [
      {
        name: "Único",
        skuSuffix: "UNI",
        priceAmount: 99900,
        stockQuantity: 14,
        weightGrams: 4,
        lengthMm: 120,
        widthMm: 90,
        heightMm: 45,
      },
    ],
    specifications: [
      { label: "Tipo", value: "Intra-auricular com fio" },
      { label: "Driver", value: "7 mm TrueResponse dinâmico" },
      { label: "Resposta de frequência", value: "6 Hz – 20 kHz" },
      { label: "Impedância", value: "18 Ω" },
      { label: "Conector", value: "MMCX, cabo removível de 1,25 m" },
    ],
  },
  {
    name: "Edifier NeoBuds Pro 2",
    brand: "Edifier",
    categorySlug: "fones-in-ear",
    description:
      "Configuração híbrida com driver dinâmico e armadura balanceada, certificação Hi-Res Audio Wireless e suporte a LDAC. O aplicativo traz equalizador paramétrico e ajuste fino do nível de cancelamento, útil para quem alterna entre escritório e transporte público.",
    status: "active",
    skuPrefix: "EDF-NBP2",
    variants: [
      {
        name: "Preto",
        skuSuffix: "PRT",
        priceAmount: 79900,
        compareAtPriceAmount: 89900,
        stockQuantity: 17,
        weightGrams: 52,
        lengthMm: 62,
        widthMm: 48,
        heightMm: 30,
      },
    ],
    specifications: [
      { label: "Tipo", value: "Intra-auricular sem fio híbrido" },
      { label: "Drivers", value: "10 mm dinâmico + armadura balanceada" },
      { label: "Bluetooth", value: "5.3 com LDAC" },
      { label: "Autonomia", value: "6 h + 14 h no estojo" },
      { label: "Resistência à água", value: "IP54" },
    ],
  },
  {
    name: "Logitech G Pro X 2 Lightspeed",
    brand: "Logitech",
    categorySlug: "fones-gamer",
    description:
      "Headset sem fio com drivers de grafeno de 50 mm e três modos de conexão: Lightspeed sem latência para competir, Bluetooth para o celular e P2 para o console. O microfone destacável com Blue VO!CE entrega uma voz limpa sem placa de captura no meio do caminho.",
    status: "active",
    skuPrefix: "LGT-GPX2",
    variants: [
      {
        name: "Preto",
        skuSuffix: "PRT",
        priceAmount: 139900,
        compareAtPriceAmount: 159900,
        stockQuantity: 13,
        weightGrams: 345,
        lengthMm: 220,
        widthMm: 200,
        heightMm: 110,
      },
      {
        name: "Branco",
        skuSuffix: "BRC",
        priceAmount: 139900,
        stockQuantity: 6,
        weightGrams: 345,
        lengthMm: 220,
        widthMm: 200,
        heightMm: 110,
      },
    ],
    specifications: [
      { label: "Tipo", value: "Over-ear fechado sem fio" },
      { label: "Driver", value: "50 mm de grafeno" },
      { label: "Conexões", value: "Lightspeed 2,4 GHz, Bluetooth, P2" },
      { label: "Autonomia", value: "Até 50 h em Lightspeed" },
      { label: "Microfone", value: "Destacável de 6 mm com Blue VO!CE" },
    ],
  },
  {
    name: "Audio-Technica ATH-GDL3",
    brand: "Audio-Technica",
    categorySlug: "fones-gamer",
    description:
      "Headset aberto de 220 g pensado para sessões longas: a construção open-back amplia o palco sonoro e alivia a pressão no ouvido, ao custo do isolamento. O microfone destacável tem padrão hipercardioide, que rejeita o barulho de teclado atrás dele.",
    status: "active",
    skuPrefix: "ATH-GDL3",
    variants: [
      {
        name: "Preto",
        skuSuffix: "PRT",
        priceAmount: 89900,
        stockQuantity: 8,
        weightGrams: 220,
        lengthMm: 210,
        widthMm: 190,
        heightMm: 100,
      },
      {
        name: "Branco",
        skuSuffix: "BRC",
        priceAmount: 89900,
        stockQuantity: 2,
        weightGrams: 220,
        lengthMm: 210,
        widthMm: 190,
        heightMm: 100,
      },
    ],
    specifications: [
      { label: "Tipo", value: "Over-ear aberto" },
      { label: "Driver", value: "45 mm dinâmico" },
      { label: "Impedância", value: "38 Ω" },
      { label: "Microfone", value: "Destacável hipercardioide" },
      { label: "Peso", value: "220 g" },
    ],
  },
  {
    name: "JBL Quantum 610",
    brand: "JBL",
    categorySlug: "fones-gamer",
    description:
      "Headset sem fio de 2,4 GHz com JBL QuantumSURROUND e memory foam nas almofadas. Alterna para cabo P2 quando a bateria acaba, o que o mantém utilizável em qualquer console sem esperar recarga.",
    status: "active",
    skuPrefix: "JBL-Q610",
    variants: [
      {
        name: "Preto",
        skuSuffix: "PRT",
        priceAmount: 64900,
        compareAtPriceAmount: 79900,
        stockQuantity: 19,
        weightGrams: 380,
        lengthMm: 215,
        widthMm: 195,
        heightMm: 105,
      },
    ],
    specifications: [
      { label: "Tipo", value: "Over-ear fechado sem fio" },
      { label: "Driver", value: "50 mm dinâmico" },
      { label: "Conexões", value: "2,4 GHz sem fio e P2 de 3,5 mm" },
      { label: "Autonomia", value: "Até 40 h" },
      { label: "Microfone", value: "Boom retrátil com mute por rotação" },
    ],
  },
  {
    name: "JBL Flip 7",
    brand: "JBL",
    categorySlug: "caixas-bluetooth",
    description:
      "A portátil que virou padrão: cilíndrica, IP68 e com alça de silicone para prender na mochila. O driver de banda larga com dois radiadores passivos rende um grave que não se espera do tamanho, e o Auracast une várias caixas na mesma música.",
    status: "active",
    skuPrefix: "JBL-FLIP7",
    variants: [
      {
        name: "Preto",
        skuSuffix: "PRT",
        priceAmount: 79900,
        compareAtPriceAmount: 89900,
        stockQuantity: 35,
        weightGrams: 560,
        lengthMm: 183,
        widthMm: 70,
        heightMm: 70,
      },
      {
        name: "Azul",
        skuSuffix: "AZL",
        priceAmount: 79900,
        stockQuantity: 21,
        weightGrams: 560,
        lengthMm: 183,
        widthMm: 70,
        heightMm: 70,
      },
      {
        name: "Vermelho",
        skuSuffix: "VRM",
        priceAmount: 79900,
        stockQuantity: 9,
        weightGrams: 560,
        lengthMm: 183,
        widthMm: 70,
        heightMm: 70,
      },
    ],
    specifications: [
      { label: "Potência", value: "35 W RMS" },
      { label: "Bluetooth", value: "5.4 com Auracast" },
      { label: "Autonomia", value: "Até 14 h (+ 2 h no Playtime Boost)" },
      { label: "Proteção", value: "IP68 — água e poeira" },
      { label: "Carregamento", value: "USB-C" },
    ],
  },
  {
    name: "JBL Charge 6",
    brand: "JBL",
    categorySlug: "caixas-bluetooth",
    description:
      "A portátil que também é powerbank: a saída USB recarrega o celular enquanto toca. Vinte e quatro horas de bateria, IP68 e alça removível — a caixa para o fim de semana inteiro fora de casa.",
    status: "active",
    skuPrefix: "JBL-CHG6",
    variants: [
      {
        name: "Preto",
        skuSuffix: "PRT",
        priceAmount: 109900,
        stockQuantity: 16,
        weightGrams: 1030,
        lengthMm: 228,
        widthMm: 95,
        heightMm: 93,
      },
      {
        name: "Azul",
        skuSuffix: "AZL",
        priceAmount: 109900,
        compareAtPriceAmount: 129900,
        stockQuantity: 7,
        weightGrams: 1030,
        lengthMm: 228,
        widthMm: 95,
        heightMm: 93,
      },
    ],
    specifications: [
      { label: "Potência", value: "45 W RMS" },
      { label: "Bluetooth", value: "5.4 com Auracast" },
      { label: "Autonomia", value: "Até 24 h" },
      { label: "Proteção", value: "IP68 — água e poeira" },
      { label: "Extra", value: "Saída USB para recarregar o celular" },
    ],
  },
  {
    name: "Bose SoundLink Flex 2",
    brand: "Bose",
    categorySlug: "caixas-bluetooth",
    description:
      "Retangular e leve, com PositionIQ: a caixa detecta se está em pé, deitada ou pendurada e ajusta a equalização para a posição. Flutua na água, o que a torna sensata para piscina e barco.",
    status: "active",
    skuPrefix: "BSE-SLF2",
    variants: [
      {
        name: "Preto",
        skuSuffix: "PRT",
        priceAmount: 109900,
        stockQuantity: 10,
        weightGrams: 590,
        lengthMm: 200,
        widthMm: 90,
        heightMm: 52,
      },
    ],
    specifications: [
      { label: "Bluetooth", value: "5.3" },
      { label: "Autonomia", value: "Até 12 h" },
      { label: "Proteção", value: "IP67 — flutua na água" },
      { label: "Recurso", value: "PositionIQ" },
      { label: "Carregamento", value: "USB-C" },
    ],
  },
  {
    name: "Sony ULT Field 1",
    brand: "Sony",
    categorySlug: "caixas-bluetooth",
    description:
      "Portátil da linha ULT com botão dedicado de reforço de grave. Doze horas de bateria, IP67 e alça de pulso inclusa; o modo de festa encadeia até cem caixas compatíveis na mesma reprodução.",
    status: "active",
    skuPrefix: "SNY-ULTF1",
    variants: [
      {
        name: "Preto",
        skuSuffix: "PRT",
        priceAmount: 69900,
        compareAtPriceAmount: 79900,
        stockQuantity: 23,
        weightGrams: 640,
        lengthMm: 197,
        widthMm: 79,
        heightMm: 74,
      },
      {
        name: "Cinza",
        skuSuffix: "CNZ",
        priceAmount: 69900,
        stockQuantity: 11,
        weightGrams: 640,
        lengthMm: 197,
        widthMm: 79,
        heightMm: 74,
      },
    ],
    specifications: [
      { label: "Bluetooth", value: "5.3" },
      { label: "Autonomia", value: "Até 12 h" },
      { label: "Proteção", value: "IP67" },
      { label: "Recurso", value: "Botão ULT de reforço de grave" },
    ],
  },
  {
    name: "JBL PartyBox 320",
    brand: "JBL",
    categorySlug: "caixas-de-festa",
    description:
      "Duzentos e quarenta watts RMS, rodas e alça telescópica para atravessar o quintal sem carregar peso. A iluminação acompanha a batida, e as duas entradas combo aceitam microfone e violão ao mesmo tempo — dá para fazer karaokê e acompanhamento na mesma caixa.",
    status: "active",
    skuPrefix: "JBL-PB320",
    variants: [
      {
        name: "Único",
        skuSuffix: "UNI",
        priceAmount: 429900,
        compareAtPriceAmount: 479900,
        stockQuantity: 4,
        weightGrams: 17200,
        lengthMm: 400,
        widthMm: 390,
        heightMm: 700,
      },
    ],
    specifications: [
      { label: "Potência", value: "240 W RMS" },
      { label: "Alto-falantes", value: '2 woofers de 6,5" e 2 tweeters de 25 mm' },
      { label: "Autonomia", value: "Até 18 h com bateria" },
      { label: "Entradas", value: "2 combo XLR/P10 para microfone e instrumento" },
      { label: "Proteção", value: "IPX4" },
    ],
  },
  {
    name: "JBL PartyBox Encore Essential",
    brand: "JBL",
    categorySlug: "caixas-de-festa",
    description:
      "A caixa de festa que ainda cabe em um braço só: cem watts RMS, seis horas de bateria e um microfone com fio incluso na caixa. O anel de LED acompanha a música e pode ser desligado quando o clima pede menos.",
    status: "active",
    skuPrefix: "JBL-PBENC",
    variants: [
      {
        name: "Único",
        skuSuffix: "UNI",
        priceAmount: 249900,
        stockQuantity: 6,
        weightGrams: 7300,
        lengthMm: 300,
        widthMm: 280,
        heightMm: 330,
      },
    ],
    specifications: [
      { label: "Potência", value: "100 W RMS" },
      { label: "Autonomia", value: "Até 6 h" },
      { label: "Acompanha", value: "1 microfone com fio" },
      { label: "Proteção", value: "IPX4" },
    ],
  },
  {
    name: "Sony HT-S2000",
    brand: "Sony",
    categorySlug: "soundbars",
    description:
      "Soundbar 3.1 canais com Dolby Atmos e DTS:X processados por virtualização vertical — sem caixas de teto, o som ainda ganha altura. O subwoofer duplo embutido dispensa uma caixa extra no chão, o que ajuda em salas pequenas.",
    status: "active",
    skuPrefix: "SNY-HTS2000",
    variants: [
      {
        name: "Único",
        skuSuffix: "UNI",
        priceAmount: 219900,
        compareAtPriceAmount: 259900,
        stockQuantity: 5,
        weightGrams: 3300,
        lengthMm: 800,
        widthMm: 124,
        heightMm: 64,
      },
    ],
    specifications: [
      { label: "Canais", value: "3.1" },
      { label: "Formatos", value: "Dolby Atmos e DTS:X" },
      { label: "Conexões", value: "HDMI eARC, óptica, Bluetooth" },
      { label: "Subwoofer", value: "Duplo embutido" },
    ],
  },
  {
    name: "JBL Bar 500",
    brand: "JBL",
    categorySlug: "soundbars",
    description:
      "Cinco canais e meio com subwoofer sem fio de dez polegadas e MultiBeam, a calibração que rebate o som nas paredes para abrir o palco lateral. Suporta Dolby Atmos por eARC e toca direto do celular por AirPlay ou Chromecast.",
    status: "draft",
    skuPrefix: "JBL-BAR500",
    variants: [
      {
        name: "Único",
        skuSuffix: "UNI",
        priceAmount: 329900,
        stockQuantity: 0,
        weightGrams: 11500,
        lengthMm: 1017,
        widthMm: 120,
        heightMm: 56,
      },
    ],
    specifications: [
      { label: "Canais", value: "5.1" },
      { label: "Potência", value: "590 W pico" },
      { label: "Subwoofer", value: 'Sem fio de 10"' },
      { label: "Formatos", value: "Dolby Atmos" },
      { label: "Streaming", value: "AirPlay 2 e Chromecast built-in" },
    ],
  },
  {
    name: "Taramps MD 3000.1",
    brand: "Taramps",
    categorySlug: "modulos-amplificadores",
    description:
      "Módulo mono de três mil watts RMS para quem leva o porta-malas a sério. Fonte chaveada de alta eficiência, proteção térmica e contra curto, e crossover ajustável para cortar o que o subwoofer não precisa reproduzir. Fabricação nacional com garantia de dois anos.",
    status: "active",
    skuPrefix: "TRP-MD3000",
    variants: [
      {
        name: "1 Ω",
        skuSuffix: "1OHM",
        priceAmount: 89900,
        compareAtPriceAmount: 99900,
        stockQuantity: 12,
        weightGrams: 2400,
        lengthMm: 275,
        widthMm: 190,
        heightMm: 60,
      },
      {
        name: "2 Ω",
        skuSuffix: "2OHM",
        priceAmount: 89900,
        stockQuantity: 8,
        weightGrams: 2400,
        lengthMm: 275,
        widthMm: 190,
        heightMm: 60,
      },
    ],
    specifications: [
      { label: "Canais", value: "1 (mono)" },
      { label: "Potência", value: "3.000 W RMS" },
      { label: "Resposta de frequência", value: "10 Hz – 250 Hz" },
      { label: "Crossover", value: "Low-pass ajustável" },
      { label: "Alimentação", value: "12 V a 16 V" },
      { label: "Garantia", value: "2 anos" },
    ],
  },
  {
    name: "Taramps TS 400x4",
    brand: "Taramps",
    categorySlug: "modulos-amplificadores",
    description:
      "Quatro canais de cem watts RMS cada, compacto o bastante para caber sob o banco. Faz um som completo de porta sozinho, ou vira dois canais em ponte para alimentar um subwoofer pequeno.",
    status: "active",
    skuPrefix: "TRP-TS400X4",
    variants: [
      {
        name: "2 Ω",
        skuSuffix: "2OHM",
        priceAmount: 44900,
        stockQuantity: 30,
        weightGrams: 900,
        lengthMm: 190,
        widthMm: 130,
        heightMm: 45,
      },
    ],
    specifications: [
      { label: "Canais", value: "4" },
      { label: "Potência", value: "400 W RMS (4 × 100 W)" },
      { label: "Impedância", value: "2 Ω por canal" },
      { label: "Crossover", value: "High-pass e low-pass" },
      { label: "Garantia", value: "2 anos" },
    ],
  },
  {
    name: "Pioneer TS-A1670F",
    brand: "Pioneer",
    categorySlug: "alto-falantes",
    description:
      'Par de coaxiais de 6,5" com cone de fibra mineral e tweeter de cúpula macia — a troca direta que resolve o som de porta de fábrica sem exigir amplificador dedicado. Acompanha grades, parafusos e adaptadores.',
    status: "active",
    skuPrefix: "PNR-TSA1670F",
    variants: [
      {
        name: "Par",
        skuSuffix: "PAR",
        priceAmount: 39900,
        compareAtPriceAmount: 45900,
        stockQuantity: 25,
        weightGrams: 1800,
        lengthMm: 200,
        widthMm: 200,
        heightMm: 150,
      },
    ],
    specifications: [
      { label: "Diâmetro", value: '6,5" (165 mm)' },
      { label: "Vias", value: "3 vias coaxial" },
      { label: "Potência", value: "70 W RMS" },
      { label: "Impedância", value: "4 Ω" },
      { label: "Sensibilidade", value: "90 dB" },
    ],
  },
  {
    name: "JBL Selenium 6RA200",
    brand: "JBL",
    categorySlug: "alto-falantes",
    description:
      'Alto-falante de 6" da linha Rajado, feito para trabalhar com módulo: cem watts RMS, cone reforçado e sensibilidade alta o bastante para render com pouca potência. Vendido por unidade.',
    status: "active",
    skuPrefix: "JBL-6RA200",
    variants: [
      {
        name: "4 Ω",
        skuSuffix: "4OHM",
        priceAmount: 29900,
        stockQuantity: 40,
        weightGrams: 1100,
        lengthMm: 180,
        widthMm: 180,
        heightMm: 90,
      },
      {
        name: "8 Ω",
        skuSuffix: "8OHM",
        priceAmount: 29900,
        stockQuantity: 14,
        weightGrams: 1100,
        lengthMm: 180,
        widthMm: 180,
        heightMm: 90,
      },
    ],
    specifications: [
      { label: "Diâmetro", value: '6" (155 mm)' },
      { label: "Potência", value: "100 W RMS" },
      { label: "Sensibilidade", value: "91 dB" },
      { label: "Resposta de frequência", value: "80 Hz – 7 kHz" },
    ],
  },
  {
    name: "JBL Selenium 12SW3A",
    brand: "JBL",
    categorySlug: "subwoofers",
    description:
      'Subwoofer de 12" com 300 W RMS e bobina de alta temperatura, dimensionado para caixa selada ou dutada de porte médio. Os parâmetros Thiele-Small vêm na embalagem, o que evita chute na hora de calcular o volume do caixote.',
    status: "active",
    skuPrefix: "JBL-12SW3A",
    variants: [
      {
        name: "4 Ω",
        skuSuffix: "4OHM",
        priceAmount: 74900,
        compareAtPriceAmount: 84900,
        stockQuantity: 9,
        weightGrams: 4600,
        lengthMm: 330,
        widthMm: 330,
        heightMm: 180,
      },
      {
        name: "8 Ω",
        skuSuffix: "8OHM",
        priceAmount: 74900,
        stockQuantity: 5,
        weightGrams: 4600,
        lengthMm: 330,
        widthMm: 330,
        heightMm: 180,
      },
    ],
    specifications: [
      { label: "Diâmetro", value: '12" (300 mm)' },
      { label: "Potência", value: "300 W RMS" },
      { label: "Resposta de frequência", value: "35 Hz – 1 kHz" },
      { label: "Sensibilidade", value: "92 dB" },
      { label: "Bobina", value: '2" de alta temperatura' },
    ],
  },
  {
    name: "Shure SM7B",
    brand: "Shure",
    categorySlug: "microfones",
    description:
      "O dinâmico de broadcast que virou padrão de podcast e locução. O padrão cardioide e a blindagem contra ruído eletromagnético perdoam salas mal tratadas, mas ele pede ganho: um pré-amplificador limpo, ou um booster em linha, é parte da compra.",
    status: "active",
    skuPrefix: "SHR-SM7B",
    variants: [
      {
        name: "Único",
        skuSuffix: "UNI",
        priceAmount: 289900,
        stockQuantity: 6,
        weightGrams: 766,
        lengthMm: 300,
        widthMm: 160,
        heightMm: 120,
      },
    ],
    specifications: [
      { label: "Tipo", value: "Dinâmico" },
      { label: "Padrão polar", value: "Cardioide" },
      { label: "Resposta de frequência", value: "50 Hz – 20 kHz" },
      { label: "Impedância", value: "150 Ω" },
      { label: "Saída", value: "XLR balanceada" },
      { label: "Alimentação phantom", value: "Não requer" },
    ],
  },
  {
    name: "Shure MV7+",
    brand: "Shure",
    categorySlug: "microfones",
    description:
      "Dinâmico híbrido com saída XLR e USB-C na mesma peça: começa ligado direto no computador e continua servindo quando a mesa de som chegar. Traz supressão de ruído por software, monitoramento sem latência e um anel de LED para indicar mute.",
    status: "active",
    skuPrefix: "SHR-MV7P",
    variants: [
      {
        name: "Preto",
        skuSuffix: "PRT",
        priceAmount: 179900,
        compareAtPriceAmount: 199900,
        stockQuantity: 11,
        weightGrams: 620,
        lengthMm: 250,
        widthMm: 140,
        heightMm: 110,
      },
      {
        name: "Branco",
        skuSuffix: "BRC",
        priceAmount: 179900,
        stockQuantity: 3,
        weightGrams: 620,
        lengthMm: 250,
        widthMm: 140,
        heightMm: 110,
      },
    ],
    specifications: [
      { label: "Tipo", value: "Dinâmico" },
      { label: "Padrão polar", value: "Cardioide" },
      { label: "Saídas", value: "XLR e USB-C simultâneas" },
      { label: "Resolução USB", value: "24 bits / 48 kHz" },
      { label: "Monitoramento", value: "Saída de fone com mixagem direta" },
    ],
  },
  {
    name: "Audio-Technica AT2020",
    brand: "Audio-Technica",
    categorySlug: "microfones",
    description:
      "O condensador de entrada que sobrevive a upgrades: cardioide, com diafragma de 16 mm e resposta detalhada nos agudos. Pede alimentação phantom de 48 V e uma sala razoavelmente tratada — em troca, capta nuances que um dinâmico deixa passar.",
    status: "active",
    skuPrefix: "ATH-AT2020",
    variants: [
      {
        name: "Único",
        skuSuffix: "UNI",
        priceAmount: 89900,
        stockQuantity: 18,
        weightGrams: 345,
        lengthMm: 230,
        widthMm: 120,
        heightMm: 100,
      },
    ],
    specifications: [
      { label: "Tipo", value: "Condensador de diafragma grande" },
      { label: "Padrão polar", value: "Cardioide" },
      { label: "Resposta de frequência", value: "20 Hz – 20 kHz" },
      { label: "SPL máximo", value: "144 dB" },
      { label: "Alimentação phantom", value: "48 V" },
    ],
  },
  {
    name: "Behringer UMC404HD",
    brand: "Behringer",
    categorySlug: "interfaces-de-audio",
    description:
      "Quatro entradas combo com pré-amplificadores MIDAS e conversão em 24 bits / 192 kHz. MIDI in/out e saídas balanceadas para monitores fazem dela o centro de uma mesa de home studio que já passou do primeiro microfone.",
    status: "active",
    skuPrefix: "BHR-UMC404HD",
    variants: [
      {
        name: "Único",
        skuSuffix: "UNI",
        priceAmount: 149900,
        compareAtPriceAmount: 169900,
        stockQuantity: 10,
        weightGrams: 1400,
        lengthMm: 240,
        widthMm: 180,
        heightMm: 60,
      },
    ],
    specifications: [
      { label: "Entradas", value: "4 combo XLR/P10 com pré MIDAS" },
      { label: "Saídas", value: "4 balanceadas + fone" },
      { label: "Resolução", value: "24 bits / 192 kHz" },
      { label: "MIDI", value: "In e Out" },
      { label: "Alimentação phantom", value: "48 V" },
    ],
  },
  {
    name: "Behringer UMC22",
    brand: "Behringer",
    categorySlug: "interfaces-de-audio",
    description:
      "A interface de duas entradas para quem está começando: uma combo XLR com phantom para o microfone, uma entrada de instrumento para o violão, e alimentação pela própria USB. Sem drivers proprietários no Windows recente.",
    status: "active",
    skuPrefix: "BHR-UMC22",
    variants: [
      {
        name: "Único",
        skuSuffix: "UNI",
        priceAmount: 59900,
        stockQuantity: 27,
        weightGrams: 620,
        lengthMm: 190,
        widthMm: 140,
        heightMm: 55,
      },
    ],
    specifications: [
      { label: "Entradas", value: "1 combo XLR/P10 + 1 instrumento" },
      { label: "Resolução", value: "16 bits / 48 kHz" },
      { label: "Alimentação", value: "USB" },
      { label: "Alimentação phantom", value: "48 V" },
    ],
  },
  {
    name: "Focal Alpha 50 Evo",
    brand: "Focal",
    categorySlug: "monitores-de-referencia",
    description:
      'Monitor ativo de 5" com woofer de fibra de vidro e tweeter de alumínio invertido, o desenho que a Focal usa desde os monitores de estúdio grandes. Resposta plana o bastante para expor problemas de mixagem em vez de esconder. Vendido por unidade.',
    status: "active",
    skuPrefix: "FCL-ALPHA50",
    variants: [
      {
        name: "Unidade",
        skuSuffix: "UNI",
        priceAmount: 499900,
        stockQuantity: 4,
        weightGrams: 7200,
        lengthMm: 300,
        widthMm: 230,
        heightMm: 330,
      },
    ],
    specifications: [
      { label: "Tipo", value: "Monitor ativo de 2 vias" },
      { label: "Woofer", value: '5" de fibra de vidro Slatefiber' },
      { label: "Tweeter", value: "1\" de alumínio invertido" },
      { label: "Potência", value: "80 W (55 W + 25 W)" },
      { label: "Resposta de frequência", value: "45 Hz – 22 kHz" },
      { label: "Entradas", value: "XLR e RCA" },
    ],
  },
  {
    name: "Behringer Truth B1031A",
    brand: "Behringer",
    categorySlug: "monitores-de-referencia",
    description:
      'Monitor ativo de 8" com 150 W bi-amplificados e controles de graves e agudos no painel traseiro para compensar a acústica da sala. Vendido por unidade.',
    status: "archived",
    skuPrefix: "BHR-B1031A",
    variants: [
      {
        name: "Unidade",
        skuSuffix: "UNI",
        priceAmount: 219900,
        stockQuantity: 0,
        weightGrams: 12000,
        lengthMm: 400,
        widthMm: 300,
        heightMm: 380,
      },
    ],
    specifications: [
      { label: "Tipo", value: "Monitor ativo de 2 vias" },
      { label: "Woofer", value: '8" de kevlar' },
      { label: "Potência", value: "150 W bi-amplificado" },
      { label: "Resposta de frequência", value: "50 Hz – 21 kHz" },
    ],
  },
  {
    name: "Cabo P2 Estéreo Trançado Hertz Lab",
    brand: "Hertz Lab",
    categorySlug: "cabos",
    description:
      "Cabo auxiliar P2 macho para P2 macho com malha de nylon trançado, conectores banhados a ouro e alívio de tração nas duas pontas. Cobre OFC com blindagem dupla, para ligar celular ao som do carro sem chiado de alternador.",
    status: "active",
    skuPrefix: "HZL-CABO-P2",
    variants: [
      {
        name: "1,2 m",
        skuSuffix: "120CM",
        priceAmount: 4900,
        stockQuantity: 120,
        weightGrams: 60,
        lengthMm: 150,
        widthMm: 100,
        heightMm: 25,
      },
      {
        name: "2 m",
        skuSuffix: "200CM",
        priceAmount: 5900,
        stockQuantity: 85,
        weightGrams: 90,
        lengthMm: 150,
        widthMm: 100,
        heightMm: 30,
      },
      {
        name: "5 m",
        skuSuffix: "500CM",
        priceAmount: 8900,
        compareAtPriceAmount: 10900,
        stockQuantity: 33,
        weightGrams: 180,
        lengthMm: 180,
        widthMm: 120,
        heightMm: 40,
      },
    ],
    specifications: [
      { label: "Conectores", value: "P2 3,5 mm macho — macho, banhados a ouro" },
      { label: "Condutor", value: "Cobre OFC" },
      { label: "Blindagem", value: "Dupla, malha + folha" },
      { label: "Capa", value: "Nylon trançado" },
    ],
  },
  {
    name: "Cabo XLR Balanceado Hertz Lab",
    brand: "Hertz Lab",
    categorySlug: "cabos",
    description:
      "Cabo de microfone XLR macho para XLR fêmea com conectores metálicos travados e condutor de cobre OFC. Balanceado, então corridas longas até a mesa não trazem zumbido junto.",
    status: "active",
    skuPrefix: "HZL-CABO-XLR",
    variants: [
      {
        name: "3 m",
        skuSuffix: "300CM",
        priceAmount: 7900,
        stockQuantity: 64,
        weightGrams: 220,
        lengthMm: 200,
        widthMm: 150,
        heightMm: 45,
      },
      {
        name: "5 m",
        skuSuffix: "500CM",
        priceAmount: 10900,
        stockQuantity: 41,
        weightGrams: 340,
        lengthMm: 220,
        widthMm: 160,
        heightMm: 50,
      },
      {
        name: "10 m",
        skuSuffix: "1000CM",
        priceAmount: 17900,
        stockQuantity: 12,
        weightGrams: 640,
        lengthMm: 260,
        widthMm: 200,
        heightMm: 70,
      },
    ],
    specifications: [
      { label: "Conectores", value: "XLR macho — XLR fêmea, metálicos" },
      { label: "Condutor", value: "Cobre OFC balanceado" },
      { label: "Blindagem", value: "Malha de cobre" },
    ],
  },
  {
    name: "Suporte Articulado de Mesa para Microfone Hertz Lab",
    brand: "Hertz Lab",
    categorySlug: "suportes-e-pedestais",
    description:
      "Braço articulado com mola interna e canal para passar o cabo por dentro, o que tira o XLR da frente da câmera. Fixa por garra em bancadas de até 55 mm e suporta microfones de até 1,5 kg — o SM7B cabe com folga.",
    status: "active",
    skuPrefix: "HZL-SUP-MESA",
    variants: [
      {
        name: "Preto",
        skuSuffix: "PRT",
        priceAmount: 24900,
        compareAtPriceAmount: 29900,
        stockQuantity: 38,
        weightGrams: 1250,
        lengthMm: 420,
        widthMm: 180,
        heightMm: 90,
      },
      {
        name: "Branco",
        skuSuffix: "BRC",
        priceAmount: 26900,
        stockQuantity: 9,
        weightGrams: 1250,
        lengthMm: 420,
        widthMm: 180,
        heightMm: 90,
      },
    ],
    specifications: [
      { label: "Tipo", value: "Braço articulado com garra de mesa" },
      { label: "Carga máxima", value: "1,5 kg" },
      { label: "Rosca", value: "5/8\" com adaptador 3/8\"" },
      { label: "Espessura de mesa", value: "Até 55 mm" },
      { label: "Passagem de cabo", value: "Interna" },
    ],
  },
  {
    name: "Pedestal Girafa para Microfone Hertz Lab",
    brand: "Hertz Lab",
    categorySlug: "suportes-e-pedestais",
    description:
      "Pedestal de chão com braço girafa, base tripé dobrável e altura regulável de 1 m a 1,6 m. Acompanha cachimbo e bolsa de transporte — a montagem de ensaio que cabe no porta-malas.",
    status: "active",
    skuPrefix: "HZL-PED-GIRAFA",
    variants: [
      {
        name: "Preto",
        skuSuffix: "PRT",
        priceAmount: 18900,
        stockQuantity: 52,
        weightGrams: 2100,
        lengthMm: 900,
        widthMm: 140,
        heightMm: 120,
      },
    ],
    specifications: [
      { label: "Tipo", value: "Pedestal girafa com base tripé" },
      { label: "Altura", value: "1,0 m a 1,6 m" },
      { label: "Braço", value: "80 cm" },
      { label: "Rosca", value: "5/8\" com adaptador 3/8\"" },
      { label: "Acompanha", value: "Cachimbo e bolsa de transporte" },
    ],
  },
];
