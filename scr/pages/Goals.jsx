import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import moment from "moment";
import { useCategories, useMonthEntries, useMonthGoals, calcMonthStats } from "@/hooks/useAppData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ProgressBar from "@/components/stats/ProgressBar";
import { ChevronLeft, ChevronRight, Save, Target, Infinity } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";

const COLORS = ["#22c55e", "#8b5cf6", "#f59e0b", "#3b82f6", "#ef4444", "#06b6d4"];

export default function Goals() {
  const [currentMonth, setCurrentMonth] = useState(moment().format("YYYY-MM"));
  const { categories, loading: catLoading } = useCategories();
  const { entries, loading: entLoading } = useMonthEntries(currentMonth);
  const { goals, loading: goalLoading, reload } = useMonthGoals(currentMonth);
  const { toast } = useToast();
  const [goalValues, setGoalValues] = useState({});
  const [savingMonthly, setSavingMonthly] = useState(false);

  // Overall goals
  const [overallGoals, setOverallGoals] = useState([]);
  const [overallValues, setOverallValues] = useState({});
  const [savingOverall, setSavingOverall] = useState(false);

  // All-time entries for overall progress
  const [allEntries, setAllEntries] = useState([]);

  useEffect(() => {
    const map = {};
    goals.forEach(g => { map[g.category_id] = { target: g.target, id: g.id }; });
    setGoalValues(map);
  }, [goals]);

  useEffect(() => {
    async function load() {
      const [og, ae] = await Promise.all([
        base44.entities.OverallGoal.list("-created_date", 50),
        base44.entities.DailyEntry.list("date", 5000),
      ]);
      setOverallGoals(og);
      const oMap = {};
      og.forEach(g => { oMap[g.category_id] = { target: g.target, id: g.id }; });
      setOverallValues(oMap);
      setAllEntries(ae);
    }
    load();
  }, []);

  const stats = calcMonthStats(entries, categories);

  // Daily avg for current month (days with any data)
  const monthDailyAvg = (catId) => {
    const catEntries = entries.filter(e => e.category_id === catId && (e.my_value || 0) > 0);
    if (catEntries.length === 0) return 0;
    const total = catEntries.reduce((a, e) => a + (e.my_value || 0), 0);
    return Math.round(total / catEntries.length * 10) / 10;
  };

  // All-time total per category
  const overallTotal = (catId) =>
    allEntries.filter(e => e.category_id === catId).reduce((a, e) => a + (e.my_value || 0), 0);

  const handleSaveMonthly = async () => {
    setSavingMonthly(true);
    for (const cat of categories) {
      const gv = goalValues[cat.id];
      const existing = goals.find(g => g.category_id === cat.id);
      const target = gv?.target || 0;
      if (existing) {
        await base44.entities.MonthlyGoal.update(existing.id, { target });
      } else if (target > 0) {
        await base44.entities.MonthlyGoal.create({ month: currentMonth, category_id: cat.id, target });
      }
    }
    setSavingMonthly(false);
    toast({ title: "Cele miesięczne zapisane!" });
    reload();
  };

  const handleSaveOverall = async () => {
    setSavingOverall(true);
    for (const cat of categories) {
      const ov = overallValues[cat.id];
      const existing = overallGoals.find(g => g.category_id === cat.id);
      const target = ov?.target || 0;
      if (existing) {
        await base44.entities.OverallGoal.update(existing.id, { target });
      } else if (target > 0) {
        const created = await base44.entities.OverallGoal.create({ category_id: cat.id, target });
        setOverallValues(prev => ({ ...prev, [cat.id]: { target, id: created.id } }));
      }
    }
    setSavingOverall(false);
    toast({ title: "Cele overall zapisane!" });
  };

  const prevMonth = () => setCurrentMonth(moment(currentMonth, "YYYY-MM").subtract(1, "month").format("YYYY-MM"));
  const nextMonth = () => setCurrentMonth(moment(currentMonth, "YYYY-MM").add(1, "month").format("YYYY-MM"));

  const loading = catLoading || entLoading || goalLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-green-500/30 border-t-green-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Cele</h1>
        <p className="text-muted-foreground mt-1">Ustaw i śledź cele miesięczne i overall</p>
      </div>

      {/* ── MONTHLY GOALS ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-green-400" />
            <h2 className="text-lg font-semibold text-foreground">Cele miesięczne</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-1.5">
              <Button variant="ghost" size="icon" onClick={prevMonth} className="w-6 h-6">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium text-foreground min-w-[110px] text-center">
                {moment(currentMonth, "YYYY-MM").format("MMMM YYYY")}
              </span>
              <Button variant="ghost" size="icon" onClick={nextMonth} className="w-6 h-6">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <Button onClick={handleSaveMonthly} disabled={savingMonthly} className="bg-green-600 hover:bg-green-700 text-white gap-2">
              {savingMonthly ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
              Zapisz
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat, i) => {
            const s = stats.byCategory[cat.id] || {};
            const gv = goalValues[cat.id] || {};
            const color = cat.color || COLORS[i % COLORS.length];
            const target = gv.target || 0;
            const current = s.myTotal || 0;
            const pct = target > 0 ? Math.round((current / target) * 100) : 0;
            const avg = monthDailyAvg(cat.id);

            return (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="bg-card border border-border rounded-2xl p-6 space-y-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: color + "20" }}>
                    <Target className="w-5 h-5" style={{ color }} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{cat.name}</h3>
                    <p className="text-xs text-muted-foreground">{moment(currentMonth, "YYYY-MM").format("MMMM YYYY")}</p>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5">Ustaw cel</label>
                  <Input
                    type="number"
                    value={gv.target || ""}
                    onChange={e => setGoalValues(prev => ({ ...prev, [cat.id]: { ...prev[cat.id], target: Number(e.target.value) || 0 } }))}
                    placeholder="np. 20000"
                    className="bg-secondary border-0"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-secondary rounded-xl p-3">
                    <p className="text-[10px] text-muted-foreground uppercase">Aktualne</p>
                    <p className="text-base font-bold" style={{ color }}>{current.toLocaleString()}</p>
                  </div>
                  <div className="bg-secondary rounded-xl p-3">
                    <p className="text-[10px] text-muted-foreground uppercase">Postęp</p>
                    <p className="text-base font-bold text-foreground">{pct}%</p>
                  </div>
                  <div className="bg-secondary rounded-xl p-3">
                    <p className="text-[10px] text-muted-foreground uppercase">Śr./dzień</p>
                    <p className="text-base font-bold text-amber-400">{avg}</p>
                  </div>
                </div>

                {target > 0 && (
                  <ProgressBar current={current} target={target} color={color} />
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ── OVERALL GOALS ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Infinity className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-foreground">Cele overall (all-time)</h2>
          </div>
          <Button onClick={handleSaveOverall} disabled={savingOverall} className="bg-purple-600 hover:bg-purple-700 text-white gap-2">
            {savingOverall ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
            Zapisz
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat, i) => {
            const ov = overallValues[cat.id] || {};
            const color = cat.color || COLORS[i % COLORS.length];
            const target = ov.target || 0;
            const current = overallTotal(cat.id);
            const pct = target > 0 ? Math.round((current / target) * 100) : 0;

            return (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="bg-card border border-border rounded-2xl p-6 space-y-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-purple-500/10">
                    <Infinity className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{cat.name}</h3>
                    <p className="text-xs text-muted-foreground">Cel całkowity</p>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5">Ustaw cel overall</label>
                  <Input
                    type="number"
                    value={ov.target || ""}
                    onChange={e => setOverallValues(prev => ({ ...prev, [cat.id]: { ...prev[cat.id], target: Number(e.target.value) || 0 } }))}
                    placeholder="np. 100000"
                    className="bg-secondary border-0"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-secondary rounded-xl p-3">
                    <p className="text-[10px] text-muted-foreground uppercase">Aktualne</p>
                    <p className="text-base font-bold" style={{ color }}>{current.toLocaleString()}</p>
                  </div>
                  <div className="bg-secondary rounded-xl p-3">
                    <p className="text-[10px] text-muted-foreground uppercase">Postęp</p>
                    <p className="text-base font-bold text-purple-400">{pct}%</p>
                  </div>
                </div>

                {target > 0 && (
                  <ProgressBar current={current} target={target} color="#8b5cf6" />
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}