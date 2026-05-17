"use server";

import { createClient } from "@/lib/supabase/server";
import { calculateScore } from "@/lib/brasilapi";
import type { BrasilApiCnpjResponse } from "@/lib/brasilapi";

export async function addLead(
  data: BrasilApiCnpjResponse
): Promise<{ error?: string; message?: string }> {
  const supabase = await createClient();

  const cnpjDigits = data.cnpj.replace(/\D/g, "");

  const { data: existing } = await supabase
    .from("leads")
    .select("id")
    .eq("cnpj", cnpjDigits)
    .maybeSingle();

  if (existing) {
    return { error: `O CNPJ ${data.cnpj} já está cadastrado na base de leads.` };
  }

  const logradouro = [
    data.descricao_tipo_de_logradouro,
    data.logradouro,
    data.numero,
    data.complemento,
  ]
    .filter(Boolean)
    .join(" ");

  const { error } = await supabase.from("leads").insert({
    cnpj: cnpjDigits,
    razao_social: data.razao_social,
    nome_fantasia: data.nome_fantasia || null,
    situacao: data.situacao_cadastral,
    data_abertura: data.data_abertura || null,
    cnae_codigo: String(data.cnae_fiscal),
    cnae_descricao: data.cnae_fiscal_descricao,
    porte: data.porte,
    natureza_juridica: data.natureza_juridica,
    logradouro: logradouro || null,
    municipio: data.municipio,
    uf: data.uf,
    cep: data.cep,
    telefone: data.ddd_telefone_1 || null,
    email: data.email || null,
    socios: data.qsa ?? [],
    score: calculateScore(data),
    etapa_kanban: "novo",
  });

  if (error) {
    console.error("Erro ao inserir lead:", error);
    return { error: "Erro ao salvar o lead. Tente novamente." };
  }

  return { message: `Lead "${data.razao_social}" adicionado com sucesso!` };
}

export interface LeadRow {
  id: string;
  cnpj: string;
  razao_social: string;
  nome_fantasia: string | null;
  situacao: string;
  data_abertura: string | null;
  cnae_codigo: string;
  cnae_descricao: string;
  porte: string;
  municipio: string;
  uf: string;
  telefone: string | null;
  email: string | null;
  score: number;
  etapa_kanban: string;
  ultimo_contato: string | null;
  proximo_passo: string | null;
}

export async function getLeads(): Promise<{ data?: LeadRow[]; error?: string }> {
  const supabase = await createClient();

  const [{ data: leads, error }, { data: interacoes }] = await Promise.all([
    supabase
      .from("leads")
      .select(
        "id, cnpj, razao_social, nome_fantasia, situacao, data_abertura, cnae_codigo, cnae_descricao, porte, municipio, uf, telefone, email, score, etapa_kanban"
      )
      .order("razao_social", { ascending: true }),
    supabase
      .from("interacoes")
      .select("lead_id, criado_em, proximo_passo")
      .order("criado_em", { ascending: false }),
  ]);

  if (error) {
    console.error("[getLeads] Supabase error:", JSON.stringify(error));
    return { error: `${error.code}: ${error.message}` };
  }

  const latestMap = new Map<string, { criado_em: string; proximo_passo: string | null }>();
  for (const ic of interacoes ?? []) {
    if (!latestMap.has(ic.lead_id)) {
      latestMap.set(ic.lead_id, { criado_em: ic.criado_em, proximo_passo: ic.proximo_passo ?? null });
    }
  }

  const enriched: LeadRow[] = (leads ?? []).map((l) => {
    const latest = latestMap.get(l.id);
    return {
      ...(l as Omit<LeadRow, "ultimo_contato" | "proximo_passo">),
      ultimo_contato: latest?.criado_em ?? null,
      proximo_passo: latest?.proximo_passo ?? null,
    };
  });

  return { data: enriched };
}

export async function getExistingCnpjs(cnpjs: string[]): Promise<string[]> {
  if (cnpjs.length === 0) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("leads")
    .select("cnpj")
    .in("cnpj", cnpjs);
  return (data ?? []).map((r: { cnpj: string }) => r.cnpj);
}
