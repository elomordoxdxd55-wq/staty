import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import moment from "moment";
import { useCategories, useMonthGoals } from "@/hooks/useAppData";
import StatCard from "@/components/stats/StatCard";
import ProgressBar from "@/components/stats/ProgressBar";
import { CalendarDays, Target, Trophy, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "@/lib/i18n";

const COLORS = ["#22c55e", "#8b5cf6", "#f59e0b", "#3b82f6", "#ef4444", "#06b6d4"];

export default function Home() {
  const currentMonth = moment().format("YYYY-MM");
  const currentYear = moment().format("YYYY");
  const { categories, loading: catLoading } = useCategories();
  const { goals } = useMonthGoals(currentMonth);
  const { t } = useTranslation();

  const [allEntries, setAllEntries] = useState([]);
  const [overallGoals, setOverallGoals] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (categories.length === 0) return;
      setDataLoading(true);
      const [entries, og] = await Promise.all([
        base44.entities.DailyEntry.list("date", 5000),
        base44.entities.OverallGoal.list("-created_date", 50),
      ]);
      setAllEntries(entries);
      setOverallGoals(og);
      setDataLoading(false);
    }
    load();
  }, [categories]);

  const loading = catLoading || dataLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-green-500/30 border-t-green-500 rounded-full animate-spin" />
      </div>
    );
  }

  const monthStart = moment(currentMonth, "YYYY-MM").startOf("month").format("YYYY-MM-DD");
  const monthEnd = moment(currentMonth, "YYYY-MM").endOf("month").format("YYYY-MM-DD");
  const monthEntries = allEntries.filter(e => e.date >= monthStart && e.date <= monthEnd);
  const monthTotal = monthEntries.reduce((a, e) => a + (e.my_value || 0), 0);

  const overallByCategory = {};
  categories.forEach(cat => {
    const catAll = allEntries.filter(e => e.category_id === cat.id);
    const myTotal = catAll.reduce((a, e) => a + (e.my_value || 0), 0);
    const catMonth = monthEntries.filter(e => e.category_id === cat.id);
    const catMonthTotal = catMonth.reduce((a, e) => a + (e.my_value || 0), 0);
    const vals = catAll.map(e => e.my_value || 0).filter(v => v > 0);
    const dailyVals = {};
    catAll.forEach(e => {
      dailyVals[e.date] = (dailyVals[e.date] || 0) + (e.my_value || 0);
    });
    const dayTotals = Object.values(dailyVals).filter(v => v > 0);
    overallByCategory[cat.id] = {
      myTotal,
      monthTotal: catMonthTotal,
      myBest: dayTotals.length > 0 ? Math.max(...dayTotals) : 0,
      daysWithData: vals.length,
    };
  });

  const myOverallGrand = Object.values(overallByCategory).reduce((a, s) => a + s.myTotal, 0);

  // Overall goal progress
  const overallGoalMap = {};
  overallGoals.forEach(g => { overallGoalMap[g.category_id] = g.target || 0; });
  const overallGoalTotal = Object.values(overallGoalMap).reduce((a, b) => a + b, 0);
  const overallPct = overallGoalTotal > 0 ? Math.min(100, Math.round((myOverallGrand / overallGoalTotal) * 100)) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">{t("dashboard")}</h1>
        <p className="text-muted-foreground mt-1">{moment().format("dddd, D MMMM YYYY")}</p>
      </div>

      {/* Top stat cards */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard label={t("thisMonth")} value={monthTotal.toLocaleString()} subtitle={moment().format("MMMM YYYY")} icon={CalendarDays} color="purple" />
        <StatCard label={t("overall")} value={myOverallGrand.toLocaleString()} subtitle={t("allEntries")} icon={TrendingUp} color="amber" />
      </div>

      {/* Overall goal bar */}
      {overallGoalTotal > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-2xl p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-400" />
              <h3 className="font-semibold text-foreground">Cel overall</h3>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-purple-400">{overallPct}%</span>
              <p className="text-xs text-muted-foreground">{myOverallGrand.toLocaleString()} / {overallGoalTotal.toLocaleString()}</p>
            </div>
          </div>
          <div className="relative h-4 bg-secondary rounded-full overflow-hidden mb-2">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-purple-600 to-purple-400"
              initial={{ width: 0 }}
              animate={{ width: `${overallPct}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Pozostało: <strong className="text-foreground">{(overallGoalTotal - myOverallGrand).toLocaleString()}</strong></span>
            <span>Postęp: {overallPct}%</span>
          </div>
        </motion.div>
      )}

      {/* Category cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories.map((cat, i) => {
          const s = overallByCategory[cat.id] || {};
          const goal = goals.find(g => g.category_id === cat.id);
          const color = cat.color || COLORS[i % COLORS.length];
          const overallGoal = overallGoalMap[cat.id] || 0;
          const overallCatPct = overallGoal > 0 ? Math.min(100, Math.round(((s.myTotal || 0) / overallGoal) * 100)) : 0;

          return (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-card border border-border rounded-2xl p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                  <h3 className="font-semibold text-foreground">{cat.name}</h3>
                </div>
                <span className="text-xs text-muted-foreground px-2 py-1 bg-secondary rounded-full">
                  {s.daysWithData || 0} {t("days")}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">{t("overall")}</p>
                  <p className="text-lg font-bold" style={{ color }}>{(s.myTotal || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">{t("thisMonth")}</p>
                  <p className="text-lg font-bold text-foreground">{(s.monthTotal || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">{t("bestDay")}</p>
                  <p className="text-lg font-bold text-foreground">{(s.myBest || 0).toLocaleString()}</p>
                </div>
              </div>

              {overallGoal > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Cel overall</span>
                    <span>{overallCatPct}%</span>
                  </div>
                  <ProgressBar current={s.myTotal || 0} target={overallGoal} color={color} />
                </div>
              )}

              {goal && !overallGoal && (
                <ProgressBar current={s.monthTotal || 0} target={goal.target} color={color} />
              )}
            </motion.div>
          );
        })}
      </div>

      {categories.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20 bg-card border border-border rounded-2xl"
        >
          <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground">Witaj w StatTracker!</h2>
          <p className="text-muted-foreground mt-2">Przejdź do Ustawień, aby dodać swoje kategorie statystyk.</p>
        </motion.div>
      )}
    </div>
  );
}