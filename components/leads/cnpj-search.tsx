"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { fetchCnpj, type BrasilApiCnpjResponse } from "@/lib/brasilapi";
import { addLead } from "@/app/(protected)/leads/actions";

// ── formatters ──────────────────────────────────────────────────────────────

function applyMaskCnpj(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function formatCnpjDisplay(cnpj: string): string {
  const d = cnpj.replace(/\D/g, "");
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

function formatDate(s: string): string {
  if (!s) return "—";
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}

function formatCep(s: string): string {
  const d = s.replace(/\D/g, "");
  return d.replace(/^(\d{5})(\d{3})$/, "$1-$2");
}

function formatPhone(s: string): string {
  if (!s) return "—";
  const d = s.replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return s;
}

// ── sub-components ───────────────────────────────────────────────────────────

function InfoField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
        {label}
      </p>
      <p className="text-sm text-slate-800">{value || "—"}</p>
    </div>
  );
}

function Divider() {
  return <hr className="border-slate-100" />;
}

function AlertBox({
  variant,
  children,
}: {
  variant: "error" | "success";
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 p-4 rounded-lg border text-sm",
        variant === "error"
          ? "bg-red-50 border-red-200 text-red-700"
          : "bg-green-50 border-green-200 text-green-700"
      )}
    >
      {variant === "error" ? (
        <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      ) : (
        <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )}
      <span>{children}</span>
    </div>
  );
}

// ── main component ───────────────────────────────────────────────────────────

export function CnpjSearch() {
  const [cnpj, setCnpj] = useState("");
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [data, setData] = useState<BrasilApiCnpjResponse | null>(null);

  const isAtiva = data?.situacao_cadastral === "ATIVA";

  const handleSearch = async () => {
    const digits = cnpj.replace(/\D/g, "");
    if (digits.length !== 14) {
      setError("Digite um CNPJ completo com 14 dígitos.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    setData(null);

    try {
      const result = await fetchCnpj(digits);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao buscar CNPJ.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddLead = async () => {
    if (!data) return;
    setAdding(true);
    setError(null);

    try {
      const result = await addLead(data);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(result.message ?? "Lead adicionado com sucesso!");
        setCnpj("");
        setData(null);
      }
    } catch {
      setError("Erro inesperado ao adicionar lead.");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="max-w-2xl">
      {/* Search bar */}
      <div className="flex gap-3 mb-6">
        <div className="flex-1">
          <Label htmlFor="cnpj-input" className="mb-1.5 block">
            CNPJ
          </Label>
          <Input
            id="cnpj-input"
            placeholder="00.000.000/0000-00"
            value={cnpj}
            onChange={(e) => setCnpj(applyMaskCnpj(e.target.value))}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            maxLength={18}
          />
        </div>
        <div className="flex items-end">
          <Button onClick={handleSearch} disabled={loading} className="gap-2">
            {loading ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            )}
            Buscar
          </Button>
        </div>
      </div>

      {/* Feedback messages */}
      {error && <div className="mb-5"><AlertBox variant="error">{error}</AlertBox></div>}
      {success && <div className="mb-5"><AlertBox variant="success">{success}</AlertBox></div>}

      {/* Result card */}
      {data && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          {/* Card header — nome + situação */}
          <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-slate-900 leading-tight">
                {data.razao_social}
              </h2>
              {data.nome_fantasia && (
                <p className="text-sm text-slate-500 mt-0.5">{data.nome_fantasia}</p>
              )}
            </div>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 mt-0.5",
                isAtiva
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              )}
            >
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  isAtiva ? "bg-green-500" : "bg-red-500"
                )}
              />
              {data.descricao_situacao_cadastral || data.situacao_cadastral}
            </span>
          </div>

          {/* Alerta de situação inativa */}
          {!isAtiva && (
            <div className="mx-6 mt-4">
              <AlertBox variant="error">
                Esta empresa não está com situação ATIVA e não pode ser adicionada como lead.
              </AlertBox>
            </div>
          )}

          <div className="px-6 py-5 space-y-5">
            {/* Dados básicos */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              <InfoField label="CNPJ" value={formatCnpjDisplay(data.cnpj)} />
              <InfoField label="Data de Abertura" value={formatDate(data.data_abertura)} />
              <InfoField label="Porte" value={data.descricao_porte || data.porte} />
              <InfoField label="Natureza Jurídica" value={data.natureza_juridica} />
            </div>

            <Divider />

            {/* CNAE */}
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                CNAE Principal
              </p>
              <p className="text-sm text-slate-800">
                <span className="font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-xs mr-2">
                  {data.cnae_fiscal}
                </span>
                {data.cnae_fiscal_descricao}
              </p>
            </div>

            <Divider />

            {/* Endereço */}
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Endereço
              </p>
              <p className="text-sm text-slate-800">
                {[data.descricao_tipo_de_logradouro, data.logradouro, data.numero, data.complemento]
                  .filter(Boolean)
                  .join(" ")}
              </p>
              <p className="text-sm text-slate-600 mt-0.5">
                {[data.bairro, `${data.municipio}/${data.uf}`, `CEP ${formatCep(data.cep)}`]
                  .filter(Boolean)
                  .join(" — ")}
              </p>
            </div>

            <Divider />

            {/* Contato */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              <InfoField label="Telefone" value={formatPhone(data.ddd_telefone_1)} />
              <InfoField label="E-mail" value={data.email || "—"} />
            </div>

            {/* QSA */}
            {data.qsa && data.qsa.length > 0 && (
              <>
                <Divider />
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Quadro Societário
                  </p>
                  <div className="space-y-2">
                    {data.qsa.map((socio, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg"
                      >
                        <span className="text-sm font-medium text-slate-800">{socio.nome}</span>
                        <span className="text-xs text-slate-500">{socio.qualificacao_socio}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer — ação */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
            <Button onClick={handleAddLead} disabled={!isAtiva || adding} className="gap-2">
              {adding ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              )}
              Adicionar como Lead
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
