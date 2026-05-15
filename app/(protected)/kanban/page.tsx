import { createClient } from "@/lib/supabase/server";
import { KanbanBoard } from "@/components/kanban/kanban-board";

export default async function KanbanPage() {
  const supabase = await createClient();

  const [{ data: leads }, { data: ultimosContatos }] = await Promise.all([
    supabase.from("leads").select("*").order("razao_social"),
    supabase
      .from("interacoes")
      .select("lead_id, criado_em")
      .order("criado_em", { ascending: false }),
  ]);

  const ultimoContatoMap = new Map<string, string>();
  for (const ic of ultimosContatos ?? []) {
    if (!ultimoContatoMap.has(ic.lead_id)) {
      ultimoContatoMap.set(ic.lead_id, ic.criado_em);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leadsComContato = (leads ?? []).map((l: any) => ({
    ...l,
    ultimo_contato: ultimoContatoMap.get(l.id) ?? null,
  }));

  return (
    <div>
      <div className="mb-5 flex items-baseline justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Kanban Comercial</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {leadsComContato.length}{" "}
            {leadsComContato.length === 1 ? "lead no funil" : "leads no funil"}
          </p>
        </div>
      </div>

      <KanbanBoard leads={leadsComContato} />
    </div>
  );
}
