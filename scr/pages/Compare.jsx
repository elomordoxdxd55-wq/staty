import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useCategories } from "@/hooks/useAppData";
import ComparisonPie from "@/components/stats/ComparisonPie";
import { Save, TrendingUp, TrendingDown, Minus, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";

const COLORS = ["#22c55e", "#8b5cf6", "#f59e0b", "#3b82f6", "#ef4444", "#06b6d4"];

export default function Compare() {
  const { categories, loading: catLoading } = useCategories();
  const { toast } = useToast();

  const [rivals, setRivals] = useState([]);
  const [selectedRivalId, setSelectedRivalId] = useState(null);
  const [myTotals, setMyTotals] = useState({});
  // compStats: { [rivalId]: { [catId]: { total, statId } } }
  const [compStats, setCompStats] = useState({});
  const [compInputs, setCompInputs] = useState({});
  const [savingComp, setSavingComp] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (categories.length === 0) return;
      setDataLoading(true);
      const [allEntries, rivalsData, statsData] = await Promise.all([
        base44.entities.DailyEntry.list("date", 5000),
        base44.entities.CompetitorProfile.list("-created_date", 20),
        base44.entities.CompetitorStat.list("-created_date", 500),
      ]);

      // My totals
      const myMap = {};
      categories.forEach(cat => {
        myMap[cat.id] = allEntries.filter(e => e.category_id === cat.id).reduce((a, e) => a + (e.my_value || 0), 0);
      });
      setMyTotals(myMap);

      setRivals(rivalsData);
      if (rivalsData.length > 0) setSelectedRivalId(rivalsData[0].id);

      // Group stats by rival_id
      const grouped = {};
      statsData.forEach(s => {
        const rid = s.rival_id;
        if (!grouped[rid]) grouped[rid] = {};
        grouped[rid][s.category_id] = { total: s.total_value || 0, statId: s.id };
      });
      setCompStats(grouped);

      // Init inputs for first rival
      if (rivalsData.length > 0) {
        const rid = rivalsData[0].id;
        const inputs = {};
        categories.forEach(cat => {
          inputs[cat.id] = grouped[rid]?.[cat.id]?.total || 0;
        });
        setCompInputs(inputs);
      }

      setDataLoading(false);
    }
    load();
  }, [categories]);

  // When rival changes, update inputs
  const handleSelectRival = (rid) => {
    setSelectedRivalId(rid);
    const inputs = {};
    categories.forEach(cat => {
      inputs[cat.id] = compStats[rid]?.[cat.id]?.total || 0;
    });
    setCompInputs(inputs);
  };

  const handleSaveComp = async () => {
    if (!selectedRivalId) return;
    setSavingComp(true);
    const rivalStats = compStats[selectedRivalId] || {};
    for (const cat of categories) {
      const total = compInputs[cat.id] || 0;
      const existing = rivalStats[cat.id];
      if (existing) {
        await base44.entities.CompetitorStat.update(existing.statId, { total_value: total });
      } else {
        const created = await base44.entities.CompetitorStat.create({
          category_id: cat.id,
          rival_id: selectedRivalId,
          total_value: total,
        });
        setCompStats(prev => ({
          ...prev,
          [selectedRivalId]: {
            ...prev[selectedRivalId],
            [cat.id]: { total, statId: created.id },
          },
        }));
      }
    }
    // Update local state
    setCompStats(prev => {
      const updated = { ...prev, [selectedRivalId]: { ...(prev[selectedRivalId] || {}) } };
      categories.forEach(cat => {
        updated[selectedRivalId][cat.id] = {
          ...(updated[selectedRivalId][cat.id] || {}),
          total: compInputs[cat.id] || 0,
        };
      });
      return updated;
    });
    setSavingComp(false);
    toast({ title: "Wyniki rywala zapisane!" });
  };

  const loading = catLoading || dataLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-green-500/30 border-t-green-500 rounded-full animate-spin" />
      </div>
    );
  }

  const selectedRival = rivals.find(r => r.id === selectedRivalId);
  const compDisplayName = selectedRival?.name || "Rywal";
  const rivalCatStats = compStats[selectedRivalId] || {};

  const myGrandTotal = Object.values(myTotals).reduce((a, b) => a + b, 0);
  const compGrandTotal = categories.reduce((a, cat) => a + (rivalCatStats[cat.id]?.total || 0), 0);
  const diff = myGrandTotal - compGrandTotal;

  if (rivals.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Porównanie</h1>
          <p className="text-muted-foreground mt-1">Brak rywali — dodaj rywala w Ustawieniach.</p>
        </div>
        <div className="text-center py-20 bg-card border border-border rounded-2xl text-muted-foreground">
          Przejdź do <strong>Ustawień</strong> i dodaj rywala, żeby zobaczyć porównanie.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Porównanie</h1>
        <p className="text-muted-foreground mt-1">Twoje overall wyniki vs rywal</p>
      </div>

      {/* Rival selector */}
      {rivals.length > 1 && (
        <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 flex-wrap">
          <span className="text-sm text-muted-foreground">Rywal:</span>
          <div className="flex flex-wrap gap-2">
            {rivals.map(r => (
              <button
                key={r.id}
                onClick={() => handleSelectRival(r.id)}
                className={`px-4 py-1.5 rounded-xl text-sm font-medium border transition-all ${
                  selectedRivalId === r.id
                    ? "border-primary text-primary bg-primary/10"
                    : "border-border text-muted-foreground hover:border-foreground/30"
                }`}
              >
                {r.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Overall totals */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-2xl p-6"
      >
        <h3 className="text-lg font-semibold text-foreground mb-4">Wynik całościowy (all time)</h3>
        <div className="grid grid-cols-2 gap-6 mb-4">
          <div className="text-center">
            <p className="text-xs text-muted-foreground uppercase mb-1">Ja</p>
            <p className="text-3xl font-bold text-green-400">{myGrandTotal.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground uppercase mb-1">{compDisplayName}</p>
            <p className="text-3xl font-bold text-red-400">{compGrandTotal.toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-center justify-center gap-3">
          {diff > 0 ? (
            <div className="flex items-center gap-2 text-green-400">
              <TrendingUp className="w-5 h-5" />
              <span className="font-semibold">Prowadzisz o {diff.toLocaleString()}</span>
            </div>
          ) : diff < 0 ? (
            <div className="flex items-center gap-2 text-red-400">
              <TrendingDown className="w-5 h-5" />
              <span className="font-semibold">Tracisz {Math.abs(diff).toLocaleString()}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-amber-400">
              <Minus className="w-5 h-5" />
              <span className="font-semibold">Remis!</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Edit rival stats inline */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Wyniki: {compDisplayName} (overall)</h3>
          <Button onClick={handleSaveComp} disabled={savingComp} size="sm" className="bg-red-600/80 hover:bg-red-600 text-white gap-2">
            {savingComp ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Zapisz
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Wpisz łączne wyniki rywala (sumę całkowitą).</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {categories.map((cat, i) => (
            <div key={cat.id} className="space-y-1.5">
              <label className="text-xs font-medium flex items-center gap-1.5" style={{ color: cat.color || COLORS[i % COLORS.length] }}>
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color || COLORS[i % COLORS.length] }} />
                {cat.name}
              </label>
              <Input
                type="number"
                value={compInputs[cat.id] || ""}
                onChange={e => setCompInputs(prev => ({ ...prev, [cat.id]: Number(e.target.value) || 0 }))}
                placeholder="0"
                className="bg-secondary border-0 text-red-400"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Pie charts */}
      <div className="flex flex-wrap justify-center gap-4">
        <ComparisonPie
          myValue={myGrandTotal}
          compValue={compGrandTotal}
          label="Łącznie"
          compName={compDisplayName}
        />
        {categories.map(cat => (
          <ComparisonPie
            key={cat.id}
            myValue={myTotals[cat.id] || 0}
            compValue={rivalCatStats[cat.id]?.total || 0}
            label={cat.name}
            compName={compDisplayName}
          />
        ))}
      </div>

      {/* Detailed table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-2xl overflow-hidden"
      >
        <div className="p-5 border-b border-border">
          <h3 className="font-semibold text-foreground">Szczegółowe porównanie</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs text-muted-foreground font-medium p-4">Kategoria</th>
                <th className="text-center text-xs text-muted-foreground font-medium p-4">Ja</th>
                <th className="text-center text-xs text-muted-foreground font-medium p-4">{compDisplayName}</th>
                <th className="text-center text-xs text-muted-foreground font-medium p-4">Różnica</th>
                <th className="text-center text-xs text-muted-foreground font-medium p-4">% rywala</th>
                <th className="text-center text-xs text-muted-foreground font-medium p-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat, i) => {
                const myVal = myTotals[cat.id] || 0;
                const compVal = rivalCatStats[cat.id]?.total || 0;
                const d = myVal - compVal;
                const pct = compVal > 0 ? Math.round((myVal / compVal) * 100) : 0;
                const color = cat.color || COLORS[i % COLORS.length];
                return (
                  <tr key={cat.id} className="border-b border-border/50">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                        <span className="text-sm font-medium text-foreground">{cat.name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-center text-sm font-semibold text-green-400">{myVal.toLocaleString()}</td>
                    <td className="p-4 text-center text-sm font-semibold text-red-400">{compVal.toLocaleString()}</td>
                    <td className={`p-4 text-center text-sm font-semibold ${d >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {d >= 0 ? "+" : ""}{d.toLocaleString()}
                    </td>
                    <td className="p-4 text-center text-sm text-muted-foreground">{pct}%</td>
                    <td className="p-4 text-center">
                      {d > 0 ? (
                        <span className="text-xs bg-green-500/15 text-green-400 px-2 py-1 rounded-full">Prowadzisz</span>
                      ) : d < 0 ? (
                        <span className="text-xs bg-red-500/15 text-red-400 px-2 py-1 rounded-full">Tracisz</span>
                      ) : (
                        <span className="text-xs bg-amber-500/15 text-amber-400 px-2 py-1 rounded-full">Remis</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}