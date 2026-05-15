"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { CnpjSearch } from "@/components/leads/cnpj-search";
import { BatchSearch } from "@/components/leads/batch-search";

type Tab = "cnpj" | "lote";

const tabs: { id: Tab; label: string }[] = [
  { id: "cnpj", label: "Busca por CNPJ" },
  { id: "lote", label: "Busca em Lote" },
];

export default function LeadsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("cnpj");

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Captação de Leads</h1>

      {/* Tab bar */}
      <div className="border-b border-slate-200 mb-7">
        <nav className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors",
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === "cnpj" ? <CnpjSearch /> : <BatchSearch />}
    </div>
  );
}
