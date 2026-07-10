import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import moment from "moment";
import { useCategories, useMonthEntries } from "@/hooks/useAppData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, Save } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";

export default function Entries() {
  const [currentMonth, setCurrentMonth] = useState(moment().format("YYYY-MM"));
  const { categories, loading: catLoading } = useCategories();
  const { entries, loading: entLoading, reload } = useMonthEntries(currentMonth);
  const { toast } = useToast();
  const [localValues, setLocalValues] = useState({});
  const [saving, setSaving] = useState(false);

  const daysInMonth = moment(currentMonth, "YYYY-MM").daysInMonth();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Build local value map from entries
  useEffect(() => {
    const map = {};
    entries.forEach(e => {
      const key = `${e.date}_${e.category_id}`;
      map[key] = { my: e.my_value || 0, id: e.id };
    });
    setLocalValues(map);
  }, [entries]);

  const handleChange = (day, catId, value) => {
    const dateStr = moment(currentMonth, "YYYY-MM").date(day).format("YYYY-MM-DD");
    const key = `${dateStr}_${catId}`;
    setLocalValues(prev => ({
      ...prev,
      [key]: { ...prev[key], my: Number(value) || 0, dirty: true },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    const dirtyEntries = Object.entries(localValues).filter(([, v]) => v.dirty);

    for (const [key, val] of dirtyEntries) {
      const [dateStr, catId] = key.split(/_(.+)/);
      if (val.id) {
        await base44.entities.DailyEntry.update(val.id, { my_value: val.my || 0 });
      } else {
        await base44.entities.DailyEntry.create({
          date: dateStr,
          category_id: catId,
          my_value: val.my || 0,
          competitor_value: 0,
        });
      }
    }
    setSaving(false);
    toast({ title: "Zapisano!" });
    reload();
  };

  const prevMonth = () => setCurrentMonth(moment(currentMonth, "YYYY-MM").subtract(1, "month").format("YYYY-MM"));
  const nextMonth = () => setCurrentMonth(moment(currentMonth, "YYYY-MM").add(1, "month").format("YYYY-MM"));

  const loading = catLoading || entLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-green-500/30 border-t-green-500 rounded-full animate-spin" />
      </div>
    );
  }

  const today = moment().format("YYYY-MM-DD");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Wpisy dzienne</h1>
          <p className="text-muted-foreground mt-1">Wpisuj swoje dzienne wyniki</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white gap-2">
          {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
          Zapisz
        </Button>
      </div>

      {/* Month selector */}
      <div className="flex items-center gap-4 bg-card border border-border rounded-2xl p-4">
        <Button variant="ghost" size="icon" onClick={prevMonth} className="shrink-0">
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h2 className="text-lg font-semibold text-foreground flex-1 text-center">
          {moment(currentMonth, "YYYY-MM").format("MMMM YYYY")}
        </h2>
        <Button variant="ghost" size="icon" onClick={nextMonth} className="shrink-0">
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Daily entries */}
      {categories.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border rounded-2xl">
          <p className="text-muted-foreground">Dodaj kategorie w Ustawieniach, aby rozpocząć.</p>
        </div>
      ) : (
        <>
          {/* ── MOBILE: stacked day cards (< sm) ── */}
          <div className="sm:hidden space-y-3">
            {days.map(day => {
              const dateStr = moment(currentMonth, "YYYY-MM").date(day).format("YYYY-MM-DD");
              const isToday = dateStr === today;
              const dayTotal = categories.reduce((a, cat) => a + (localValues[`${dateStr}_${cat.id}`]?.my || 0), 0);
              return (
                <motion.div
                  key={day}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: day * 0.01 }}
                  className={`bg-card border rounded-2xl p-4 space-y-3 ${isToday ? "border-primary" : "border-border"}`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`font-bold text-base ${isToday ? "text-primary" : "text-foreground"}`}>
                      {moment(dateStr).format("dd, D MMMM")} {isToday && "• Dziś"}
                    </span>
                    {dayTotal > 0 && <span className="text-xs font-semibold text-muted-foreground">Σ {dayTotal.toLocaleString()}</span>}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {categories.map(cat => {
                      const key = `${dateStr}_${cat.id}`;
                      const val = localValues[key]?.my || 0;
                      return (
                        <div key={cat.id} className="space-y-1">
                          <label className="text-[10px] font-medium flex items-center gap-1" style={{ color: cat.color || "#22c55e" }}>
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat.color || "#22c55e" }} />
                            {cat.name}
                          </label>
                          <Input
                            type="number"
                            inputMode="numeric"
                            value={val || ""}
                            onChange={e => handleChange(day, cat.id, e.target.value)}
                            className="h-10 text-center text-sm bg-secondary border-0 rounded-xl"
                            placeholder="0"
                          />
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* ── DESKTOP/TABLET: weekly table (≥ sm) ── */}
          <div className="hidden sm:block space-y-4">
            {(() => {
              const weeks = [];
              for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
              return weeks.map((week, wi) => (
                <motion.div
                  key={wi}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: wi * 0.05 }}
                  className="bg-card border border-border rounded-2xl overflow-hidden"
                >
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px]">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left text-xs text-muted-foreground font-medium p-3 w-24 sticky left-0 bg-card z-10">Dzień</th>
                          {week.map(day => {
                            const dateStr = moment(currentMonth, "YYYY-MM").date(day).format("YYYY-MM-DD");
                            const isToday = dateStr === today;
                            return (
                              <th key={day} className={`text-center text-xs font-medium p-3 min-w-[80px] ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                                {day}
                                {isToday && <div className="w-1.5 h-1.5 rounded-full bg-primary mx-auto mt-1" />}
                              </th>
                            );
                          })}
                          <th className="text-center text-xs text-muted-foreground font-medium p-3 min-w-[70px]">Suma</th>
                        </tr>
                      </thead>
                      <tbody>
                        {categories.map((cat, ci) => {
                          let weekTotal = 0;
                          return (
                            <tr key={cat.id} className={ci < categories.length - 1 ? "border-b border-border/50" : ""}>
                              <td className="p-3 sticky left-0 bg-card z-10">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color || "#22c55e" }} />
                                  <span className="text-xs font-medium text-foreground truncate">{cat.name}</span>
                                </div>
                              </td>
                              {week.map(day => {
                                const dateStr = moment(currentMonth, "YYYY-MM").date(day).format("YYYY-MM-DD");
                                const key = `${dateStr}_${cat.id}`;
                                const val = localValues[key]?.my || 0;
                                weekTotal += val;
                                return (
                                  <td key={day} className="p-1.5 text-center">
                                    <Input
                                      type="number"
                                      value={val || ""}
                                      onChange={e => handleChange(day, cat.id, e.target.value)}
                                      className="w-full h-8 text-center text-xs bg-secondary border-0 rounded-lg"
                                      placeholder="0"
                                    />
                                  </td>
                                );
                              })}
                              <td className="p-3 text-center">
                                <span className="text-sm font-bold" style={{ color: cat.color || "#22c55e" }}>
                                  {weekTotal.toLocaleString()}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              ));
            })()}
          </div>
        </>
      )}


    </div>
  );
}