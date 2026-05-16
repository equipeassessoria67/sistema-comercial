"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ScoreCriterio = {
  id: string;
  nome: string;
  descricao: string;
  pontuacao: number;
  ativo: boolean;
  ordem: number;
  criado_em: string;
};

type Editavel = {
  id: string;
  nome: string;
  descricao: string;
  pontuacao: number;
  ativo: boolean;
  ordem: number;
};

const PADROES: Omit<Editavel, "id">[] = [
  { nome: "Tem e-mail cadastrado",      descricao: "Lead possui endereço de e-mail registrado",       pontuacao: 20, ativo: true, ordem: 1 },
  { nome: "Tem telefone cadastrado",    descricao: "Lead possui número de telefone registrado",        pontuacao: 15, ativo: true, ordem: 2 },
  { nome: "Porte ME ou EPP",            descricao: "Empresa enquadrada como ME ou EPP",                pontuacao: 20, ativo: true, ordem: 3 },
  { nome: "Empresa de 2 a 10 anos",     descricao: "Empresa com tempo de abertura entre 2 e 10 anos", pontuacao: 20, ativo: true, ordem: 4 },
  { nome: "Empresa com mais de 10 anos",descricao: "Empresa com mais de 10 anos de atividade",         pontuacao: 10, ativo: true, ordem: 5 },
  { nome: "Tem nome fantasia",          descricao: "Empresa possui nome fantasia cadastrado",          pontuacao: 10, ativo: true, ordem: 6 },
  { nome: "Tem sócios cadastrados",     descricao: "Empresa possui quadro societário registrado",      pontuacao: 15, ativo: true, ordem: 7 },
];

export function ScoreCriterios({ initialCriterios }: { initialCriterios: ScoreCriterio[] }) {
  const [criterios, setCriterios] = useState<Editavel[]>(
    initialCriterios.map(({ id, nome, descricao, pontuacao, ativo, ordem }) => ({
      id, nome, descricao, pontuacao, ativo, ordem,
    }))
  );
  const [saving, setSaving] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: "sucesso" | "erro"; msg: string } | null>(null);

  const totalAtivos = criterios
    .filter((c) => c.ativo)
    .reduce((acc, c) => acc + c.pontuacao, 0);

  function update(id: string, field: keyof Editavel, value: string | number | boolean) {
    setCriterios((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  }

  function exibirFeedback(tipo: "sucesso" | "erro", msg: string) {
    setFeedback({ tipo, msg });
    if (tipo === "sucesso") setTimeout(() => setFeedback(null), 3000);
  }

  async function handleSalvar() {
    setSaving(true);
    setFeedback(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("score_criterios")
      .upsert(criterios, { onConflict: "id" });
    setSaving(false);
    error
      ? exibirFeedback("erro", "Erro ao salvar. Tente novamente.")
      : exibirFeedback("sucesso", "Alterações salvas com sucesso!");
  }

  async function handleRestaurar() {
    setRestoring(true);
    setFeedback(null);
    const restaurados = criterios.map((c) => {
      const padrao = PADROES.find((p) => p.ordem === c.ordem);
      return padrao ? { id: c.id, ...padrao } : c;
    });
    setCriterios(restaurados);
    const supabase = createClient();
    const { error } = await supabase
      .from("score_criterios")
      .upsert(restaurados, { onConflict: "id" });
    setRestoring(false);
    error
      ? exibirFeedback("erro", "Erro ao restaurar padrões.")
      : exibirFeedback("sucesso", "Padrões restaurados com sucesso!");
  }

  return (
    <div className="space-y-5">
      {/* Cabeçalho da seção */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Critérios de Score</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Defina quais atributos geram pontuação para cada lead
          </p>
        </div>

        <div
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border",
            totalAtivos > 100
              ? "bg-red-50 text-red-700 border-red-200"
              : "bg-slate-50 text-slate-600 border-slate-200"
          )}
        >
          <span>Total possível:</span>
          <span className="font-bold">{totalAtivos} pts</span>
          {totalAtivos > 100 && <span className="text-xs">⚠</span>}
        </div>
      </div>

      {/* Alerta de pontuação */}
      {totalAtivos > 100 && (
        <div className="rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          <strong>Atenção:</strong> A soma dos critérios ativos é{" "}
          <strong>{totalAtivos} pontos</strong>. Leads podem ultrapassar o score máximo de
          100 — considere ajustar as pontuações.
        </div>
      )}

      {/* Lista de critérios */}
      <div className="space-y-2">
        {criterios.map((c, index) => (
          <div
            key={c.id}
            className={cn(
              "rounded-lg border bg-white p-4 shadow-sm transition-opacity duration-150",
              !c.ativo && "opacity-50"
            )}
          >
            <div className="flex items-center gap-3">
              {/* Número de ordem */}
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500">
                {index + 1}
              </span>

              {/* Campos editáveis */}
              <div className="flex flex-1 flex-wrap items-end gap-3">
                <div className="min-w-[180px] flex-1 space-y-1">
                  <label className="text-xs font-medium text-slate-500">Nome</label>
                  <Input
                    value={c.nome}
                    onChange={(e) => update(c.id, "nome", e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>

                <div className="min-w-[200px] flex-[2] space-y-1">
                  <label className="text-xs font-medium text-slate-500">Descrição</label>
                  <Input
                    value={c.descricao}
                    onChange={(e) => update(c.id, "descricao", e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500">Pontuação</label>
                  <div className="relative">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={c.pontuacao}
                      onChange={(e) =>
                        update(
                          c.id,
                          "pontuacao",
                          Math.min(100, Math.max(0, Number(e.target.value)))
                        )
                      }
                      className="h-8 w-[72px] pr-7 text-right text-sm"
                    />
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                      pts
                    </span>
                  </div>
                </div>

                {/* Toggle ativo/inativo */}
                <button
                  type="button"
                  onClick={() => update(c.id, "ativo", !c.ativo)}
                  className={cn(
                    "h-8 rounded-md border px-3 text-xs font-medium transition-colors",
                    c.ativo
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100"
                  )}
                >
                  {c.ativo ? "Ativo" : "Inativo"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Feedback */}
      {feedback && (
        <div
          className={cn(
            "rounded-md border px-4 py-3 text-sm",
            feedback.tipo === "sucesso"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          )}
        >
          {feedback.msg}
        </div>
      )}

      {/* Ações */}
      <div className="flex items-center justify-between border-t pt-4">
        <Button
          variant="outline"
          onClick={handleRestaurar}
          disabled={restoring || saving}
        >
          {restoring ? "Restaurando..." : "Restaurar padrões"}
        </Button>

        <Button onClick={handleSalvar} disabled={saving || restoring}>
          {saving ? "Salvando..." : "Salvar alterações"}
        </Button>
      </div>
    </div>
  );
}
