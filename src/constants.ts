export interface ChecklistItem {
  id: string;
  question: string;
}

export interface ChecklistSection {
  title: string;
  items: ChecklistItem[];
}

export const STORES = [
  'Barra Shopping',
  'Floresta',
  'Protásio',
  'Canoas',
  'São Leopoldo',
  'Novo Hamburgo',
  'Caxias do Sul',
  'Bento Gonçalves',
  'República Ipiranga'
];

export const CHECKLIST_DATA: ChecklistSection[] = [
  {
    title: "1. LIMPEZA E ORGANIZAÇÃO",
    items: [
      { id: "1.1", question: "Os vidros da fachada, estão em bom estado de conservação, limpos e sem trincos/quebrado ou sujos?" },
      { id: "1.2", question: "Como está a limpeza da área externa da loja?" },
      { id: "1.3", question: "A loja conta com mesas e cadeiras na área interna? Estão limpas, com boa pintura, sem lascas ou quebradas?" },
      { id: "1.4", question: "Como está a limpeza do chão do salão?" },
      { id: "1.5", question: "O balcão de atendimento está limpo, organizado e em bom estado de conservação?" },
      { id: "1.6", question: "Os vidros da área interna apresentam em bom estado de conservação, limpos e sem trincado/quebrado?" },
      { id: "1.7", question: "A loja conta com banheiro disponível? Se sim, está organizado e limpo?" },
      { id: "1.8", question: "As paredes internas da loja estão limpas e em bom estado de conservação e com a pintura dentro do padrão?" },
      { id: "1.9", question: "Como está a limpeza e funcionamento das fritadeiras?" },
      { id: "1.10", question: "Como está a limpeza e funcionamento do computador?" },
      { id: "1.11", question: "Como está o funcionamento do celular da loja?" },
      { id: "1.12", question: "Como está a limpeza e funcionamento da impressora?" },
      { id: "1.13", question: "Quantas tem e como está a limpeza e funcionamento das máquinas de cartão?" },
      { id: "1.14", question: "Como está a limpeza e funcionamento da geladeira de insumos?" },
      { id: "1.15", question: "Como está a limpeza e funcionamento da bancada de montagem?" },
      { id: "1.16", question: "Como está a limpeza e funcionamento do freezer?" },
      { id: "1.17", question: "Como está a limpeza e funcionamento das geladeiras de bebidas?" },
      { id: "1.18", question: "Como está a limpeza e funcionamento da Tv´s?" },
      { id: "1.19", question: "Como está a limpeza e funcionamento da coifa e exaustor?" },
      { id: "1.20", question: "Como está a limpeza e funcionamento do micro-ondas?" },
      { id: "1.21", question: "Como está a limpeza e funcionamento da jarra elétrica?" },
      { id: "1.22", question: "Como está a limpeza e funcionamento do ar-condicionado?" },
      { id: "1.23", question: "Como está a limpeza e funcionamento dos utensílios, como ralador, colheres, carretilhas, facas, cubas e outros?" },
      { id: "1.24", question: "Como está a limpeza das prateleiras do estoque de insumos e embalagens?" },
      { id: "1.25", question: "Como está a limpeza dos banheiros?" },
      { id: "1.26", question: "Como está a limpeza e organização do vestiário e armários?" },
      { id: "1.27", question: "Como está a limpeza do chão da cozinha?" },
      { id: "1.28", question: "A unidade necessita alguma manutenção ou melhoria específica? Se sim liste quais. Ex. elétrica, hidráulica. pintura, alvenaria..." },
    ],
  },
  {
    title: "2. MONTAGEM, FRITURA E EMPACOTAMENTO",
    items: [
      { id: "2.1", question: "A unidade segue os padrões de montagem dos pastéis conforme gabarito?" },
      { id: "2.2", question: "O tempo de montagem do pastel está aceitável?" },
      { id: "2.3", question: "Realiza a dosagem dos insumos na colher antes de colocar na massa?" },
      { id: "2.4", question: "O tempo de fritura está correto?" },
      { id: "2.5", question: "Os pastéis estão sendo acondicionados corretamente nas embalagens?" },
      { id: "2.6", question: "O pré-plantão dos insumos está organizado?" },
      { id: "2.7", question: "Realiza o corte da massa e a montagem nos tamanhos corretos? Pequeno, Médio e Grande." },
      { id: "2.8", question: "Como está a coloração dos pastéis?" },
      { id: "2.9", question: "A unidade mantém os insumos devidamente armazenados, embalados e com as etiquetas de validade corretas?" },
      { id: "2.10", question: "A unidade mantém as planilhas de controle de troca e filtragem de óleo atualizadas?" },
      { id: "2.11", question: "A unidade mantém as planilhas de controle de estoque diário atualizadas?" },
      { id: "2.12", question: "A unidade mantém as planilhas de controle de desperdício atualizadas?" },
    ],
  },
];
