import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import moment from "moment";

export function useCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await base44.entities.Category.list("order", 50);
    setCategories(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  return { categories, loading, reload: load };
}

export function useMonthEntries(month) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!month) return;
    setLoading(true);
    const startDate = moment(month, "YYYY-MM").startOf("month").format("YYYY-MM-DD");
    const endDate = moment(month, "YYYY-MM").endOf("month").format("YYYY-MM-DD");
    const data = await base44.entities.DailyEntry.filter(
      { date: { $gte: startDate, $lte: endDate } },
      "date",
      1000
    );
    setEntries(data);
    setLoading(false);
  }, [month]);

  useEffect(() => { load(); }, [load]);
  return { entries, loading, reload: load };
}

export function useMonthGoals(month) {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!month) return;
    setLoading(true);
    const data = await base44.entities.MonthlyGoal.filter({ month }, "-created_date", 50);
    setGoals(data);
    setLoading(false);
  }, [month]);

  useEffect(() => { load(); }, [load]);
  return { goals, loading, reload: load };
}

export function useCompetitor() {
  const [competitor, setCompetitor] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await base44.entities.CompetitorProfile.list("-created_date", 1);
    setCompetitor(data[0] || null);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  return { competitor, loading, reload: load };
}

export function calcMonthStats(entries, categories) {
  const stats = {};
  categories.forEach(cat => {
    const catEntries = entries.filter(e => e.category_id === cat.id);
    const myValues = catEntries.map(e => e.my_value || 0);
    const compValues = catEntries.map(e => e.competitor_value || 0);
    const myTotal = myValues.reduce((a, b) => a + b, 0);
    const compTotal = compValues.reduce((a, b) => a + b, 0);
    const daysWithData = myValues.filter(v => v > 0).length;
    stats[cat.id] = {
      category: cat,
      myTotal,
      compTotal,
      myAvg: daysWithData > 0 ? Math.round(myTotal / daysWithData * 100) / 100 : 0,
      myBest: myValues.length > 0 ? Math.max(...myValues) : 0,
      daysWithData,
      entries: catEntries,
    };
  });

  const myGrandTotal = Object.values(stats).reduce((a, s) => a + s.myTotal, 0);
  const compGrandTotal = Object.values(stats).reduce((a, s) => a + s.compTotal, 0);

  return { byCategory: stats, myGrandTotal, compGrandTotal };
}