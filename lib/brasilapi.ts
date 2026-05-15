export interface BrasilApiSocio {
  nome: string;
  qualificacao_socio: string;
  cnpj_cpf_do_socio: string;
  data_entrada_sociedade: string;
}

export interface BrasilApiCnpjResponse {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  situacao_cadastral: string;
  descricao_situacao_cadastral: string;
  data_situacao_cadastral: string;
  data_abertura: string;
  cnae_fiscal: number;
  cnae_fiscal_descricao: string;
  descricao_tipo_de_logradouro: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cep: string;
  uf: string;
  municipio: string;
  ddd_telefone_1: string;
  ddd_telefone_2: string;
  email: string;
  porte: string;
  descricao_porte: string;
  natureza_juridica: string;
  qsa: BrasilApiSocio[];
}

export interface ScoreCriterion {
  label: string;
  points: number;
  achieved: boolean;
}

export function calculateScoreBreakdown(data: BrasilApiCnpjResponse): ScoreCriterion[] {
  const hasEmail = Boolean(data.email);
  const hasPhone = Boolean(data.ddd_telefone_1);
  const isMeEpp = data.porte === "ME" || data.porte === "EPP";
  const hasFantasia = Boolean(data.nome_fantasia);
  const hasSocios = Boolean(data.qsa && data.qsa.length > 0);

  let idadePoints = 0;
  let idadeLabel = "Empresa entre 2 e 10 anos";
  if (data.data_abertura) {
    const years =
      (Date.now() - new Date(data.data_abertura).getTime()) /
      (365.25 * 24 * 60 * 60 * 1000);
    if (years >= 2 && years <= 10) {
      idadePoints = 20;
    } else if (years > 10) {
      idadePoints = 10;
      idadeLabel = "Empresa com mais de 10 anos";
    }
  }

  return [
    { label: "Tem e-mail",          points: hasEmail   ? 20 : 0, achieved: hasEmail },
    { label: "Tem telefone",         points: hasPhone   ? 15 : 0, achieved: hasPhone },
    { label: "Porte ME ou EPP",      points: isMeEpp   ? 20 : 0, achieved: isMeEpp },
    { label: "Tem nome fantasia",    points: hasFantasia ? 10 : 0, achieved: hasFantasia },
    { label: "Tem sócios",           points: hasSocios  ? 15 : 0, achieved: hasSocios },
    { label: idadeLabel,             points: idadePoints,          achieved: idadePoints > 0 },
  ];
}

export function calculateScore(data: BrasilApiCnpjResponse): number {
  const total = calculateScoreBreakdown(data).reduce((acc, c) => acc + c.points, 0);
  return Math.min(total, 100);
}

export async function fetchCnpj(cnpj: string): Promise<BrasilApiCnpjResponse> {
  const digits = cnpj.replace(/\D/g, "");
  const res = await fetch(`/api/cnpj/${digits}`, { cache: "no-store" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Erro ao consultar o CNPJ. Tente novamente.");
  }
  return res.json();
}

// ── ReceitaWS fallback ──────────────────────────────────────────────────────

interface ReceitaWsResponse {
  status: string;
  cnpj: string;
  nome: string;
  fantasia: string;
  situacao: string;
  abertura: string; // "DD/MM/YYYY"
  atividade_principal: Array<{ code: string; text: string }>;
  natureza_juridica: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  email: string;
  telefone: string;
  porte: string;
  qsa: Array<{ nome: string; qual: string }>;
}

function normalizeReceitaWs(r: ReceitaWsResponse): BrasilApiCnpjResponse {
  let dataAbertura = "";
  if (r.abertura) {
    const [d, m, y] = r.abertura.split("/");
    dataAbertura = `${y}-${m}-${d}`;
  }

  let porte = "DEMAIS";
  if (r.porte?.toUpperCase().includes("MICRO")) porte = "ME";
  else if (r.porte?.toUpperCase().includes("PEQUENO")) porte = "EPP";

  const cnaeRaw = r.atividade_principal?.[0]?.code ?? "";
  const cnaeDigits = parseInt(cnaeRaw.replace(/\D/g, ""), 10) || 0;

  return {
    cnpj: r.cnpj,
    razao_social: r.nome,
    nome_fantasia: r.fantasia,
    situacao_cadastral: r.situacao,
    descricao_situacao_cadastral: r.situacao,
    data_situacao_cadastral: "",
    data_abertura: dataAbertura,
    cnae_fiscal: cnaeDigits,
    cnae_fiscal_descricao: r.atividade_principal?.[0]?.text ?? "",
    descricao_tipo_de_logradouro: "",
    logradouro: r.logradouro,
    numero: r.numero,
    complemento: r.complemento,
    bairro: r.bairro,
    cep: r.cep,
    uf: r.uf,
    municipio: r.municipio,
    ddd_telefone_1: r.telefone,
    ddd_telefone_2: "",
    email: r.email,
    porte,
    descricao_porte: r.porte,
    natureza_juridica: r.natureza_juridica,
    qsa: (r.qsa ?? []).map((s) => ({
      nome: s.nome,
      qualificacao_socio: s.qual,
      cnpj_cpf_do_socio: "",
      data_entrada_sociedade: "",
    })),
  };
}

export async function fetchCnpjWithFallback(
  cnpj: string
): Promise<BrasilApiCnpjResponse> {
  try {
    return await fetchCnpj(cnpj);
  } catch {
    // Fallback: ReceitaWS (free tier, sem CORS issues)
    const res = await fetch(`https://receitaws.com.br/v1/cnpj/${cnpj}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("CNPJ não encontrado");
    const data: ReceitaWsResponse = await res.json();
    if (data.status === "ERROR") throw new Error("CNPJ não encontrado");
    return normalizeReceitaWs(data);
  }
}
