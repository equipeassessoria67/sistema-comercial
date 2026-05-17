"use client";

import { useEffect, useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getLeads, type LeadRow } from "@/app/(protected)/leads/actions";

function formatCnpj(digits: string): string {
  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

function formatDate(s: string | null): string {
  if (!s) return "—";
  const [y, m, d] = s.split("T")[0].split("-");
  return `${d}/${m}/${y}`;
}

function scoreColors(score: number) {
  if (score >= 80) return { badge: "bg-green-100 text-green-800", bar: "border-l-green-400" };
  if (score >= 60) return { badge: "bg-yellow-100 text-yellow-800", bar: "border-l-yellow-400" };
  if (score >= 40) return { badge: "bg-orange-100 text-orange-800", bar: "border-l-orange-400" };
  return { badge: "bg-red-100 text-red-800", bar: "border-l-red-400" };
}

const ETAPA_LABELS: Record<string, string> = {
  novo: "Novo",
  contato: "Em contato",
  proposta: "Proposta",
  negociacao: "Negociação",
  fechado: "Fechado",
  perdido: "Perdido",
};

function escapeCsv(value: string | null | undefined): string {
  const s = value ?? "";
  return s.includes(";") || s.includes('"') || s.includes("\n")
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

function exportToCsv(rows: LeadRow[]) {
  const today = new Date().toISOString().slice(0, 10);
  const headers = [
    "Razão Social", "CNPJ", "Município", "UF", "CNAE", "Porte",
    "Situação", "Score", "Etapa", "Último Contato", "Próximo Passo",
  ];
  const lines = [
    headers.join(";"),
    ...rows.map((l) =>
      [
        escapeCsv(l.razao_social),
        formatCnpj(l.cnpj),
        escapeCsv(l.municipio),
        l.uf,
        escapeCsv(`${l.cnae_codigo} - ${l.cnae_descricao}`),
        l.porte,
        l.situacao,
        l.score,
        ETAPA_LABELS[l.etapa_kanban] ?? l.etapa_kanban,
        l.ultimo_contato ? formatDate(l.ultimo_contato) : "",
        escapeCsv(l.proximo_passo),
      ].join(";")
    ),
  ];

  const blob = new Blob(["﻿" + lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `leads-exportados-${today}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function AllLeads() {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    getLeads()
      .then(({ data, error }) => {
        if (error) setError(error);
        else setLeads(data ?? []);
      })
      .catch((err) => {
        console.error("[AllLeads] exception calling getLeads:", err);
        setError(String(err?.message ?? err));
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return leads;
    const cnpjDigits = q.replace(/\D/g, "");
    return leads.filter(
      (l) =>
        l.razao_social.toLowerCase().includes(q) ||
        (l.nome_fantasia ?? "").toLowerCase().includes(q) ||
        (cnpjDigits.length > 0 && l.cnpj.includes(cnpjDigits)) ||
        l.municipio.toLowerCase().includes(q) ||
        l.uf.toLowerCase().includes(q) ||
        l.cnae_descricao.toLowerCase().includes(q)
    );
  }, [leads, search]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <svg className="w-5 h-5 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        Carregando leads...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <Input
          placeholder="Filtrar por nome, CNPJ, município, CNAE..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-sm text-slate-500">
            {filtered.length} {filtered.length === 1 ? "lead" : "leads"}
            {search && leads.length !== filtered.length && ` de ${leads.length}`}
          </span>
          {filtered.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportToCsv(filtered)}
              className="gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Exportar CSV
            </Button>
          )}
        </div>
      </div>

      {leads.length === 0 ? (
        <div className="py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
          </div>
          <p className="font-semibold text-slate-700">Nenhum lead cadastrado</p>
          <p className="text-sm text-slate-500 mt-1">
            Use as abas ao lado para buscar e adicionar leads.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-slate-500 text-sm">
          Nenhum lead corresponde ao filtro.
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Razão Social</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">CNPJ</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Situação</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Município/UF</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">CNAE</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Abertura</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Score</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Etapa</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Último Contato</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((lead) => {
                  const colors = scoreColors(lead.score);
                  return (
                    <tr
                      key={lead.id}
                      className={cn(
                        "border-l-4 hover:bg-slate-50 transition-colors",
                        colors.bar
                      )}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800 leading-tight">{lead.razao_social}</p>
                        {lead.nome_fantasia && (
                          <p className="text-xs text-slate-400 mt-0.5">{lead.nome_fantasia}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600 whitespace-nowrap">
                        {formatCnpj(lead.cnpj)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={cn(
                            "text-xs font-semibold px-2 py-0.5 rounded-full",
                            lead.situacao === "ATIVA"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          )}
                        >
                          {lead.situacao}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {lead.municipio}/{lead.uf}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                          {lead.cnae_codigo}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {formatDate(lead.data_abertura)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-block px-2 py-0.5 rounded-full text-xs font-bold tabular-nums",
                            colors.badge
                          )}
                        >
                          {lead.score}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap text-xs">
                        {ETAPA_LABELS[lead.etapa_kanban] ?? lead.etapa_kanban}
                      </td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">
                        {lead.ultimo_contato ? formatDate(lead.ultimo_contato) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
