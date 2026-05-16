import { createClient } from "@/lib/supabase/server";
import { ScoreCriterios } from "@/components/configuracoes/score-criterios";

export default async function ConfiguracoesPage() {
  const supabase = await createClient();
  const { data: criterios } = await supabase
    .from("score_criterios")
    .select("*")
    .order("ordem");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Configurações</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Gerencie os parâmetros do sistema comercial
        </p>
      </div>

      <ScoreCriterios initialCriterios={criterios ?? []} />
    </div>
  );
}
