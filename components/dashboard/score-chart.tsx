"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface Segment {
  name: string;
  value: number;
  color: string;
}

interface Props {
  data: Segment[];
}

export function ScoreChart({ data }: Props) {
  const active = data.filter((d) => d.value > 0);

  if (active.length === 0) {
    return (
      <div className="flex items-center justify-center h-[280px] text-slate-400 text-sm">
        Sem leads cadastrados
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={active}
          cx="50%"
          cy="44%"
          innerRadius={64}
          outerRadius={96}
          paddingAngle={3}
          dataKey="value"
          stroke="none"
        >
          {active.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(v, name) => [v ?? 0, name]}
          contentStyle={{ fontSize: 13, borderRadius: 8, border: "1px solid #e2e8f0" }}
        />
        <Legend
          iconType="circle"
          iconSize={9}
          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
