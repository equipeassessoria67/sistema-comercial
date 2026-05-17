import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { FunnelChart } from "@/components/dashboard/funnel-chart";
import { ScoreChart } from "@/components/dashboard/score-chart";

// ── constants ─────────────────────────────────────────────────────────────────

const ETAPAS = [
  { id: "novo",               label: "Novo Lead"          },
  { id: "qualificacao",       label: "Em Qualificação"    },
  { id: "contato_feito",      label: "Contato Feito"      },
  { id: "aguardando_retorno", label: "Aguardando Retorno" },
  { id: "proposta_enviada",   label: "Proposta Enviada"   },
  { id: "cliente",            label: "Cliente"            },
  { id: "descartado",         label: "Descartado"         },
] as const;

const ETAPA_LABEL: Record<string, string> = Object.fromEntries(
  ETAPAS.map((e) => [e.id, e.label])
);

// ── helpers ───────────────────────────────────────────────────────────────────

function formatDate(s: string | null): string {
  if (!s) return "—";
  const [y, m, d] = s.split("T")[0].split("-");
  return `${d}/${m}/${y}`;
}

function isPast(dateStr: string): boolean {
  return new Date(dateStr) < new Date();
}

// ── sub-components ────────────────────────────────────────────────────────────

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function EmptyRow({ cols, message }: { cols: number; message: string }) {
  return (
    <tr>
      <td
        colSpan={cols}
        className="px-4 py-10 text-center text-sm text-slate-400"
      >
        {message}
      </td>
    </tr>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = await createClient();

  const [{ data: leads }, { data: interacoes }] = await Promise.all([
    supabase
      .from("leads")
      .select("id, score, etapa_kanban, razao_social"),
    supabase
      .from("interacoes")
      .select("id, lead_id, canal, tipo, proximo_passo, data_proximo_passo, criado_em")
      .order("criado_em", { ascending: false }),
  ]);

  const leadsArr = leads ?? [];
  const interacoesArr = interacoes ?? [];

  // ── summary cards ─────────────────────────────────────────────────────────

  const totalLeads = leadsArr.length;
  const leadsQuentes = leadsArr.filter((l) => l.score >= 80).length;
  const emNegociacao = leadsArr.filter((l) =>
    ["contato_feito", "aguardando_retorno", "proposta_enviada"].includes(l.etapa_kanban)
  ).length;
  const convertidos = leadsArr.filter((l) => l.etapa_kanban === "cliente").length;

  const summaryCards = [
    {
      label: "Total de Leads",
      value: totalLeads,
      accent: "bg-blue-50 text-blue-600",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
        </svg>
      ),
    },
    {
      label: "Leads Quentes",
      value: leadsQuentes,
      accent: "bg-green-50 text-green-600",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" />
        </svg>
      ),
    },
    {
      label: "Em Negociação",
      value: emNegociacao,
      accent: "bg-amber-50 text-amber-600",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
        </svg>
      ),
    },
    {
      label: "Convertidos",
      value: convertidos,
      accent: "bg-purple-50 text-purple-600",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
        </svg>
      ),
    },
  ];

  // ── funnel data ───────────────────────────────────────────────────────────

  const funnelData = ETAPAS.map((e) => ({
    name: e.label,
    value: leadsArr.filter((l) => l.etapa_kanban === e.id).length,
  }));

  // ── score distribution ────────────────────────────────────────────────────

  const scoreData = [
    { name: "Quentes (80–100)", value: leadsArr.filter((l) => l.score >= 80).length,                       color: "#22c55e" },
    { name: "Mornos (60–79)",   value: leadsArr.filter((l) => l.score >= 60 && l.score < 80).length,       color: "#eab308" },
    { name: "Frios (40–59)",    value: leadsArr.filter((l) => l.score >= 40 && l.score < 60).length,       color: "#f97316" },
    { name: "Baixo (0–39)",     value: leadsArr.filter((l) => l.score < 40).length,                        color: "#ef4444" },
  ];

  // ── follow-ups ────────────────────────────────────────────────────────────

  const leadMap = new Map(leadsArr.map((l) => [l.id, l]));

  // Most recent interaction per lead that has data_proximo_passo set
  const followUpMap = new Map<string, (typeof interacoesArr)[number]>();
  for (const ic of interacoesArr) {
    if (ic.data_proximo_passo && !followUpMap.has(ic.lead_id)) {
      followUpMap.set(ic.lead_id, ic);
    }
  }

  const followUps = Array.from(followUpMap.values())
    .sort((a, b) =>
      a.data_proximo_passo!.localeCompare(b.data_proximo_passo!)
    )
    .slice(0, 10)
    .map((ic) => ({
      lead_id: ic.lead_id,
      razao_social: leadMap.get(ic.lead_id)?.razao_social ?? "—",
      etapa_kanban: leadMap.get(ic.lead_id)?.etapa_kanban ?? "",
      data_proximo_passo: ic.data_proximo_passo!,
      proximo_passo: ic.proximo_passo ?? null,
    }));

  // ── últimas interações ────────────────────────────────────────────────────

  const ultimasInteracoes = interacoesArr.slice(0, 5).map((ic) => ({
    id: ic.id,
    razao_social: leadMap.get(ic.lead_id)?.razao_social ?? "—",
    canal: ic.canal ?? "—",
    tipo: ic.tipo ?? "—",
    criado_em: ic.criado_em,
  }));

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>

      {/* ── Summary cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex items-center gap-4"
          >
            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", card.accent)}>
              {card.icon}
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800 leading-none">{card.value}</p>
              <p className="text-xs text-slate-500 mt-1">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Charts ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <SectionCard title="Funil de Leads">
            <div className="px-4 py-4">
              <FunnelChart data={funnelData} />
            </div>
          </SectionCard>
        </div>

        <div className="lg:col-span-2">
          <SectionCard title="Distribuição por Score">
            <div className="px-4 py-4">
              <ScoreChart data={scoreData} />
            </div>
          </SectionCard>
        </div>
      </div>

      {/* ── Tables ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Próximos follow-ups */}
        <SectionCard title="Próximos Follow-ups">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Razão Social</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Etapa</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Próximo Passo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {followUps.length === 0 ? (
                  <EmptyRow cols={4} message="Nenhum follow-up agendado" />
                ) : (
                  followUps.map((fu) => (
                    <tr key={fu.lead_id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-800 max-w-[160px] truncate">
                        {fu.razao_social}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                          {ETAPA_LABEL[fu.etapa_kanban] ?? fu.etapa_kanban}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs max-w-[160px] truncate">
                        {fu.proximo_passo ?? "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={cn(
                            "text-xs font-medium",
                            isPast(fu.data_proximo_passo)
                              ? "text-red-600"
                              : "text-slate-700"
                          )}
                        >
                          {formatDate(fu.data_proximo_passo)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>

        {/* Últimas interações */}
        <SectionCard title="Últimas Interações">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Empresa</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Canal</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Tipo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {ultimasInteracoes.length === 0 ? (
                  <EmptyRow cols={4} message="Nenhuma interação registrada" />
                ) : (
                  ultimasInteracoes.map((ic) => (
                    <tr key={ic.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-800 max-w-[160px] truncate">
                        {ic.razao_social}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                          {ic.canal}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap text-xs">
                        {ic.tipo}
                      </td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">
                        {formatDate(ic.criado_em)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>

      </div>
    </div>
  );
}
