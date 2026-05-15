"use client";

import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchCnpj, calculateScore, calculateScoreBreakdown } from "@/lib/brasilapi";
import type { BrasilApiCnpjResponse, ScoreCriterion } from "@/lib/brasilapi";
import {
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { addLead, getExistingCnpjs } from "@/app/(protected)/leads/actions";

// ── constants ────────────────────────────────────────────────────────────────

const UF_LIST = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

const PORTE_OPTIONS = [
  { value: "ME", label: "ME" },
  { value: "EPP", label: "EPP" },
  { value: "DEMAIS", label: "Demais" },
];

const PAGE_SIZE = 20;
const FETCH_DELAY_MS = 300;

// ── helpers ──────────────────────────────────────────────────────────────────

function parseCnpjs(text: string): string[] {
  const matches = text.match(/\d[\d.\-\/\s]{11,17}\d/g) ?? [];
  const digits = matches
    .map((m) => m.replace(/\D/g, ""))
    .filter((d) => d.length === 14);
  const seen = new Set<string>();
  return digits.filter((d) => (seen.has(d) ? false : (seen.add(d), true)));
}

function formatCnpj(digits: string): string {
  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

function formatDate(s: string): string {
  if (!s) return "—";
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}

function scoreColors(score: number) {
  if (score >= 80) return { badge: "bg-green-100 text-green-800", row: "border-l-green-400" };
  if (score >= 60) return { badge: "bg-yellow-100 text-yellow-800", row: "border-l-yellow-400" };
  if (score >= 40) return { badge: "bg-orange-100 text-orange-800", row: "border-l-orange-400" };
  return { badge: "bg-red-100 text-red-800", row: "border-l-red-400" };
}

interface Filters {
  uf: string;
  municipio: string;
  cnae: string;
  portes: string[];
  abertaApos: string;
  abertaAntes: string;
}

function passesFilters(data: BrasilApiCnpjResponse, f: Filters): boolean {
  if (f.uf && data.uf !== f.uf) return false;
  if (f.municipio && !data.municipio?.toLowerCase().includes(f.municipio.toLowerCase())) return false;
  if (f.cnae) {
    const q = f.cnae.toLowerCase();
    if (!String(data.cnae_fiscal).includes(q) && !data.cnae_fiscal_descricao?.toLowerCase().includes(q))
      return false;
  }
  if (f.portes.length > 0 && !f.portes.includes(data.porte)) return false;
  if (f.abertaApos && data.data_abertura && data.data_abertura < f.abertaApos) return false;
  if (f.abertaAntes && data.data_abertura && data.data_abertura > f.abertaAntes) return false;
  return true;
}

// ── types ─────────────────────────────────────────────────────────────────────

interface ResultItem {
  cnpj: string;
  data?: BrasilApiCnpjResponse;
  score: number;
  breakdown: ScoreCriterion[];
  added: boolean;
  failed?: boolean;
}

interface Progress {
  current: number;
  total: number;
  found: number;
  filtered: number;
  errors: number;
}

// ── component ─────────────────────────────────────────────────────────────────

export function BatchSearch() {
  const [uf, setUf] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [cnae, setCnae] = useState("");
  const [portes, setPortes] = useState<string[]>([]);
  const [abertaApos, setAbertaApos] = useState("");
  const [abertaAntes, setAbertaAntes] = useState("");
  const [cnpjText, setCnpjText] = useState("");

  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState<Progress>({ current: 0, total: 0, found: 0, filtered: 0, errors: 0 });
  const [results, setResults] = useState<ResultItem[]>([]);
  const [page, setPage] = useState(1);
  const [formError, setFormError] = useState<string | null>(null);
  const [addingCnpj, setAddingCnpj] = useState<string | null>(null);

  const cancelRef = useRef(false);

  const togglePorte = (p: string) =>
    setPortes((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));

  const handleSearch = async () => {
    const cnpjs = parseCnpjs(cnpjText);
    if (cnpjs.length === 0 && !uf) { setFormError("Selecione a UF ou cole ao menos um CNPJ na lista."); return; }
    if (cnpjs.length === 0) { setFormError("Nenhum CNPJ válido detectado na lista."); return; }

    setFormError(null);
    setResults([]);
    setPage(1);
    setDone(false);
    setRunning(true);
    cancelRef.current = false;

    const filters: Filters = { uf, municipio, cnae, portes, abertaApos, abertaAntes };
    const prog: Progress = { current: 0, total: cnpjs.length, found: 0, filtered: 0, errors: 0 };
    setProgress({ ...prog });

    // Check which CNPJs already exist in leads
    const existingArray = await getExistingCnpjs(cnpjs);
    const existingSet = new Set(existingArray);

    for (let i = 0; i < cnpjs.length; i++) {
      if (cancelRef.current) break;

      const cnpjDigit = cnpjs[i];
      try {
        const data = await fetchCnpj(cnpjDigit);
        if (!passesFilters(data, filters)) {
          prog.filtered++;
          continue;
        }
        const breakdown = calculateScoreBreakdown(data);
        const score = calculateScore(data);
        setResults((prev) => [
          ...prev,
          { cnpj: cnpjDigit, data, score, breakdown, added: existingSet.has(cnpjDigit) },
        ]);
        prog.found++;
      } catch {
        prog.errors++;
        setResults((prev) => [
          ...prev,
          { cnpj: cnpjDigit, failed: true, score: 0, breakdown: [], added: false },
        ]);
      }

      prog.current = i + 1;
      setProgress({ ...prog });

      if (i < cnpjs.length - 1) {
        await new Promise((r) => setTimeout(r, FETCH_DELAY_MS));
      }
    }

    setRunning(false);
    setDone(true);
  };

  const handleCancel = () => { cancelRef.current = true; };

  const handleAdd = async (item: ResultItem) => {
    if (!item.data) return;
    setAddingCnpj(item.data.cnpj);
    const result = await addLead(item.data);
    if (!result.error) {
      setResults((prev) =>
        prev.map((r) => (r.cnpj === item.cnpj ? { ...r, added: true } : r))
      );
    }
    setAddingCnpj(null);
  };

  const displayed = results.slice(0, page * PAGE_SIZE);
  const hasMore = displayed.length < results.length;
  const detectedCount = parseCnpjs(cnpjText).length;

  return (
    <TooltipProvider delayDuration={200}>
    <div className="space-y-5">
      {/* Filter form */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Filtros</p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="b-uf" className="mb-1.5 block">
              UF {detectedCount === 0 && <span className="text-red-500">*</span>}
            </Label>
            <select
              id="b-uf"
              value={uf}
              onChange={(e) => setUf(e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">Selecione...</option>
              {UF_LIST.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="b-municipio" className="mb-1.5 block">Município</Label>
            <Input
              id="b-municipio"
              placeholder="Ex: Vitória"
              value={municipio}
              onChange={(e) => setMunicipio(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="b-cnae" className="mb-1.5 block">CNAE (código ou descrição)</Label>
            <Input
              id="b-cnae"
              placeholder="Ex: 6920 ou contabilidade"
              value={cnae}
              onChange={(e) => setCnae(e.target.value)}
            />
          </div>

          <div>
            <Label className="mb-1.5 block">Porte</Label>
            <div className="flex gap-5 h-10 items-center">
              {PORTE_OPTIONS.map((p) => (
                <label key={p.value} className="flex items-center gap-1.5 text-sm cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={portes.includes(p.value)}
                    onChange={() => togglePorte(p.value)}
                  />
                  {p.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="b-apos" className="mb-1.5 block">Aberta após</Label>
            <Input
              id="b-apos"
              type="date"
              value={abertaApos}
              onChange={(e) => setAbertaApos(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="b-antes" className="mb-1.5 block">Aberta antes</Label>
            <Input
              id="b-antes"
              type="date"
              value={abertaAntes}
              onChange={(e) => setAbertaAntes(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* CNPJ list textarea */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
        <Label htmlFor="b-cnpjs" className="block">
          Lista de CNPJs{" "}
          <span className="text-slate-400 font-normal">(um por linha, vírgula ou espaço)</span>
        </Label>
        <textarea
          id="b-cnpjs"
          rows={7}
          value={cnpjText}
          onChange={(e) => setCnpjText(e.target.value)}
          placeholder={"12.345.678/0001-90\n98.765.432/0001-10\n11.222.333/0001-44"}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
        />
        {detectedCount > 0 && (
          <p className="text-xs text-slate-500">{detectedCount} CNPJ(s) detectado(s)</p>
        )}
      </div>

      {/* Form error */}
      {formError && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m9.303 3.376c.866 1.5-.217 3.374-1.948 3.374H2.645c-1.73 0-2.813-1.874-1.948-3.374L10.051 3.378c.866-1.5 3.032-1.5 3.898 0l8.354 12.748zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          {formError}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <Button onClick={handleSearch} disabled={running} className="gap-2">
          {running ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Processando...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              Buscar e filtrar
            </>
          )}
        </Button>
        {running && (
          <Button variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
        )}
      </div>

      {/* Progress bar */}
      {(running || done) && progress.total > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-700 font-medium">
              {running
                ? `Consultando ${progress.current} de ${progress.total}...`
                : `Concluído — ${progress.total} CNPJ(s) processado(s)`}
            </span>
            <div className="flex gap-4 text-xs">
              <span className="text-green-700 font-medium">✓ {progress.found} passaram nos filtros</span>
              <span className="text-slate-500">↷ {progress.filtered} filtrado(s)</span>
              {progress.errors > 0 && (
                <span className="text-red-600">✗ {progress.errors} erro(s)</span>
              )}
            </div>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                done ? "bg-green-500" : "bg-primary"
              )}
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Results table */}
      {results.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">
              Exibindo {displayed.length} de {results.length} resultado(s)
            </span>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm bg-green-400 inline-block" /> Score 80+
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm bg-yellow-400 inline-block" /> 60–79
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm bg-orange-400 inline-block" /> 40–59
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm bg-red-400 inline-block" /> &lt;40
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Razão Social</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Situação</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Município/UF</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">CNAE</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Porte</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Abertura</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Score</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {displayed.map((item) => {
                  if (item.failed) {
                    return (
                      <tr
                        key={item.cnpj}
                        className="border-l-4 border-l-red-400 bg-red-50/40"
                      >
                        <td className="px-4 py-3" colSpan={6}>
                          <p className="font-medium text-red-600 leading-tight">
                            Não encontrado
                          </p>
                          <p className="text-xs text-red-400 mt-0.5 font-mono">
                            {formatCnpj(item.cnpj)}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs">—</td>
                        <td className="px-4 py-3" />
                      </tr>
                    );
                  }

                  const colors = scoreColors(item.score);
                  return (
                    <tr
                      key={item.cnpj}
                      className={cn(
                        "border-l-4 hover:bg-slate-50 transition-colors",
                        colors.row
                      )}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800 leading-tight">{item.data!.razao_social}</p>
                        {item.data!.nome_fantasia && (
                          <p className="text-xs text-slate-400 mt-0.5">{item.data!.nome_fantasia}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={cn(
                          "text-xs font-semibold px-2 py-0.5 rounded-full",
                          item.data!.situacao_cadastral === "ATIVA"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        )}>
                          {item.data!.situacao_cadastral || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {item.data!.municipio}/{item.data!.uf}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                          {item.data!.cnae_fiscal}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {item.data!.descricao_porte || item.data!.porte}
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {formatDate(item.data!.data_abertura)}
                      </td>
                      <td className="px-4 py-3">
                        <TooltipRoot>
                          <TooltipTrigger asChild>
                            <span
                              className={cn(
                                "inline-block px-2 py-0.5 rounded-full text-xs font-bold tabular-nums cursor-default",
                                colors.badge
                              )}
                            >
                              {item.score}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="left">
                            <p className="font-semibold mb-1.5 text-slate-800">
                              Score: {item.score} pontos
                            </p>
                            <ul className="space-y-1">
                              {item.breakdown.map((c) => (
                                <li
                                  key={c.label}
                                  className={cn(
                                    "flex items-center gap-2",
                                    c.achieved ? "text-slate-700" : "text-slate-400"
                                  )}
                                >
                                  <span className="w-3 text-center shrink-0">
                                    {c.achieved ? "✓" : "✗"}
                                  </span>
                                  <span className="flex-1">{c.label}</span>
                                  <span className="tabular-nums font-medium ml-2">
                                    {c.achieved ? `+${c.points}` : "+0"}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </TooltipContent>
                        </TooltipRoot>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {item.added ? (
                          <span className="text-xs text-slate-400 font-medium">Já adicionado</span>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={addingCnpj === item.data!.cnpj}
                            onClick={() => handleAdd(item)}
                            className="h-7 px-3 text-xs"
                          >
                            {addingCnpj === item.data!.cnpj ? "Adicionando..." : "Adicionar"}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {hasMore && (
            <div className="px-5 py-4 border-t border-slate-100 text-center">
              <Button variant="outline" onClick={() => setPage((p) => p + 1)}>
                Carregar mais ({results.length - displayed.length} restantes)
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Empty state after search */}
      {done && results.length === 0 && (
        <div className="py-14 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <p className="font-semibold text-slate-700">Nenhum resultado encontrado</p>
          <p className="text-sm text-slate-500 mt-1">
            Nenhum dos CNPJs informados passou pelos filtros definidos.
          </p>
        </div>
      )}
    </div>
    </TooltipProvider>
  );
}
