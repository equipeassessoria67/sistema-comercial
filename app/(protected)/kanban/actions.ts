"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateEtapaKanban(leadId: string, etapa: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("leads")
    .update({ etapa_kanban: etapa })
    .eq("id", leadId);
  if (error) throw new Error("Erro ao mover o lead.");
  revalidatePath("/kanban");
}

export async function getInteracoes(leadId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("interacoes")
    .select("*")
    .eq("lead_id", leadId)
    .order("criado_em", { ascending: false });
  if (error) throw new Error("Erro ao buscar interações.");
  return data ?? [];
}

export async function addInteracao(payload: {
  lead_id: string;
  canal: string;
  tipo: string;
  descricao: string;
  proximo_passo: string;
  data_proximo_passo: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.from("interacoes").insert({
    lead_id: payload.lead_id,
    canal: payload.canal,
    tipo: payload.tipo,
    descricao: payload.descricao || null,
    proximo_passo: payload.proximo_passo || null,
    data_proximo_passo: payload.data_proximo_passo || null,
    usuario_id: user?.id ?? null,
  });
  if (error) throw new Error("Erro ao registrar interação.");
}
