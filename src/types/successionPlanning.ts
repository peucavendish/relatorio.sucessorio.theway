export interface SuccessionPlanningData {
  meta: {
    etapa: string;
    status: string;
    versao_modelo: string;
    data_execucao: string;
  };
  cliente: {
    nome?: string;
    estado_civil: string;
    regime_bens: string;
    data_casamento: string;
    idade_conjuge: number;
    filhos: Array<{
      quantidade: number;
      idades: number[];
    }>;
    herdeiros_vulneraveis: boolean;
    beneficiarios_adicionais: {
      tem: boolean;
      descricao: string | null;
    };
  };
  patrimonio: {
    imoveis: number;
    participacoes_societarias: number;
    investimentos_financeiros: number;
    previdencia_privada: number | null;
    bens_exterior: number | null;
    outros_bens: number | null;
    dividas: number;
    residencia_fiscal: string;
    bens_no_exterior: boolean;
    herdeiros_no_exterior: boolean;
  };
  estruturas_existentes: {
    holding: boolean;
    acordo_socios: boolean;
    testamento: boolean;
    doacoes_em_vida: boolean;
    clausulas_restritivas: boolean;
    mandato_preventivo: boolean;
  };
  necessidade_liquidez: {
    tem: boolean;
    finalidade: string;
    valor_estimado: number | null;
  };
  riscos_sucessorios: {
    litigio_familiar: boolean;
    multiplos_nucleos: boolean;
    imobilizacao_patrimonial: boolean;
  };
  diagnostico: {
    classificacao: string;
    resumo: string;
    principais_pontos: string[];
  };
  estrategias_recomendadas: Array<{
    situacao_identificada: string;
    estrategia: string;
    como_funciona: string;
    impacto: string;
    explicacao_contextual?: string;
  }>;
  estimativas: {
    custo_transmissao_percentual: string;
    prazo_inventario: string;
    liquidez_recomendada_percentual: number;
    observacoes: string;
  };
  checagem_documental: Array<{
    documento: string;
    existe: boolean;
    proximo_passo: string;
  }>;
  cronograma: Array<{
    semana: string;
    acao: string;
    responsavel: string;
    status: string;
  }>;
  encerramento: {
    resumo: string;
    acoes_criticas: string[];
    prazo_execucao_dias: number;
  };
  seguro_vida?: {
    seguros_existentes?: Array<{
      tipo: string;
      seguradora: string;
      valor_cobertura: number;
      custo_mensal: number;
    }>;
    cobertura_sugerida?: number;
    cobertura_minima?: number;
    descricao?: string;
    riscos_protegidos?: string[];
    despesas_mensais?: number;
    custo_anual?: number;
    meses_ate_aposentadoria?: number;
  };
}

