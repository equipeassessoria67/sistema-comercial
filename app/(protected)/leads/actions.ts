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

export async function getExistingCnpjs(cnpjs: string[]): Promise<string[]> {
  if (cnpjs.length === 0) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("leads")
    .select("cnpj")
    .in("cnpj", cnpjs);
  return (data ?? []).map((r: { cnpj: string }) => r.cnpj);
}
