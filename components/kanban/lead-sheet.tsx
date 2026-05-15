"use client";

import { useEffect, useState } from "react";
import { X, Users, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { scoreBadgeClass } from "@/components/ui/badge";
import { getInteracoes, addInteracao, updateEtapaKanban } from "@/app/(protected)/kanban/actions";
import type { KanbanLead } from "@/components/kanban/kanban-board";

type Interacao = {
  id: string;
  lead_id: string;
  canal: string;
  tipo: string;
  descricao: string | null;
  proximo_passo: string | null;
  data_proximo_passo: string | null;
  criado_em: string;
};

const COLUNAS_LABELS: Record<string, string> = {
  novo: "Novo Lead",
  qualificacao: "Em Qualificação",
  contato_feito: "Contato Feito",
  aguardando_retorno: "Aguardando Retorno",
  proposta_enviada: "Proposta Enviada",
  cliente: "Cliente",
  descartado: "Descartado",
};

const CANAIS = ["WhatsApp", "E-mail", "Telefone", "Presencial"] as const;
const TIPOS = [
  "Tentativa de contato",
  "Resposta recebida",
  "Reunião",
  "Proposta enviada",
  "Outro",
] as const;

const CANAL_EMOJI: Record<string, string> = {
  WhatsApp: "💬",
  "E-mail": "📧",
  Telefone: "📞",
  Presencial: "🤝",
};

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("pt-BR");
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCnpj(cnpj: string) {
  const d = cnpj.replace(/\D/g, "");
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
        {label}
      </span>
      <span className="text-sm text-slate-700">{value || "—"}</span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
      {children}
    </h3>
  );
}

const selectClass =
  "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

export function LeadSheet({
  lead,
  onClose,
  onEtapaChange,
}: {
  lead: KanbanLead | null;
  onClose: () => void;
  onEtapaChange: (leadId: string, novaEtapa: string) => void;
}) {
  const [interacoes, setInteracoes] = useState<Interacao[]>([]);
  const [loadingIc, setLoadingIc] = useState(false);
  const [novaEtapa, setNovaEtapa] = useState("");
  const [movendo, setMovendo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    canal: "WhatsApp",
    tipo: "Tentativa de contato",
    descricao: "",
    proximo_passo: "",
    data_proximo_passo: "",
  });

  useEffect(() => {
    if (!lead) {
      setInteracoes([]);
      return;
    }
    setNovaEtapa(lead.etapa_kanban);
    setLoadingIc(true);
    getInteracoes(lead.id).then((data) => {
      setInteracoes(data as Interacao[]);
      setLoadingIc(false);
    });
  }, [lead?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!lead) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lead, onClose]);

  async function handleMover() {
    if (!lead || !novaEtapa || novaEtapa === lead.etapa_kanban) return;
    setMovendo(true);
    try {
      await updateEtapaKanban(lead.id, novaEtapa);
      onEtapaChange(lead.id, novaEtapa);
    } finally {
      setMovendo(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!lead) return;
    setSaving(true);
    try {
      await addInteracao({ lead_id: lead.id, ...form });
      const fresh = await getInteracoes(lead.id);
      setInteracoes(fresh as Interacao[]);
      setForm({
        canal: "WhatsApp",
        tipo: "Tentativa de contato",
        descricao: "",
        proximo_passo: "",
        data_proximo_passo: "",
      });
    } finally {
      setSaving(false);
    }
  }

  const isOpen = !!lead;

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden
        className={cn(
          "fixed inset-0 z-40 bg-black/40 transition-opacity duration-300",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col bg-white shadow-2xl",
          "transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {lead && (
          <>
            {/* Header */}
            <div className="shrink-0 border-b border-slate-200 px-6 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-slate-900 leading-tight">
                    {lead.razao_social}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">{formatCnpj(lead.cnpj)}</p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span
                      className={cn(
                        "text-xs font-semibold px-2 py-0.5 rounded-full border",
                        scoreBadgeClass(lead.score)
                      )}
                    >
                      {lead.score} pts
                    </span>
                    <span className="text-xs text-slate-400">
                      {COLUNAS_LABELS[lead.etapa_kanban] ?? lead.etapa_kanban}
                    </span>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="shrink-0 rounded-md p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {/* Dados da empresa */}
              <section className="px-6 py-5">
                <SectionTitle>Dados da Empresa</SectionTitle>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                  <Row label="Nome Fantasia" value={lead.nome_fantasia} />
                  <Row label="Situação" value={lead.situacao} />
                  <Row
                    label="CNAE"
                    value={`${lead.cnae_codigo} – ${lead.cnae_descricao}`}
                  />
                  <Row label="Porte" value={lead.porte} />
                  <Row label="Natureza Jurídica" value={lead.natureza_juridica} />
                  <Row label="Data de Abertura" value={formatDate(lead.data_abertura)} />
                  <Row label="Endereço" value={lead.logradouro} />
                  <Row label="Município / UF" value={`${lead.municipio} / ${lead.uf}`} />
                  <Row label="CEP" value={lead.cep} />
                  <Row label="Telefone" value={lead.telefone} />
                  <Row label="E-mail" value={lead.email} />
                </div>
              </section>

              {/* Quadro societário */}
              {(lead.socios?.length ?? 0) > 0 && (
                <section className="px-6 py-5">
                  <SectionTitle>Quadro Societário ({lead.socios.length})</SectionTitle>
                  <div className="space-y-2">
                    {lead.socios.map((socio, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2.5 rounded-md bg-slate-50 px-3 py-2"
                      >
                        <Users className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-slate-700">{socio.nome}</p>
                          <p className="text-xs text-slate-400">{socio.qualificacao_socio}</p>
                          {socio.data_entrada_sociedade && (
                            <p className="text-xs text-slate-400">
                              Desde {formatDate(socio.data_entrada_sociedade)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Mover para etapa */}
              <section className="px-6 py-5">
                <SectionTitle>Mover para Etapa</SectionTitle>
                <div className="flex gap-2">
                  <select
                    value={novaEtapa}
                    onChange={(e) => setNovaEtapa(e.target.value)}
                    className={selectClass}
                  >
                    {Object.entries(COLUNAS_LABELS).map(([val, lbl]) => (
                      <option key={val} value={val}>
                        {lbl}
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    onClick={handleMover}
                    disabled={movendo || novaEtapa === lead.etapa_kanban}
                  >
                    {movendo ? "Movendo..." : "Mover"}
                  </Button>
                </div>
              </section>

              {/* Registrar interação */}
              <section className="px-6 py-5">
                <SectionTitle>Registrar Interação</SectionTitle>
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Canal</Label>
                      <select
                        value={form.canal}
                        onChange={(e) => setForm((f) => ({ ...f, canal: e.target.value }))}
                        className={selectClass}
                      >
                        {CANAIS.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Tipo</Label>
                      <select
                        value={form.tipo}
                        onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}
                        className={selectClass}
                      >
                        {TIPOS.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Descrição</Label>
                    <Textarea
                      value={form.descricao}
                      onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                      placeholder="Descreva o que aconteceu neste contato..."
                      className="min-h-[72px]"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Próximo Passo</Label>
                    <Textarea
                      value={form.proximo_passo}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, proximo_passo: e.target.value }))
                      }
                      placeholder="O que deve acontecer a seguir?"
                      className="min-h-[56px]"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Data do Próximo Passo</Label>
                    <input
                      type="date"
                      value={form.data_proximo_passo}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, data_proximo_passo: e.target.value }))
                      }
                      className={selectClass}
                    />
                  </div>

                  <Button type="submit" size="sm" className="w-full" disabled={saving}>
                    {saving ? "Salvando..." : "Registrar Interação"}
                  </Button>
                </form>
              </section>

              {/* Histórico de interações */}
              <section className="px-6 py-5">
                <SectionTitle>Histórico de Interações</SectionTitle>

                {loadingIc ? (
                  <p className="text-sm text-slate-400">Carregando...</p>
                ) : interacoes.length === 0 ? (
                  <p className="text-sm text-slate-400">Nenhuma interação registrada.</p>
                ) : (
                  <div className="relative">
                    <div className="absolute left-[15px] top-0 bottom-0 w-px bg-slate-200" />
                    <div className="space-y-5">
                      {interacoes.map((ic) => (
                        <div key={ic.id} className="relative flex gap-3">
                          <div className="shrink-0 w-8 h-8 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center text-sm z-10 shadow-sm">
                            {CANAL_EMOJI[ic.canal] ?? "💬"}
                          </div>
                          <div className="flex-1 min-w-0 pt-0.5">
                            <div className="flex items-baseline gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-slate-700">
                                {ic.tipo}
                              </span>
                              <span className="text-xs text-slate-400">via {ic.canal}</span>
                              <span className="text-xs text-slate-300 ml-auto">
                                {formatDateTime(ic.criado_em)}
                              </span>
                            </div>

                            {ic.descricao && (
                              <p className="mt-1 text-sm text-slate-600">{ic.descricao}</p>
                            )}

                            {ic.proximo_passo && (
                              <div className="mt-2 rounded-md bg-blue-50 border border-blue-100 px-3 py-2">
                                <p className="text-xs font-semibold text-blue-700 mb-0.5">
                                  Próximo passo
                                </p>
                                <p className="text-xs text-blue-600">{ic.proximo_passo}</p>
                                {ic.data_proximo_passo && (
                                  <div className="flex items-center gap-1 mt-1 text-xs text-blue-400">
                                    <Clock className="h-3 w-3" />
                                    até {formatDate(ic.data_proximo_passo)}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </>
  );
}
