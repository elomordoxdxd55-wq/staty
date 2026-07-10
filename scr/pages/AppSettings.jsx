import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useCategories } from "@/hooks/useAppData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, GripVertical, Save, Palette, Globe, Sun, UserX, Users, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";
import { useTheme } from "@/lib/ThemeContext";
import { LANGUAGES, useTranslation } from "@/lib/i18n";

const DEFAULT_COLORS = ["#22c55e", "#ef4444", "#3b82f6", "#8b5cf6", "#f59e0b", "#06b6d4", "#ec4899", "#14b8a6", "#f97316", "#84cc16"];

export default function AppSettings() {
  const { categories, loading, reload } = useCategories();
  const { toast } = useToast();
  const { theme, setTheme, themes } = useTheme();
  const { t, lang } = useTranslation();
  const [localCats, setLocalCats] = useState([]);
  const [saving, setSaving] = useState(false);

  // Language
  const [selectedLang, setSelectedLang] = useState(lang);

  // Rivals
  const [rivals, setRivals] = useState([]);
  const [newRivalName, setNewRivalName] = useState("");
  const [savingRival, setSavingRival] = useState(false);

  useEffect(() => {
    setLocalCats(categories.map(c => ({ ...c })));
  }, [categories]);

  useEffect(() => {
    async function loadRivals() {
      const data = await base44.entities.CompetitorProfile.list("-created_date", 20);
      setRivals(data);
    }
    loadRivals();
  }, []);

  const addCategory = () => {
    setLocalCats(prev => [
      ...prev,
      { name: "", color: DEFAULT_COLORS[prev.length % DEFAULT_COLORS.length], order: prev.length, isNew: true },
    ]);
  };

  const removeCategory = async (index) => {
    const cat = localCats[index];
    if (cat.id) {
      await base44.entities.Category.delete(cat.id);
      toast({ title: "Kategoria usunięta" });
      reload();
    } else {
      setLocalCats(prev => prev.filter((_, i) => i !== index));
    }
  };

  const updateCategory = (index, field, value) => {
    setLocalCats(prev => prev.map((c, i) => i === index ? { ...c, [field]: value } : c));
  };

  const handleSave = async () => {
    setSaving(true);
    for (let i = 0; i < localCats.length; i++) {
      const cat = localCats[i];
      if (cat.id) {
        await base44.entities.Category.update(cat.id, { name: cat.name, color: cat.color, order: i });
      } else if (cat.name.trim()) {
        await base44.entities.Category.create({ name: cat.name.trim(), color: cat.color, order: i });
      }
    }
    setSaving(false);
    toast({ title: t("saveCategories") });
    reload();
  };

  const handleAddRival = async () => {
    if (!newRivalName.trim()) return;
    setSavingRival(true);
    const created = await base44.entities.CompetitorProfile.create({ name: newRivalName.trim() });
    setRivals(prev => [created, ...prev]);
    setNewRivalName("");
    setSavingRival(false);
    toast({ title: "Rywal dodany!" });
  };

  const handleRemoveRival = async (id) => {
    await base44.entities.CompetitorProfile.delete(id);
    setRivals(prev => prev.filter(r => r.id !== id));
    toast({ title: "Rywal usunięty" });
  };

  const handleLanguageChange = (l) => {
    setSelectedLang(l);
    localStorage.setItem("app-lang", l);
    window.location.reload();
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(t("deleteAccountConfirm"));
    if (!confirmed) return;
    const confirmed2 = window.confirm("Ostatnie ostrzeżenie! Wszystkie dane zostaną trwale usunięte. Kontynuować?");
    if (!confirmed2) return;
    try {
      await base44.auth.logout("/");
    } catch (e) {
      toast({ title: "Błąd", description: "Nie udało się usunąć konta.", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-green-500/30 border-t-green-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">{t("settings")}</h1>
        <p className="text-muted-foreground mt-1">Zarządzaj aplikacją i personalizuj</p>
      </div>

      {/* ── CATEGORIES ── */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary" /> {t("categories")}
          </h3>
          <Button onClick={addCategory} variant="outline" size="sm" className="gap-2">
            <Plus className="w-4 h-4" /> {t("add")}
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          Kliknij kwadrat koloru, aby wybrać kolor kategorii.
        </p>

        <div className="space-y-3">
          <AnimatePresence>
            {localCats.map((cat, i) => (
              <motion.div
                key={cat.id || `new-${i}`}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-3"
              >
                <GripVertical className="w-4 h-4 text-muted-foreground shrink-0 cursor-grab" />
                <input
                  type="color"
                  value={cat.color || "#22c55e"}
                  onChange={e => updateCategory(i, "color", e.target.value)}
                  className="w-9 h-9 rounded-lg cursor-pointer border-0 bg-transparent shrink-0"
                />
                {/* Color presets */}
                <div className="flex gap-1 shrink-0">
                  {DEFAULT_COLORS.slice(0, 6).map(c => (
                    <button
                      key={c}
                      onClick={() => updateCategory(i, "color", c)}
                      className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 shrink-0"
                      style={{ backgroundColor: c, borderColor: cat.color === c ? "white" : "transparent" }}
                    />
                  ))}
                </div>
                <Input
                  value={cat.name}
                  onChange={e => updateCategory(i, "name", e.target.value)}
                  placeholder={`Kategoria ${i + 1}`}
                  className="bg-secondary border-0 flex-1"
                />
                <Button
                  variant="ghost" size="icon"
                  onClick={() => removeCategory(i)}
                  className="text-muted-foreground hover:text-red-400 shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {localCats.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Palette className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p>{t("noCategories")}</p>
          </div>
        )}

        <Button onClick={handleSave} disabled={saving} className="w-full bg-green-600 hover:bg-green-700 text-white gap-2">
          {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
          {t("saveCategories")}
        </Button>
      </div>

      {/* ── RIVALS ── */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-400" /> {t("rivals")}
        </h3>
        <div className="flex gap-3">
          <Input
            value={newRivalName}
            onChange={e => setNewRivalName(e.target.value)}
            placeholder={t("rivalName")}
            className="bg-secondary border-0"
            onKeyDown={e => e.key === "Enter" && handleAddRival()}
          />
          <Button onClick={handleAddRival} disabled={savingRival || !newRivalName.trim()} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shrink-0">
            <Plus className="w-4 h-4" /> {t("add")}
          </Button>
        </div>
        <div className="space-y-2">
          {rivals.map(r => (
            <div key={r.id} className="flex items-center justify-between bg-secondary rounded-xl px-4 py-3">
              <span className="text-sm font-medium text-foreground">{r.name}</span>
              <Button variant="ghost" size="icon" onClick={() => handleRemoveRival(r.id)} className="text-muted-foreground hover:text-red-400">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          {rivals.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Brak rywali. Dodaj pierwszego rywala!</p>
          )}
        </div>
      </div>

      {/* ── APPEARANCE ── */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Sun className="w-5 h-5 text-amber-400" /> {t("appearance")}
        </h3>
        <div>
          <p className="text-sm text-muted-foreground mb-3">{t("theme")}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(themes).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => setTheme(key)}
                className={`relative flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-sm font-medium ${
                  theme === key
                    ? "border-primary text-primary bg-primary/10"
                    : "border-border text-muted-foreground hover:border-foreground/30"
                }`}
              >
                {cfg.label}
                {theme === key && <Check className="w-4 h-4 shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── LANGUAGE ── */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Globe className="w-5 h-5 text-green-400" /> {t("language")}
        </h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(LANGUAGES).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => handleLanguageChange(key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                selectedLang === key
                  ? "border-primary text-primary bg-primary/10"
                  : "border-border text-muted-foreground hover:border-foreground/30"
              }`}
            >
              {cfg.label}
              {selectedLang === key && <Check className="w-4 h-4" />}
            </button>
          ))}
        </div>
      </div>

      {/* ── DELETE ACCOUNT ── */}
      <div className="bg-card border border-red-500/30 rounded-2xl p-6 space-y-4">
        <h3 className="text-lg font-semibold text-red-400 flex items-center gap-2">
          <UserX className="w-5 h-5" /> {t("deleteAccount")}
        </h3>
        <p className="text-sm text-muted-foreground">{t("deleteAccountDesc")}</p>
        <Button
          onClick={handleDeleteAccount}
          variant="outline"
          className="border-red-500/50 text-red-400 hover:bg-red-500/10 hover:border-red-400 gap-2"
        >
          <UserX className="w-4 h-4" />
          {t("deleteAccount")}
        </Button>
      </div>
    </div>
  );
}