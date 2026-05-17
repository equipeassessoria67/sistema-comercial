"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const COLORS: Record<string, string> = {
  "Novo Lead":           "#94a3b8",
  "Em Qualificação":     "#60a5fa",
  "Contato Feito":       "#818cf8",
  "Aguardando Retorno":  "#fbbf24",
  "Proposta Enviada":    "#fb923c",
  "Cliente":             "#4ade80",
  "Descartado":          "#f87171",
};

interface Props {
  data: { name: string; value: number }[];
}

export function FunnelChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 24, bottom: 4, left: 8 }}
      >
        <XAxis
          type="number"
          allowDecimals={false}
          tick={{ fontSize: 12, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={148}
          tick={{ fontSize: 12, fill: "#475569" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: "#f1f5f9" }}
          formatter={(v) => [v ?? 0, "leads"]}
          contentStyle={{ fontSize: 13, borderRadius: 8, border: "1px solid #e2e8f0" }}
        />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={28}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={COLORS[entry.name] ?? "#94a3b8"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
