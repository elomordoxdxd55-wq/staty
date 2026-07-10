import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";

export default function ComparisonPie({ myValue, compValue, label, myName = "Ja", compName = "Rywal" }) {
  const total = compValue > 0 ? compValue : 1;
  const pct = Math.min(Math.round((myValue / total) * 100), 100);
  const remaining = 100 - pct;

  const data = [
    { name: "Osiągnięte", value: pct },
    { name: "Brakuje", value: remaining },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-card border border-border rounded-2xl p-5 flex flex-col items-center"
    >
      <h3 className="text-sm font-semibold text-foreground mb-1">{label}</h3>
      <div className="w-36 h-36 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={60}
              startAngle={90}
              endAngle={-270}
              dataKey="value"
              stroke="none"
            >
              <Cell fill="#22c55e" />
              <Cell fill="#ef4444" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold text-foreground">{pct}%</span>
        </div>
      </div>
      <div className="mt-3 text-center space-y-1">
        <p className="text-xs text-muted-foreground">{myName}: <span className="text-green-400 font-semibold">{myValue.toLocaleString()}</span></p>
        <p className="text-xs text-muted-foreground">{compName}: <span className="text-red-400 font-semibold">{compValue.toLocaleString()}</span></p>
      </div>
      <div className="flex items-center gap-4 mt-3">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
          <span className="text-[10px] text-muted-foreground">Osiągnięte</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <span className="text-[10px] text-muted-foreground">Brakuje</span>
        </div>
      </div>
    </motion.div>
  );
}