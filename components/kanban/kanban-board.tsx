"use client";

import { useState, useCallback, useMemo } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { Users, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { scoreBadgeClass } from "@/components/ui/badge";
import { LeadSheet } from "@/components/kanban/lead-sheet";
import { updateEtapaKanban } from "@/app/(protected)/kanban/actions";

export type KanbanSocio = {
  nome: string;
  qualificacao_socio: string;
  cnpj_cpf_do_socio: string;
  data_entrada_sociedade: string;
};

export type KanbanLead = {
  id: string;
  cnpj: string;
  razao_social: string;
  nome_fantasia: string | null;
  situacao: string | null;
  data_abertura: string | null;
  cnae_codigo: string;
  cnae_descricao: string;
  porte: string | null;
  natureza_juridica: string | null;
  logradouro: string | null;
  municipio: string;
  uf: string;
  cep: string | null;
  telefone: string | null;
  email: string | null;
  socios: KanbanSocio[];
  score: number;
  etapa_kanban: string;
  ultimo_contato: string | null;
};

const COLUNAS = [
  { id: "novo",               label: "Novo Lead",          topColor: "border-t-slate-400"  },
  { id: "qualificacao",       label: "Em Qualificação",    topColor: "border-t-blue-500"   },
  { id: "contato_feito",      label: "Contato Feito",      topColor: "border-t-indigo-500" },
  { id: "aguardando_retorno", label: "Aguardando Retorno", topColor: "border-t-amber-500"  },
  { id: "proposta_enviada",   label: "Proposta Enviada",   topColor: "border-t-orange-500" },
  { id: "cliente",            label: "Cliente",            topColor: "border-t-green-500"  },
  { id: "descartado",         label: "Descartado",         topColor: "border-t-red-500"    },
] as const;

function formatDate(dateStr: string | null) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString("pt-BR");
}

function KanbanCard({
  lead,
  index,
  onClick,
}: {
  lead: KanbanLead;
  index: number;
  onClick: () => void;
}) {
  return (
    <Draggable draggableId={lead.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onClick}
          className={cn(
            "bg-white rounded-lg border border-slate-200 p-3 cursor-pointer select-none",
            "hover:border-slate-300 hover:shadow-sm transition-all",
            snapshot.isDragging && "shadow-lg rotate-1 border-primary/50 ring-1 ring-primary/30"
          )}
        >
          <p className="text-sm font-semibold text-slate-800 leading-tight line-clamp-2 mb-2">
            {lead.razao_social}
          </p>

          <p className="text-xs text-slate-500 mb-2.5">
            {lead.municipio} / {lead.uf}
          </p>

          <div className="flex items-center justify-between gap-2">
            <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border", scoreBadgeClass(lead.score))}>
              {lead.score} pts
            </span>

            {(lead.socios?.length ?? 0) > 0 && (
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <Users className="h-3 w-3" />
                {lead.socios.length}
              </span>
            )}
          </div>

          {lead.ultimo_contato && (
            <div className="flex items-center gap-1 mt-2 text-xs text-slate-400">
              <Clock className="h-3 w-3 shrink-0" />
              {formatDate(lead.ultimo_contato)}
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}

export function KanbanBoard({ leads: initialLeads }: { leads: KanbanLead[] }) {
  const [leads, setLeads] = useState<KanbanLead[]>(initialLeads);
  const [selectedLead, setSelectedLead] = useState<KanbanLead | null>(null);

  const leadsPerColuna = useMemo(() => {
    const map: Record<string, KanbanLead[]> = {};
    for (const col of COLUNAS) {
      map[col.id] = leads.filter((l) => l.etapa_kanban === col.id);
    }
    return map;
  }, [leads]);

  const handleDragEnd = useCallback(async (result: DropResult) => {
    const { draggableId, source, destination } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;

    const newEtapa = destination.droppableId;

    setLeads((prev) =>
      prev.map((l) => (l.id === draggableId ? { ...l, etapa_kanban: newEtapa } : l))
    );

    try {
      await updateEtapaKanban(draggableId, newEtapa);
    } catch {
      setLeads((prev) =>
        prev.map((l) =>
          l.id === draggableId ? { ...l, etapa_kanban: source.droppableId } : l
        )
      );
    }
  }, []);

  const handleEtapaChange = useCallback(
    (leadId: string, novaEtapa: string) => {
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, etapa_kanban: novaEtapa } : l))
      );
      setSelectedLead((prev) =>
        prev?.id === leadId ? { ...prev, etapa_kanban: novaEtapa } : prev
      );
    },
    []
  );

  return (
    <>
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="overflow-x-auto pb-4 -mx-4 px-4 sm:-mx-6 sm:px-6">
          <div className="flex gap-3 w-max">
            {COLUNAS.map((col) => {
              const colLeads = leadsPerColuna[col.id] ?? [];
              return (
                <div
                  key={col.id}
                  className={cn(
                    "flex flex-col rounded-lg bg-slate-100 border-t-4 w-60 shrink-0",
                    col.topColor
                  )}
                >
                  <div className="flex items-center justify-between px-3 py-2.5">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wide truncate">
                      {col.label}
                    </span>
                    <span className="ml-2 shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full bg-white text-xs font-bold text-slate-500 shadow-sm">
                      {colLeads.length}
                    </span>
                  </div>

                  <Droppable droppableId={col.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          "flex-1 flex flex-col gap-2 px-2 pb-2 min-h-[100px] rounded-b-lg transition-colors",
                          snapshot.isDraggingOver && "bg-slate-200/70"
                        )}
                      >
                        {colLeads.map((lead, index) => (
                          <KanbanCard
                            key={lead.id}
                            lead={lead}
                            index={index}
                            onClick={() => setSelectedLead(lead)}
                          />
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </div>
      </DragDropContext>

      <LeadSheet
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
        onEtapaChange={handleEtapaChange}
      />
    </>
  );
}
