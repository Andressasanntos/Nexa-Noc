/*
===============================================================================
NOC FLOW STUDIO - MAPA DO JAVASCRIPT
===============================================================================

JavaScript = COMPORTAMENTO da aplicação.

FLUXO SIMPLIFICADO:
  usuário clica/digita
        ↓
  addEventListener captura o evento
        ↓
  uma função processa os dados
        ↓
  a página é atualizada / algo é salvo / uma API é chamada

CONCEITOS IMPORTANTES NESTE ARQUIVO:

- const / let:
  criam variáveis. Use const quando a referência não precisa ser reatribuída.

- função:
  bloco reutilizável de código.

- array []:
  lista de itens. Ex.: comandos, siglas, templates.

- objeto {}:
  conjunto de dados com propriedades.
  Ex.: { name: "Operador NOC", role: "NOC" }

- localStorage:
  armazenamento simples do navegador.
  Os dados sobrevivem ao fechamento da página, mas pertencem àquele navegador.

- addEventListener:
  "escuta" cliques, digitação, alterações etc.

- async / await:
  usado quando uma operação demora e retorna uma Promise,
  por exemplo copiar para clipboard, ler imagem ou chamar o backend.

- fetch():
  faz requisições HTTP para o Python/Flask.

IMPORTANTE:
Não coloque senha, token ou chave de API neste arquivo.
Tudo que está no JavaScript do navegador pode ser visto pelo usuário.

===============================================================================
*/

// =============================================================================
// 1. ESTADO DA APLICAÇÃO
// =============================================================================
// "state" agrupa informações que mudam durante o uso do sistema.
// Parte desses dados também é persistida no localStorage.
//
// Exemplo:
// state.stats.calls -> quantidade de chamados gerados.
// state.profile.name -> nome mostrado no perfil.
//
const state = {
  stats: JSON.parse(localStorage.getItem("nfs_stats")) || {
    calls: 0,
    rfo: 0,
    messages: 0
  },
  favorites: JSON.parse(localStorage.getItem("nfs_favorites")) || [],
  customTemplates: JSON.parse(localStorage.getItem("nfs_custom_templates")) || [],
  theme: localStorage.getItem("nfs_theme") || "oceano",
  profile: JSON.parse(localStorage.getItem("nfs_profile")) || {
    name: "Operador NOC",
    role: "NOC",
    icon: "👩‍💻",
    image: ""
  }
};


// =============================================================================
// 2. SISTEMA DE TEMAS E PERFIL
// =============================================================================
// Set é uma coleção de valores únicos.
// Ele é usado aqui para impedir que um nome de tema inválido seja aplicado.
const VALID_THEMES = new Set(["oceano", "gelo", "cafe", "rubi"]);

function saveTheme() {
  localStorage.setItem("nfs_theme", state.theme);
}

function saveProfile() {
  localStorage.setItem("nfs_profile", JSON.stringify(state.profile));
}

/**
 * Aplica um tema visual.
 *
 * Como funciona:
 * 1. valida o nome;
 * 2. grava data-theme no <html>;
 * 3. o CSS detecta esse data-theme;
 * 4. salva a escolha no localStorage.
 *
 * @param {string} themeName Nome interno do tema.
 * @param {boolean} announce Se true, mostra um toast.
 */
function applyTheme(themeName, announce = false) {
  const theme = VALID_THEMES.has(themeName) ? themeName : "oceano";
  state.theme = theme;
  document.documentElement.dataset.theme = theme;
  saveTheme();

  $$(".theme-option").forEach((button) => {
    button.classList.toggle("active", button.dataset.themeChoice === theme);
  });

  if (announce) {
    const labels = {
      oceano: "Oceano Noturno",
      gelo: "Gelo",
      cafe: "Café com Leite",
      rubi: "Rubi Escuro"
    };
    showToast(`Tema ${labels[theme]} aplicado.`);
  }
}

function renderAvatar(target, profile = state.profile) {
  if (!target) return;

  if (profile.image) {
    target.innerHTML = `<img src="${profile.image}" alt="Imagem do perfil">`;
  } else {
    target.textContent = profile.icon || "👩‍💻";
  }
}

/**
 * Atualiza todos os elementos visuais relacionados ao perfil.
 *
 * "render" significa pegar os dados atuais e desenhá-los na interface.
 * Esse padrão aparece várias vezes no projeto: renderStats, renderCommands etc.
 */
function renderProfile() {
  const name = state.profile.name || "Operador NOC";
  const role = state.profile.role || "NOC";

  $("#profileNameTop").textContent = name;
  $("#profileRoleTop").textContent = role;
  $("#profilePreviewName").textContent = name;
  $("#profilePreviewRole").textContent = role;
  $("#profileNameInput").value = name;
  $("#profileRoleInput").value = role;

  renderAvatar($("#profileAvatarTop"));
  renderAvatar($("#profileAvatarPreview"));

  $$(".avatar-icon-option").forEach((button) => {
    button.classList.toggle(
      "active",
      !state.profile.image && button.dataset.icon === state.profile.icon
    );
  });
}

function openModal(modalId) {
  const modal = $(`#${modalId}`);
  if (!modal) return;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeModal(modalId) {
  const modal = $(`#${modalId}`);
  if (!modal) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");

  if (!$$(".modal-backdrop.open").length) {
    document.body.style.overflow = "";
  }
}

/**
 * Reduz e recorta uma imagem para o perfil.
 *
 * Por que fazer isso?
 * O localStorage não foi criado para armazenar arquivos grandes.
 * Então a imagem é transformada em uma versão quadrada de 320x320.
 *
 * Canvas aqui funciona como uma pequena área de edição de imagem.
 */
async function resizeProfileImage(file) {
  const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

  if (!allowedTypes.has(file.type)) {
    throw new Error("Use uma imagem JPG, PNG ou WebP.");
  }

  if (file.size > 6 * 1024 * 1024) {
    throw new Error("Escolha uma imagem com até 6 MB.");
  }

  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    reader.readAsDataURL(file);
  });

  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Imagem inválida."));
    img.src = dataUrl;
  });

  const size = 320;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  const scale = Math.max(size / image.width, size / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  const x = (size - width) / 2;
  const y = (size - height) / 2;

  ctx.drawImage(image, x, y, width, height);
  return canvas.toDataURL("image/jpeg", 0.86);
}

// =============================================================================
// 3. DADOS ESTÁTICOS DA INTERFACE
// =============================================================================
// pageMeta guarda título e subtítulo de cada seção.
// Em vez de vários "if", usamos um objeto como tabela de consulta.
const pageMeta = {
  dashboard: {
    title: "Dashboard",
    subtitle: "Sua central de apoio para operação NOC."
  },
  chamados: {
    title: "Chamados",
    subtitle: "Preencha os dados uma vez e gere saídas úteis."
  },
  modelos: {
    title: "Modelos",
    subtitle: "Mensagens rápidas e modelos reutilizáveis."
  },
  comandos: {
    title: "Comandos",
    subtitle: "Consulta inteligente por fabricante e categoria."
  },
  parser: {
    title: "Parser de Incidentes",
    subtitle: "Transforme texto solto em resumo estruturado."
  },
  ia: {
    title: "Assistente IA",
    subtitle: "Prompts prontos e integração opcional com backend."
  },
  referencias: {
    title: "Referências",
    subtitle: "Base rápida de siglas e contatos."
  }
};

// MODELOS DE MENSAGEM ---------------------------------------------------------
// Para adicionar um modelo novo, copie um objeto e troque:
// id, category, title e content.
const templates = [
  {
    id: 1,
    category: "normalizacao",
    title: "Normalização confirmada",
    content: "Informamos que o circuito foi normalizado. Permanecemos à disposição caso seja necessária qualquer validação adicional."
  },
  {
    id: 2,
    category: "cliente",
    title: "Abertura de chamado",
    content: "Prezados, registramos o chamado para análise da ocorrência reportada. Seguimos em tratativa e manteremos atualizações assim que houver retorno."
  },
  {
    id: 3,
    category: "encerramento",
    title: "Encerramento por validação",
    content: "Chamado encerrado mediante validação do cliente quanto à normalização do circuito."
  },
  {
    id: 4,
    category: "interno",
    title: "Acionamento interno",
    content: "Ocorrência direcionada para a equipe responsável, que seguirá com a análise e tratativa do caso."
  },
  {
    id: 5,
    category: "cliente",
    title: "Cliente indisponível",
    content: "Tentamos contato com o cliente para validação, porém até o momento não houve retorno."
  },
  {
    id: 6,
    category: "encerramento",
    title: "Encerramento por falta de retorno",
    content: "Chamado encerrado mediante normalização do circuito e ausência de retorno do cliente dentro da janela de validação."
  }
];

// BASE DE COMANDOS ------------------------------------------------------------
// Esta é uma boa parte para você praticar JavaScript.
// Cada comando é um objeto dentro de um array.
//
// Exemplo de novo item:
// {
//   id: "c99",
//   vendor: "Cisco",
//   category: "BGP",
//   title: "Ver vizinhos BGP",
//   description: "Consulta o estado dos peers BGP.",
//   command: "show ip bgp summary"
// }
const commands = [
  {
    id: "c1",
    vendor: "Cisco",
    category: "NTP",
    title: "Ver NTP configurado",
    description: "Exibe linhas da configuração relacionadas ao NTP.",
    command: "show running-config | include ntp"
  },
  {
    id: "c2",
    vendor: "Cisco",
    category: "NTP",
    title: "Ver associações NTP",
    description: "Confirma servidores e estado do sincronismo.",
    command: "show ntp associations"
  },
  {
    id: "c3",
    vendor: "Cisco",
    category: "Roteamento",
    title: "Tabela de rotas",
    description: "Mostra a tabela de roteamento IPv4.",
    command: "show ip route"
  },
  {
    id: "c4",
    vendor: "Cisco",
    category: "VLAN",
    title: "Consultar VLAN",
    description: "Exibe detalhes de uma VLAN específica.",
    command: "show vlan id [ID]"
  },
  {
    id: "c5",
    vendor: "Cisco",
    category: "Interface",
    title: "Status de interfaces",
    description: "Lista status e descrição de interfaces.",
    command: "show interfaces status"
  },
  {
    id: "h1",
    vendor: "Huawei",
    category: "NTP",
    title: "Ver NTP configurado",
    description: "Exibe configuração relacionada ao NTP em equipamentos Huawei.",
    command: "display current-configuration | include ntp"
  },
  {
    id: "h2",
    vendor: "Huawei",
    category: "Roteamento",
    title: "Tabela de rotas",
    description: "Mostra tabela de roteamento IPv4.",
    command: "display ip routing-table"
  },
  {
    id: "h3",
    vendor: "Huawei",
    category: "VLAN",
    title: "Consultar VLAN",
    description: "Exibe detalhes da VLAN especificada.",
    command: "display vlan [ID]"
  },
  {
    id: "h4",
    vendor: "Huawei",
    category: "Interface",
    title: "Resumo de interfaces",
    description: "Consulta o resumo do estado das interfaces.",
    command: "display interface brief"
  },
  {
    id: "h5",
    vendor: "Huawei",
    category: "Óptico",
    title: "Ver transceiver",
    description: "Exibe informações do módulo/transceptor ótico.",
    command: "display transceiver interface [ID] verbose"
  }
];

// REFERÊNCIAS OPERACIONAIS ----------------------------------------------------
// Agrupa siglas, contatos e outras bases usadas na tela "Referências".
// A interface é montada automaticamente por funções render*.
const references = {
  siglas: [
    ["ALAGOINHAS", "AGN"],
    ["ANTAS", "ANT"],
    ["AQUIDABÃ", "AQB"],
    ["ARACAJU", "AJU"],
    ["ARAPIRACA", "AIR"],
    ["ATALAIA", "ALA"],
    ["BANANEIRA", "BNA"],
    ["BARRA DE SÃO MIGUEL", "BSM"],
    ["BARRA DO ITARIRI", "BTR"],
    ["BARRA DOS COQUEIROS", "BDC"],
    ["BATALHA", "BTL"],
    ["CACIMBINHAS", "CCB"],
    ["CAMAÇARI", "CMR"],
    ["CAMPINA GRANDE", "CGD"],
    ["CAMPO ALEGRE", "CAG"],
    ["CAMPO GRANDE", "CGN"],
    ["CANAPI", "CNP"],
    ["CANHOBA", "CHB"],
    ["CANINDÉ", "CND"],
    ["CARIRA", "CRR"],
    ["CARUARU", "CRU"],
    ["CICERO DANTAS", "CDT"],
    ["COITÉ DO NOIA", "CNO"],
    ["CONDE", "CNE"],
    ["CORURIPE", "CRP"],
    ["COSTA DO SAUIPE", "CSP"],
    ["CRAÍBAS", "CAB"],
    ["DELMIRO GOUVEIA", "DGV"],
    ["DOIS RIACHOS", "DRS"],
    ["ENTRE RIOS", "ERS"],
    ["ESPLANADA", "ESP"],
    ["ESTÂNCIA", "EST"],
    ["FEIRA DE SANTANA", "FSA"],
    ["FEIRA GRANDE", "FGD"],
    ["FEIRA NOVA", "FNV"],
    ["FORTALEZA", "FTZ"],
    ["FREI PAULO", "FPL"],
    ["GARANHUNS", "GUN"],
    ["GIRAU PONCIANO", "GPC"],
    ["GRACHO CARDOSO", "GCS"],
    ["GRAVATA", "GVT"],
    ["IGREJA NOVA", "INV"],
    ["ITABAIANA", "ITB"],
    ["ITAPICURU", "ITP"],
    ["ITAPORANGA DA AJUDA", "ITG"],
    ["JABOATÃ", "JBO"],
    ["JAPOATÃ", "JPT"],
    ["JEREMOABO", "JMB"],
    ["JUIZ DE FORA", "JFA"],
    ["JUNQUEIRO", "JQR"],
    ["LAGARTO", "LGT"],
    ["LAGOA DA CANOA", "LCN"],
    ["LAGOA DO RANCHO", "LRC"],
    ["LIMOEIRO DE ANADIA", "LIM"],
    ["LUZIAPOLIS", "LZP"],
    ["MACEIÓ", "MCO"],
    ["MAJOR ISIDORO", "MID"],
    ["MAR VERMELHO", "MVM"],
    ["MARABA", "MRB"],
    ["MARAVILHA", "MRV"],
    ["MARECHAL DEODORO", "MRD"],
    ["MATA DE SÃO JOÃO", "MSJ"],
    ["MESSIAS", "MSA"],
    ["MONTE ALEGRE", "MAG"],
    ["NOSSA SENHORA APARECIDA", "NAP"],
    ["NOSSA SENHORA DA GLÓRIA", "GRA"],
    ["NOSSA SENHORA DO SOCORRO", "NSS"],
    ["OLHO D'AGUA DAS FLORES", "ODF"],
    ["OLHO D'AGUA DO CASADO", "ODC"],
    ["PACATUBA", "PCT"],
    ["PALMEIRA DOS ÍNDIOS", "PID"],
    ["PÃO DE AÇÚCAR", "PAC"],
    ["PAU D'ARCO", "PDC"],
    ["PAULO AFONSO", "PAF"],
    ["PENEDO", "PND"],
    ["PIACABUÇU", "PCU"],
    ["PINHÃO", "PNH"],
    ["PIRAMBU", "PRB"],
    ["PIRANHAS", "PSN"],
    ["POÇO REDONDO", "PRD"],
    ["POJUCA", "PJC"],
    ["PORTO REAL DO COLÉGIO", "PRC"],
    ["PROPRIÁ", "PPA"],
    ["QUEBRANGULO", "QBG"],
    ["RECIFE", "REC"],
    ["RIACHÃO DOS DANTAS", "RCD"],
    ["RIBEIRA DO AMPARO", "RAM"],
    ["RIBEIRA DO POMBAL", "RPL"],
    ["RIBEIRÓPOLIS", "RBP"],
    ["RIO LARGO", "RLG"],
    ["RIO REAL", "RRL"],
    ["SALGADO", "SLG"],
    ["SALVADOR", "SSA"],
    ["SANTANA DO IPANEMA", "SIP"],
    ["SANTO ANTONIO DE JESUS", "STO"],
    ["SÃO BRAZ", "SBZ"],
    ["SÃO JOSÉ DA LAJE", "SJL"],
    ["SÃO MIGUEL", "SMC"],
    ["SÃO PAULO", "SPO"],
    ["SÃO SEBASTIÃO", "SST"],
    ["SATUBA", "STB"],
    ["SAUIPE", "SAU"],
    ["SIMÃO DIAS", "SDS"],
    ["SUBAUMA", "SUB"],
    ["TAQUARANA", "TQN"],
    ["TEOTÔNIO VILELA", "TVL"],
    ["TOBIAS BARRETO", "TBR"],
    ["UNIÃO DOS PALMARES", "UNP"],
    ["VIÇOSA", "VCA"],
    ["VOLTA REDONDA", "VRD"],
    ["JARAMATAIA", "JMT"],
    ["BAIXA GRANDE", "BAG"],
    ["SERRARIA", "SER"],
    ["BRASILIA", "BRS"],
    ["BAIXA DA ONÇA", "BOC"],
    ["SÃO DOMINGOS", "SDG"],
    ["MACAMBIRA", "MCB"]
  ],
  contatos: [
    ["Cirion", "11 3957-2305 / 0800-887-3333", "im.cb@ciriontechnologies.com"],
    ["Vivo", "11 9956-3525", "sup.vivo@vivo.com.br"],
    ["Sencinet", "11 3078-3060", "noc@sencinet.com.br"],
    ["Aloo Telecom", "82 99652-6631", "n1@alootelecom.com.br"],
    ["RNP", "AL: 82 3201-6820 | SE: (79) 9 9942-8607 / (79) 3194-6355 | BA: (71) 3283-6098", "core@pop-al.rnp.br | operacao@pop-ba.rnp.br | chamados@pop-se.rnp.br"]
  ],
  redes: [
    [2, "FTTH.01", "ARAPIRACA"],
    [10, "FTTH.06", "PAULO AFONSO"],
    [11, "FTTH.08", "SÃO MIGUEL DOS CAMPOS"],
    [12, "FTTH.07", "PALMEIRA DOS ÍNDIOS"],
    [13, "FTTH.09", "GIRAU DO PONCIANO"],
    [14, "FTTH.10", "ARACAJU"],
    [15, "FTTH.11", "BARRA DE SÃO MIGUEL"],
    [16, "FTTH.12", "OLHO D'ÁGUA DAS FLORES"],
    [17, "FTTH.13", "BAIXA GRANDE"],
    [18, "FTTH.14", "LAGOA DA CANOA"],
    [19, "FTTH.15", "CAMPO ALEGRE"],
    [20, "FTTH.16", "TAQUARANA"],
    [21, "FTTH.17", "CORURIPE"],
    [25, "FTTH.18", "B.BRASÍLIA"],
    [27, "FTTH.19", "ARACAJU.AJU-006"],
    [39, "FTTH.21", "FRANCÊS"],
    [41, "FTTH.22", "QUEBRANGULO"],
    [42, "FTTH.23", "PAULO AFONSO FORA DA ILHA"],
    [44, "FTTH.24", "IGREJA NOVA"],
    [46, "FTTH.25", "PORTO REAL DO COLÉGIO"],
    [47, "FTTH.26", "COITÉ"],
    [48, "FTTH.27", "BANANEIRA"],
    [49, "FTTH.28", "ALAGOINHAS-1"],
    [50, "FTTH.29", "SALVADOR-PIATÃ"],
    [51, "FTTH.30", "ARACAJU-2"],
    [52, "FTTH.31", "SALVADOR-DATACENTER"],
    [53, "FTTH.32", "B.CANAFÍSTULA"],
    [55, "FTTH.33", "ALAGOINHAS-2"],
    [56, "FTTH.34", "PAU D'ARCO"],
    [57, "FTTH.35", "PENEDO-2"],
    [58, "FTTH.36", "LUZIÁPOLIS"],
    [59, "FTTH.37", "GRAVATÁ"],
    [60, "", "OLT.NOKIA.0"],
    [61, "FTTH", "PIRAMBU"],
    [71, "FTTH", "NOSSA SENHORA DO SOCORRO"],
    [72, "FTTH.43", "CAMPO GRANDE"],
    [73, "PPOE", "IGREJA NOVA"],
    [74, "PPOE", "PORTO REAL COLEGIO"],
    [75, "PPOE", "SOCORRO"],
    [76, "PPOE", "FRANCES"],
    [77, "PPOE", "MCZ"],
    [78, "PPOE", "QUEBRANGULO"],
    [79, "PPOE", "TAQUARANA"],
    [80, "FTTH.44", "MARECHAL"],
    [81, "FTTH.45", "AIR BAIXAO"],
    [82, "FTTH.46", "SMS TECNET"],
    [83, "FTTH.47", "BAIXA GRANDE 02"],
    [84, "PPOE", "PPPOE-GIRAU2"],
    [85, "PPOE", "PPPOE-BGP13"]
  ]
};

// =============================================================================
// 4. ATALHOS PARA MANIPULAR O DOM
// =============================================================================
// DOM = representação do HTML que o JavaScript consegue consultar/alterar.
//
// $("#id")  -> pega o primeiro elemento que combina com o seletor.
// $$(".x")  -> pega TODOS os elementos que combinam com o seletor.
//
// São apenas atalhos para deixar o código menor e mais legível.
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

// =============================================================================
// 5. FUNÇÕES UTILITÁRIAS
// =============================================================================

/**
 * Mostra uma notificação pequena no canto da tela.
 * clearTimeout evita que vários toasts disputem o mesmo temporizador.
 */
function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => toast.classList.remove("show"), 2400);
}

/**
 * Copia texto para a área de transferência.
 *
 * Primeiro tenta a API moderna navigator.clipboard.
 * Se ela falhar, usa um fallback com textarea temporário.
 */
async function copyText(text, success = "Copiado com sucesso.") {
  if (!text || !text.trim()) {
    showToast("Nada para copiar.");
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    showToast(success);
  } catch (error) {
    const temp = document.createElement("textarea");
    temp.value = text;
    document.body.appendChild(temp);
    temp.select();
    document.execCommand("copy");
    temp.remove();
    showToast(success);
  }
}

function saveStats() {
  localStorage.setItem("nfs_stats", JSON.stringify(state.stats));
}

function saveFavorites() {
  localStorage.setItem("nfs_favorites", JSON.stringify(state.favorites));
}

function saveCustomTemplates() {
  localStorage.setItem("nfs_custom_templates", JSON.stringify(state.customTemplates));
}

// =============================================================================
// 6. DASHBOARD E NAVEGAÇÃO
// =============================================================================

/**
 * Sincroniza os números dos cards com state.stats.
 * Uma função de renderização geralmente NÃO decide regras de negócio;
 * ela apenas apresenta dados na tela.
 */
function renderStats() {
  $("#statCalls").textContent = state.stats.calls;
  $("#statRfo").textContent = state.stats.rfo;
  $("#statMessages").textContent = state.stats.messages;
  $("#statFavorites").textContent = state.favorites.length;
}

/**
 * Troca a seção visível sem recarregar a página.
 *
 * Primeiro remove .active de todas.
 * Depois adiciona .active somente à seção escolhida.
 */
function openSection(sectionId) {
  $$(".section").forEach((el) => el.classList.remove("active"));
  $$(".nav-link").forEach((el) => el.classList.remove("active"));

  $(`#${sectionId}`).classList.add("active");
  $(`.nav-link[data-section="${sectionId}"]`).classList.add("active");

  $("#pageTitle").textContent = pageMeta[sectionId].title;
  $("#pageSubtitle").textContent = pageMeta[sectionId].subtitle;
}

$$(".nav-link").forEach((btn) => {
  btn.addEventListener("click", () => openSection(btn.dataset.section));
});

$$(".quick-nav").forEach((btn) => {
  btn.addEventListener("click", () => openSection(btn.dataset.target));
});

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-BR");
}

function incrementStat(key) {
  state.stats[key] += 1;
  saveStats();
  renderStats();
}

// =============================================================================
// 7. MÓDULO DE CHAMADOS
// =============================================================================

/**
 * Lê os campos do formulário e gera três textos diferentes.
 *
 * Observe o padrão:
 * 1. obter valores do DOM;
 * 2. organizar em um objeto "values";
 * 3. montar strings;
 * 4. escrever nos campos de saída.
 *
 * Template string usa crase (`) e permite inserir ${variavel}.
 */
function generateTicketOutputs() {
  const values = {
    requester: $("#ticketRequester").value.trim(),
    designation: $("#ticketDesignation").value.trim(),
    client: $("#ticketClient").value.trim(),
    host: $("#ticketHost").value.trim(),
    failure: $("#ticketFailure").value.trim(),
    start: $("#ticketStart").value,
    triage: $("#ticketTriage").value.trim(),
    contact: $("#ticketContact").value.trim(),
    obs: $("#ticketObs").value.trim()
  };

  const technical = [
    "[ABERTURA DE CHAMADO]",
    `Solicitante: ${values.requester || "-"}`,
    `Designação: ${values.designation || "-"}`,
    `Cliente final: ${values.client || "-"}`,
    `Host / circuito: ${values.host || "-"}`,
    `Falha: ${values.failure || "-"}`,
    `Início da falha: ${formatDate(values.start)}`,
    `Triagem interna: ${values.triage || "-"}`,
    `Contato: ${values.contact || "-"}`,
    `Observação: ${values.obs || "-"}`
  ].join("\n");

  const clientMsg = [
    `Prezados,`,
    ``,
    `Identificamos/registramos uma ocorrência referente ao circuito ${values.designation || values.host || ""}.`,
    `Falha observada: ${values.failure || "-"}.`,
    `Início informado: ${formatDate(values.start)}.`,
    `Nossa equipe segue em análise e retornará assim que houver atualização.`,
    ``,
    `Atenciosamente,`
  ].join("\n");

  const rfo = [
    `[RFO]`,
    `Causa: ${values.failure || "-"}.`,
    `Solução: ocorrência em tratativa / normalização após análise técnica.`,
    `Localização: ${values.host || values.client || "-"}.`,
    `Observação: ${values.obs || "-"}`
  ].join("\n");

  $("#ticketOutputTechnical").value = technical;
  $("#ticketOutputClient").value = clientMsg;
  $("#ticketOutputRfo").value = rfo;

  incrementStat("calls");
  incrementStat("rfo");
  showToast("Saídas do chamado geradas.");
}

$("#generateTicketBtn").addEventListener("click", generateTicketOutputs);

$("#clearTicketBtn").addEventListener("click", () => {
  [
    "#ticketRequester", "#ticketDesignation", "#ticketClient", "#ticketHost",
    "#ticketFailure", "#ticketStart", "#ticketContact", "#ticketObs"
  ].forEach((id) => $(id).value = "");
  $("#ticketTriage").value = "";
  ["#ticketOutputTechnical", "#ticketOutputClient", "#ticketOutputRfo"].forEach((id) => $(id).value = "");
  showToast("Formulário limpo.");
});

$$(".copy-output").forEach((btn) => {
  btn.addEventListener("click", () => {
    copyText($(`#${btn.dataset.output}`).value);
    incrementStat("messages");
  });
});

// =============================================================================
// 8. MÓDULO DE MODELOS
// =============================================================================

/**
 * Monta o filtro de categorias e chama a renderização da lista.
 * Os modelos personalizados são unidos aos modelos padrão com "...".
 */
function renderTemplates() {
  const select = $("#templateCategory");
  const allTemplates = [...templates, ...state.customTemplates];
  const categories = ["todas", ...new Set(allTemplates.map(item => item.category))];

  select.innerHTML = categories.map(cat =>
    `<option value="${cat}">${cat === "todas" ? "Todas" : cat}</option>`
  ).join("");

  updateTemplateList();
}

/**
 * Filtra os modelos e cria os cards com innerHTML.
 *
 * filter() -> mantém somente os itens que atendem à condição.
 * map()    -> transforma cada item em HTML.
 * join("") -> junta todos os pedaços em uma única string.
 */
function updateTemplateList() {
  const list = $("#templateList");
  const category = $("#templateCategory").value || "todas";
  const search = $("#templateSearch").value.trim().toLowerCase();
  const allTemplates = [...templates, ...state.customTemplates];

  const filtered = allTemplates.filter(item => {
    const matchCategory = category === "todas" || item.category === category;
    const target = `${item.title} ${item.content} ${item.category}`.toLowerCase();
    const matchSearch = !search || target.includes(search);
    return matchCategory && matchSearch;
  });

  if (!filtered.length) {
    list.innerHTML = `<div class="template-card"><p>Nenhum modelo encontrado.</p></div>`;
    return;
  }

  list.innerHTML = filtered.map(item => `
    <article class="template-card">
      <div class="top-row">
        <div>
          <h4>${item.title}</h4>
        </div>
        <button class="ghost-btn use-template-btn" data-template-id="${item.id}">Usar</button>
      </div>
      <div class="template-meta">
        <span class="meta-badge">${item.category}</span>
      </div>
      <p>${item.content}</p>
    </article>
  `).join("");

  $$(".use-template-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const all = [...templates, ...state.customTemplates];
      const chosen = all.find(item => String(item.id) === btn.dataset.templateId);
      $("#templateTitle").value = chosen.title;
      $("#templateContent").value = chosen.content;
      showToast("Modelo carregado.");
    });
  });
}

$("#templateCategory").addEventListener("change", updateTemplateList);
$("#templateSearch").addEventListener("input", updateTemplateList);

$("#copyTemplateBtn").addEventListener("click", () => {
  copyText($("#templateContent").value, "Modelo copiado.");
  incrementStat("messages");
});

$("#saveCustomTemplateBtn").addEventListener("click", () => {
  const title = $("#templateTitle").value.trim();
  const content = $("#templateContent").value.trim();

  if (!title || !content) {
    showToast("Informe título e conteúdo do modelo.");
    return;
  }

  state.customTemplates.push({
    id: `custom-${Date.now()}`,
    category: "customizado",
    title,
    content
  });

  saveCustomTemplates();
  renderTemplates();
  showToast("Modelo salvo localmente.");
});

// =============================================================================
// 9. MÓDULO DE COMANDOS
// =============================================================================

// Cria automaticamente as opções "Fabricante" e "Categoria".
function renderCommandFilters() {
  const vendors = ["Todos", ...new Set(commands.map(item => item.vendor))];
  const categories = ["Todas", ...new Set(commands.map(item => item.category))];

  $("#vendorFilter").innerHTML = vendors.map(item => `<option value="${item}">${item}</option>`).join("");
  $("#commandCategoryFilter").innerHTML = categories.map(item => `<option value="${item}">${item}</option>`).join("");
}

/**
 * Adiciona ou remove um comando dos favoritos.
 * includes() verifica se o ID já está salvo.
 */
function toggleFavorite(commandId) {
  if (state.favorites.includes(commandId)) {
    state.favorites = state.favorites.filter(id => id !== commandId);
  } else {
    state.favorites.push(commandId);
  }
  saveFavorites();
  renderStats();
  renderCommands();
}

/**
 * Filtra e desenha a base de comandos.
 *
 * Esta função é um bom exemplo de:
 * - filtros combinados;
 * - criação dinâmica de HTML;
 * - eventos adicionados depois que os cards foram criados.
 */
function renderCommands(filteredText = "") {
  const vendor = $("#vendorFilter").value || "Todos";
  const category = $("#commandCategoryFilter").value || "Todas";
  const search = ($("#commandSearch").value || filteredText).trim().toLowerCase();

  const filtered = commands.filter(item => {
    const matchVendor = vendor === "Todos" || item.vendor === vendor;
    const matchCategory = category === "Todas" || item.category === category;
    const target = `${item.vendor} ${item.category} ${item.title} ${item.description} ${item.command}`.toLowerCase();
    const matchSearch = !search || target.includes(search);
    return matchVendor && matchCategory && matchSearch;
  });

  const container = $("#commandsList");

  if (!filtered.length) {
    container.innerHTML = `<div class="command-card"><p>Nenhum comando encontrado.</p></div>`;
    return;
  }

  container.innerHTML = filtered.map(item => `
    <article class="command-card">
      <div class="top-row">
        <div>
          <h4>${item.title}</h4>
        </div>
        <div class="button-row">
          <button class="ghost-btn favorite-command-btn" data-command-id="${item.id}">
            ${state.favorites.includes(item.id) ? "★ Favorito" : "☆ Favoritar"}
          </button>
          <button class="ghost-btn copy-command-btn" data-command="${encodeURIComponent(item.command)}">Copiar</button>
        </div>
      </div>

      <div class="command-meta">
        <span class="meta-badge">${item.vendor}</span>
        <span class="meta-badge">${item.category}</span>
      </div>

      <p>${item.description}</p>
      <div class="command-snippet">${item.command}</div>
    </article>
  `).join("");

  $$(".copy-command-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      copyText(decodeURIComponent(btn.dataset.command), "Comando copiado.");
      incrementStat("messages");
    });
  });

  $$(".favorite-command-btn").forEach((btn) => {
    btn.addEventListener("click", () => toggleFavorite(btn.dataset.commandId));
  });
}

$("#vendorFilter").addEventListener("change", () => renderCommands());
$("#commandCategoryFilter").addEventListener("change", () => renderCommands());
$("#commandSearch").addEventListener("input", () => renderCommands());

// =============================================================================
// 10. PARSER DE INCIDENTES
// =============================================================================

/**
 * Extrai informações de um texto utilizando REGEX (expressões regulares).
 *
 * Regex serve para encontrar padrões.
 * Exemplos:
 * - IPv4: 192.168.1.1
 * - horário: 10:35
 * - palavras como "down" e "normalizado"
 *
 * Importante: parser por regex é útil, mas não entende contexto como uma IA.
 */
function extractIncidentData(text) {
  const lines = text.split("\n").map(line => line.trim()).filter(Boolean);
  const hostMatch = text.match(/\b([A-Z]{2,}(?:-[A-Z0-9_]+)+)\b/);
  const interfaceMatch = text.match(/\b(?:Eth(?:ernet)?|XGE|GE|GigabitEthernet|100GE|TenGigE|Port-channel|Po)\S+/i);
  const ipv4s = [...text.matchAll(/\b\d{1,3}(?:\.\d{1,3}){3}\b/g)].map(m => m[0]);
  const timeMatch = text.match(/\b\d{1,2}:\d{2}(?::\d{2})?\b/);
  const dateMatch = text.match(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/);
  const hasDown = /\bdown\b/i.test(text);
  const hasUp = /\bup\/up\b|\bnormalizado\b|\bup\b/i.test(text);
  const severity =
    /crit/i.test(text) ? "Crítica" :
    /alta|major/i.test(text) ? "Alta" :
    /m[eé]dia|medium/i.test(text) ? "Média" :
    /baixa|minor/i.test(text) ? "Baixa" : "Não identificada";
  const durationMatch = text.match(/\b\d+h(?:\s*\d+m)?|\b\d+m(?:\s*\d+s)?|\b\d+s\b/i);

  return {
    host: hostMatch ? hostMatch[0] : "",
    interface: interfaceMatch ? interfaceMatch[0] : "",
    ips: [...new Set(ipv4s)].slice(0, 6),
    time: timeMatch ? timeMatch[0] : "",
    date: dateMatch ? dateMatch[0] : "",
    duration: durationMatch ? durationMatch[0] : "",
    status: hasDown ? "Down / indisponível" : hasUp ? "Up / normalizado" : "Não identificado",
    severity,
    rawLines: lines.slice(0, 8)
  };
}

/**
 * Recebe o objeto já extraído pelo parser e transforma em texto legível.
 * Separar "extrair dados" de "montar resumo" facilita manutenção e testes.
 */
function buildIncidentSummary(data) {
  const chunks = [
    "Resumo automático do incidente:",
    `- Host: ${data.host || "não identificado"}`,
    `- Interface: ${data.interface || "não identificada"}`,
    `- Status: ${data.status}`,
    `- Severidade: ${data.severity}`,
    `- Data/Hora: ${[data.date, data.time].filter(Boolean).join(" ") || "não identificada"}`,
    `- Duração: ${data.duration || "não identificada"}`
  ];

  if (data.ips.length) {
    chunks.push(`- IPs citados: ${data.ips.join(", ")}`);
  }

  if (data.rawLines.length) {
    chunks.push("- Evidências iniciais:");
    data.rawLines.forEach(line => chunks.push(`  • ${line}`));
  }

  chunks.push("- Sugestão: validar enlace, interface, vizinhança e alcance até o próximo salto antes do escalonamento.");
  return chunks.join("\n");
}

$("#parseIncidentBtn").addEventListener("click", () => {
  const input = $("#incidentInput").value.trim();
  if (!input) {
    showToast("Cole o texto do incidente primeiro.");
    return;
  }

  const data = extractIncidentData(input);
  const chipContainer = $("#incidentChips");
  const chips = [];

  if (data.host) chips.push(`Host: ${data.host}`);
  if (data.interface) chips.push(`Interface: ${data.interface}`);
  if (data.status) chips.push(`Status: ${data.status}`);
  if (data.severity) chips.push(`Severidade: ${data.severity}`);
  if (data.date || data.time) chips.push(`Data/Hora: ${[data.date, data.time].filter(Boolean).join(" ")}`);
  if (data.duration) chips.push(`Duração: ${data.duration}`);
  if (data.ips.length) chips.push(`IPs: ${data.ips.join(", ")}`);

  chipContainer.innerHTML = chips.length
    ? chips.map(item => `<span class="chip">${item}</span>`).join("")
    : `<span class="chip">Nenhum padrão identificado</span>`;

  $("#incidentSummaryOutput").value = buildIncidentSummary(data);
  showToast("Incidente analisado.");
});

$("#clearIncidentBtn").addEventListener("click", () => {
  $("#incidentInput").value = "";
  $("#incidentSummaryOutput").value = "";
  $("#incidentChips").innerHTML = "";
  showToast("Parser limpo.");
});

$("#copyIncidentSummaryBtn").addEventListener("click", () => {
  copyText($("#incidentSummaryOutput").value, "Resumo copiado.");
  incrementStat("messages");
});

// =============================================================================
// 11. ASSISTENTE IA
// =============================================================================

/**
 * Gera instruções diferentes conforme o objetivo do usuário.
 * Por enquanto esses prompts também servem para mostrar como estruturar
 * uma futura integração com um modelo de IA real.
 */
function buildAiPrompt(task, context) {
  const prompts = {
    technical_summary:
      `Você é um assistente para operação de NOC. Gere um resumo técnico claro, profissional e objetivo com base no contexto abaixo. Estruture em: sintoma, verificações realizadas, resultado e próxima ação.\n\nContexto:\n${context}`,
    customer_update:
      `Você é um assistente de comunicação para NOC. Com base no contexto abaixo, redija uma atualização ao cliente em português, com linguagem profissional, clara e sem excesso de jargões.\n\nContexto:\n${context}`,
    rfo:
      `Você é um assistente técnico de NOC. Gere um RFO profissional em português com os campos: causa, solução e localização, com base no contexto abaixo.\n\nContexto:\n${context}`,
    next_steps:
      `Você é um assistente operacional de NOC. Analise o contexto abaixo e sugira próximos passos práticos de troubleshooting, em ordem de prioridade.\n\nContexto:\n${context}`
  };

  return prompts[task] || prompts.technical_summary;
}

$("#generateAiPromptBtn").addEventListener("click", () => {
  const context = $("#aiContext").value.trim();
  const task = $("#aiTask").value;

  if (!context) {
    showToast("Informe um contexto para a IA.");
    return;
  }

  $("#aiPromptOutput").value = buildAiPrompt(task, context);
  showToast("Prompt gerado.");
});

$("#copyAiPromptBtn").addEventListener("click", () => {
  copyText($("#aiPromptOutput").value, "Prompt copiado.");
});

$("#copyAiResponseBtn").addEventListener("click", () => {
  copyText($("#aiResponseOutput").value, "Resposta copiada.");
});

// Ao clicar em "Executar pelo backend", fetch() envia JSON para o Flask.
// O navegador NÃO executa Python diretamente; ele conversa com o servidor HTTP.
$("#runAiBtn").addEventListener("click", async () => {
  const task = $("#aiTask").value;
  const context = $("#aiContext").value.trim();

  if (!context) {
    showToast("Informe um contexto para processar.");
    return;
  }

  $("#aiResponseOutput").value = "Processando...";

  try {
    const response = await fetch("/api/ai-assist", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ task, context })
    });

    if (!response.ok) {
      throw new Error("Falha na requisição.");
    }

    const data = await response.json();
    $("#aiResponseOutput").value = data.result || "Sem resposta.";
    showToast(`Resposta gerada (${data.mode || "local"}).`);
  } catch (error) {
    $("#aiResponseOutput").value = "Não foi possível conectar ao backend de IA. Você ainda pode usar o prompt gerado manualmente.";
    showToast("Falha ao conectar com o backend.");
  }
});

// =============================================================================
// 12. REFERÊNCIAS, SIGLAS E REDES
// =============================================================================

/**
 * Normaliza texto para pesquisa.
 * Exemplo: "Maceió" e "maceio" passam a combinar na busca.
 */
function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * Filtra as cidades/siglas e monta as linhas da tabela.
 * Se quiser adicionar uma cidade, altere references.siglas.
 */
function renderSiglas(query = "") {
  const q = normalizeText(query.trim());
  const rows = references.siglas.filter(([cidade, sigla]) => {
    if (!q) return true;
    return normalizeText(`${cidade} ${sigla}`).includes(q);
  });

  $("#referenceCount").textContent = `${rows.length} ${rows.length === 1 ? "localidade" : "localidades"}`;

  $("#siglasTable").innerHTML = rows.map(([cidade, sigla]) => `
    <tr class="${q ? "match-highlight" : ""}">
      <td>${cidade}</td>
      <td><strong>${sigla}</strong></td>
      <td><button class="copy-mini-btn copy-sigla-btn" data-sigla="${sigla}" data-cidade="${cidade}">Copiar</button></td>
    </tr>
  `).join("");

  $$(".copy-sigla-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      copyText(btn.dataset.sigla, `${btn.dataset.cidade}: ${btn.dataset.sigla} copiada.`);
      incrementStat("messages");
    });
  });

  const spotlight = $("#referenceSpotlight");
  if (q && rows.length === 1) {
    const [cidade, sigla] = rows[0];
    spotlight.innerHTML = `
      <strong>${cidade} → ${sigla}</strong>
      <p>Resultado exato/único encontrado na base de siglas do NOC.</p>
    `;
    spotlight.classList.remove("hidden");
  } else if (q && rows.length > 1 && rows.length <= 5) {
    spotlight.innerHTML = `
      <strong>${rows.length} resultados encontrados</strong>
      <p>${rows.map(([cidade, sigla]) => `${cidade} (${sigla})`).join(" · ")}</p>
    `;
    spotlight.classList.remove("hidden");
  } else {
    spotlight.classList.add("hidden");
    spotlight.innerHTML = "";
  }
}

function renderContacts() {
  $("#contactsTable").innerHTML = references.contatos.map(item => `
    <tr><td>${item[0]}</td><td>${item[1]}</td><td>${item[2]}</td></tr>
  `).join("");
}

function getFilteredNetworks(query = "") {
  const q = normalizeText(query.trim());
  if (!q) return references.redes;

  return references.redes.filter(([id, rede, cidade]) =>
    normalizeText(`${id} ${rede} ${cidade}`).includes(q)
  );
}

function renderNetworks(query = "") {
  const filtered = getFilteredNetworks(query);
  const select = $("#networkSelect");
  const current = select.value;

  select.innerHTML = [
    `<option value="">Selecione uma rede</option>`,
    ...filtered.map(([id, rede, cidade]) =>
      `<option value="${id}">${id} — ${rede || "SEM REDE"} — ${cidade}</option>`
    )
  ].join("");

  if (filtered.some(([id]) => String(id) === current)) {
    select.value = current;
  }

  $("#networkTable").innerHTML = filtered.map(([id, rede, cidade]) => `
    <tr>
      <td><strong>${id}</strong></td>
      <td>${rede || "-"}</td>
      <td>${cidade}</td>
    </tr>
  `).join("");

  updateNetworkRulePreview();
}

/**
 * Atualiza somente a prévia do comando de geração de regra.
 * O navegador NÃO executa o comando SSH; ele apenas monta/copia o texto.
 */
function updateNetworkRulePreview() {
  const id = $("#networkSelect").value;
  $("#networkRulePreview").textContent = id ? `/bin/gerar3.sh ${id}` : "/bin/gerar3.sh [ID]";
}

function renderReferences() {
  renderSiglas($("#referenceSearch")?.value || "");
  renderContacts();
  renderNetworks($("#networkSearch")?.value || "");
}

$("#referenceSearch").addEventListener("input", (event) => {
  renderSiglas(event.target.value);
});

$("#clearReferenceSearchBtn").addEventListener("click", () => {
  $("#referenceSearch").value = "";
  renderSiglas("");
  $("#referenceSearch").focus();
});

$("#networkSearch").addEventListener("input", (event) => {
  renderNetworks(event.target.value);
});

$("#networkSelect").addEventListener("change", updateNetworkRulePreview);

$("#copyNetworkRuleBtn").addEventListener("click", () => {
  const command = $("#networkRulePreview").textContent;
  if (!$("#networkSelect").value) {
    showToast("Selecione uma rede antes de copiar.");
    return;
  }
  copyText(command, "Comando da rede copiado.");
  incrementStat("messages");
});

// =============================================================================
// 13. BUSCA GLOBAL
// =============================================================================
// Reaproveita as buscas específicas de comandos e modelos.
function filterGlobal(query) {
  const q = query.trim().toLowerCase();

  if (!q) {
    updateTemplateList();
    renderCommands();
    return;
  }

  $("#commandSearch").value = q;
  renderCommands(q);

  $("#templateSearch").value = q;
  updateTemplateList();
}

$("#globalCommandSearch").addEventListener("input", (e) => filterGlobal(e.target.value));


// =============================================================================
// 14. EVENTOS DE APARÊNCIA E PERFIL
// =============================================================================
// A partir daqui vemos muitos addEventListener.
// Eles ligam os elementos do HTML às funções definidas acima.

// APARÊNCIA
$("#appearanceBtn").addEventListener("click", () => {
  applyTheme(state.theme);
  openModal("appearanceModal");
});

$$(".theme-option").forEach((button) => {
  button.addEventListener("click", () => {
    applyTheme(button.dataset.themeChoice, true);
  });
});

// PERFIL
$("#profileBtn").addEventListener("click", () => {
  renderProfile();
  openModal("profileModal");
});

$$("[data-close-modal]").forEach((button) => {
  button.addEventListener("click", () => closeModal(button.dataset.closeModal));
});

$$(".modal-backdrop").forEach((modal) => {
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModal(modal.id);
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    $$(".modal-backdrop.open").forEach((modal) => closeModal(modal.id));
  }
});

$$(".avatar-icon-option").forEach((button) => {
  button.addEventListener("click", () => {
    state.profile.image = "";
    state.profile.icon = button.dataset.icon;
    renderProfile();
  });
});

$("#profileNameInput").addEventListener("input", (event) => {
  $("#profilePreviewName").textContent = event.target.value.trim() || "Operador NOC";
});

$("#profileRoleInput").addEventListener("input", (event) => {
  $("#profilePreviewRole").textContent = event.target.value.trim() || "NOC";
});

$("#profileImageInput").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const resized = await resizeProfileImage(file);
    state.profile.image = resized;
    renderAvatar($("#profileAvatarPreview"), state.profile);
    $$(".avatar-icon-option").forEach((button) => button.classList.remove("active"));
    showToast("Imagem preparada para o perfil.");
  } catch (error) {
    showToast(error.message || "Não foi possível usar a imagem.");
  } finally {
    event.target.value = "";
  }
});

$("#removeProfileImageBtn").addEventListener("click", () => {
  state.profile.image = "";
  if (!state.profile.icon) state.profile.icon = "👩‍💻";
  renderProfile();
  showToast("Perfil voltou a usar ícone.");
});

$("#saveProfileBtn").addEventListener("click", () => {
  state.profile.name = $("#profileNameInput").value.trim() || "Operador NOC";
  state.profile.role = $("#profileRoleInput").value.trim() || "NOC";
  state.profile.icon = state.profile.icon || "👩‍💻";

  saveProfile();
  renderProfile();
  closeModal("profileModal");
  showToast("Perfil atualizado.");
});

// =============================================================================
// 15. NOTAS DO TURNO
// =============================================================================
// O evento "input" dispara enquanto o usuário digita.
// O setTimeout cria um pequeno "debounce": espera 250ms antes de salvar.
const notes = $("#shiftNotes");
const notesStatus = $("#notesStatus");
notes.value = localStorage.getItem("nfs_notes") || "";

notes.addEventListener("input", () => {
  notesStatus.textContent = "salvando...";
  clearTimeout(notes._timer);
  notes._timer = setTimeout(() => {
    localStorage.setItem("nfs_notes", notes.value);
    notesStatus.textContent = "salvo";
  }, 250);
});

// =============================================================================
// 16. EXPORTAÇÃO E IMPORTAÇÃO
// =============================================================================
// A exportação cria um arquivo JSON.
// Isso permite fazer backup de preferências sem precisar de banco de dados.
$("#exportDataBtn").addEventListener("click", () => {
  const exportData = {
    notes: localStorage.getItem("nfs_notes") || "",
    stats: state.stats,
    favorites: state.favorites,
    customTemplates: state.customTemplates,
    theme: state.theme,
    profile: state.profile
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "noc-flow-studio-data.json";
  a.click();
  URL.revokeObjectURL(url);
  showToast("Dados exportados.");
});

$("#importDataBtn").addEventListener("click", () => $("#importFile").click());

$("#importFile").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const data = JSON.parse(text);

    if (typeof data.notes === "string") {
      localStorage.setItem("nfs_notes", data.notes);
      notes.value = data.notes;
    }

    if (data.stats) {
      state.stats = data.stats;
      saveStats();
    }

    if (Array.isArray(data.favorites)) {
      state.favorites = data.favorites;
      saveFavorites();
    }

    if (Array.isArray(data.customTemplates)) {
      state.customTemplates = data.customTemplates;
      saveCustomTemplates();
    }

    if (typeof data.theme === "string" && VALID_THEMES.has(data.theme)) {
      state.theme = data.theme;
      applyTheme(state.theme);
    }

    if (data.profile && typeof data.profile === "object") {
      state.profile = {
        name: String(data.profile.name || "Operador NOC").slice(0, 40),
        role: String(data.profile.role || "NOC").slice(0, 50),
        icon: String(data.profile.icon || "👩‍💻"),
        image: typeof data.profile.image === "string" ? data.profile.image : ""
      };
      saveProfile();
      renderProfile();
    }

    renderStats();
    renderTemplates();
    renderCommands();
    showToast("Dados importados.");
  } catch (error) {
    showToast("Arquivo inválido.");
  }

  event.target.value = "";
});

$("#downloadFrontendBtn").addEventListener("click", () => {
  window.location.href = "/download/project";
});

// =============================================================================
// 17. INICIALIZAÇÃO
// =============================================================================
/**
 * init() é o ponto de partida da aplicação.
 *
 * Quando script.js termina de carregar, init():
 * - aplica o tema salvo;
 * - desenha o perfil;
 * - carrega indicadores;
 * - cria listas e filtros.
 *
 * Se você criar um módulo novo que precisa ser montado ao abrir o sistema,
 * normalmente adicionará uma chamada aqui.
 */
function init() {
  applyTheme(state.theme);
  renderProfile();
  renderStats();
  renderTemplates();
  renderCommandFilters();
  renderCommands();
  renderReferences();
}

init();
