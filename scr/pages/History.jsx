import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import moment from "moment";
import { useCategories } from "@/hooks/useAppData";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from "recharts";
import { useTranslation } from "@/lib/i18n";

const COLORS = ["#22c55e", "#8b5cf6", "#f59e0b", "#3b82f6", "#ef4444", "#06b6d4"];

export default function History() {
  const [selectedMonth, setSelectedMonth] = useState(moment().format("YYYY-MM"));
  const { categories, loading: catLoading } = useCategories();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [monthlyTotals, setMonthlyTotals] = useState([]);
  const { t } = useTranslation();

  useEffect(() => {
    async function load() {
      setLoading(true);
      const startDate = moment(selectedMonth, "YYYY-MM").startOf("month").format("YYYY-MM-DD");
      const endDate = moment(selectedMonth, "YYYY-MM").endOf("month").format("YYYY-MM-DD");
      const data = await base44.entities.DailyEntry.filter(
        { date: { $gte: startDate, $lte: endDate } },
        "date",
        1000
      );
      setEntries(data);
      setLoading(false);
    }
    load();
  }, [selectedMonth]);

  useEffect(() => {
    async function loadHistorical() {
      if (categories.length === 0) return;
      const months = [];
      for (let i = 5; i >= 0; i--) months.push(moment().subtract(i, "months").format("YYYY-MM"));

      const startDate = moment().subtract(5, "months").startOf("month").format("YYYY-MM-DD");
      const endDate = moment().endOf("month").format("YYYY-MM-DD");
      const allEntries = await base44.entities.DailyEntry.filter(
        { date: { $gte: startDate, $lte: endDate } }, "date", 5000
      );

      const totals = months.map(m => {
        const mStart = moment(m, "YYYY-MM").startOf("month").format("YYYY-MM-DD");
        const mEnd = moment(m, "YYYY-MM").endOf("month").format("YYYY-MM-DD");
        const monthEntries = allEntries.filter(e => e.date >= mStart && e.date <= mEnd);
        const row = { month: moment(m, "YYYY-MM").format("MMM YY") };
        categories.forEach(cat => {
          row[cat.name] = monthEntries.filter(e => e.category_id === cat.id).reduce((a, e) => a + (e.my_value || 0), 0);
        });
        return row;
      });
      setMonthlyTotals(totals);
    }
    loadHistorical();
  }, [categories]);

  const prevMonth = () => setSelectedMonth(moment(selectedMonth, "YYYY-MM").subtract(1, "month").format("YYYY-MM"));
  const nextMonth = () => setSelectedMonth(moment(selectedMonth, "YYYY-MM").add(1, "month").format("YYYY-MM"));

  const daysInMonth = moment(selectedMonth, "YYYY-MM").daysInMonth();

  // Build chart data with per-category Y domain based on actual values
  const chartData = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const dateStr = moment(selectedMonth, "YYYY-MM").date(day).format("YYYY-MM-DD");
    const row = { day };
    categories.forEach(cat => {
      const entry = entries.find(e => e.date === dateStr && e.category_id === cat.id);
      row[cat.name] = entry?.my_value || 0;
    });
    return row;
  });

  // Compute min/max per category for smart Y-axis domain
  const catDomains = {};
  categories.forEach(cat => {
    const vals = chartData.map(r => r[cat.name]).filter(v => v > 0);
    if (vals.length === 0) { catDomains[cat.name] = [0, 10]; return; }
    const min = Math.max(0, Math.min(...vals) - Math.round(Math.min(...vals) * 0.2));
    const max = Math.max(...vals) + Math.round(Math.max(...vals) * 0.2);
    catDomains[cat.name] = [min, max];
  });

  const isLoading = catLoading || loading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-green-500/30 border-t-green-500 rounded-full animate-spin" />
      </div>
    );
  }

  const customTooltip = ({ active, payload, label }) => {
    if (!active || !payload) return null;
    return (
      <div className="bg-card border border-border rounded-xl p-3 shadow-xl">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} className="text-xs font-medium" style={{ color: p.color }}>
            {p.name}: {p.value?.toLocaleString()}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">{t("history")}</h1>
        <p className="text-muted-foreground mt-1">Przeglądaj wyniki z poprzednich miesięcy</p>
      </div>

      {/* Month selector */}
      <div className="flex items-center gap-4 bg-card border border-border rounded-2xl p-4">
        <Button variant="ghost" size="icon" onClick={prevMonth}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h2 className="text-lg font-semibold text-foreground flex-1 text-center flex items-center justify-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          {moment(selectedMonth, "YYYY-MM").format("MMMM YYYY")}
        </h2>
        <Button variant="ghost" size="icon" onClick={nextMonth}>
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Separate chart per category with smart Y axis */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">{t("dailyProgress")}</h3>
        {categories.map((cat, i) => {
          const color = cat.color || COLORS[i % COLORS.length];
          const domain = catDomains[cat.name] || [0, 10];
          return (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card border border-border rounded-2xl p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                <h4 className="font-semibold text-foreground">{cat.name}</h4>
              </div>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      domain={domain}
                      tickFormatter={v => v.toLocaleString()}
                    />
                    <Tooltip content={customTooltip} />
                    <Line
                      type="monotone"
                      dataKey={cat.name}
                      stroke={color}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Monthly comparison bar chart */}
      {monthlyTotals.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-2xl p-6"
        >
          <h3 className="text-lg font-semibold text-foreground mb-4">{t("monthComparison")}</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTotals}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip content={customTooltip} />
                <Legend />
                {categories.map((cat, i) => (
                  <Bar key={cat.id} dataKey={cat.name} fill={cat.color || COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* Entries table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-2xl overflow-hidden"
      >
        <div className="p-5 border-b border-border">
          <h3 className="font-semibold text-foreground">{t("allEntryList")}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs text-muted-foreground font-medium p-4">Data</th>
                {categories.map(cat => (
                  <th key={cat.id} className="text-center text-xs text-muted-foreground font-medium p-4">{cat.name}</th>
                ))}
                <th className="text-center text-xs text-muted-foreground font-medium p-4">{t("total")}</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const dateStr = moment(selectedMonth, "YYYY-MM").date(day).format("YYYY-MM-DD");
                const dayEntries = entries.filter(e => e.date === dateStr);
                const dayTotal = dayEntries.reduce((a, e) => a + (e.my_value || 0), 0);
                if (dayTotal === 0) return null;
                return (
                  <tr key={day} className="border-b border-border/50">
                    <td className="p-4 text-sm text-foreground">{moment(dateStr).format("DD.MM")}</td>
                    {categories.map((cat, ci) => {
                      const entry = dayEntries.find(e => e.category_id === cat.id);
                      return (
                        <td key={cat.id} className="p-4 text-center text-sm font-medium" style={{ color: cat.color || COLORS[ci % COLORS.length] }}>
                          {entry?.my_value || 0}
                        </td>
                      );
                    })}
                    <td className="p-4 text-center text-sm font-bold text-foreground">{dayTotal.toLocaleString()}</td>
                  </tr>
                );
              }).filter(Boolean)}
            </tbody>
          </table>
        </div>
        {entries.length === 0 && (
          <div className="p-10 text-center text-muted-foreground">{t("noEntriesMonth")}</div>
        )}
      </motion.div>
    </div>
  );
}