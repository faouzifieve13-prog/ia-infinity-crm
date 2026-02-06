import { useState, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Check,
  Edit3,
  Plus,
  Save,
  Loader2,
  Trophy,
  Flag,
  Zap,
  Star,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { DeliveryMilestone, Project } from "@/lib/types";

// ── Milestone Stage Config ──────────────────────────────────────────────
const MILESTONE_CONFIG = {
  audit_client: {
    label: "Audit Client",
    shortLabel: "Audit",
    icon: "🔍",
    color: "bg-blue-500",
    gradientFrom: "from-blue-400",
    gradientTo: "to-blue-600",
    textColor: "text-blue-600",
    bgLight: "bg-blue-50 dark:bg-blue-950",
    ringColor: "ring-blue-500",
    order: 1,
  },
  production_v1: {
    label: "Production V1",
    shortLabel: "V1",
    icon: "🔧",
    color: "bg-amber-500",
    gradientFrom: "from-amber-400",
    gradientTo: "to-amber-600",
    textColor: "text-amber-600",
    bgLight: "bg-amber-50 dark:bg-amber-950",
    ringColor: "ring-amber-500",
    order: 2,
  },
  production_v2: {
    label: "Production V2",
    shortLabel: "V2",
    icon: "🔄",
    color: "bg-orange-500",
    gradientFrom: "from-orange-400",
    gradientTo: "to-orange-600",
    textColor: "text-orange-600",
    bgLight: "bg-orange-50 dark:bg-orange-950",
    ringColor: "ring-orange-500",
    order: 3,
  },
  implementation_client: {
    label: "Implémentation",
    shortLabel: "Implém.",
    icon: "🚀",
    color: "bg-purple-500",
    gradientFrom: "from-purple-400",
    gradientTo: "to-purple-600",
    textColor: "text-purple-600",
    bgLight: "bg-purple-50 dark:bg-purple-950",
    ringColor: "ring-purple-500",
    order: 4,
  },
  client_feedback: {
    label: "Retour Client",
    shortLabel: "Retour",
    icon: "💬",
    color: "bg-cyan-500",
    gradientFrom: "from-cyan-400",
    gradientTo: "to-cyan-600",
    textColor: "text-cyan-600",
    bgLight: "bg-cyan-50 dark:bg-cyan-950",
    ringColor: "ring-cyan-500",
    order: 5,
  },
  final_version: {
    label: "Version Finale",
    shortLabel: "Finale",
    icon: "🏆",
    color: "bg-emerald-500",
    gradientFrom: "from-emerald-400",
    gradientTo: "to-emerald-600",
    textColor: "text-emerald-600",
    bgLight: "bg-emerald-50 dark:bg-emerald-950",
    ringColor: "ring-emerald-500",
    order: 6,
  },
} as const;

type MilestoneStage = keyof typeof MILESTONE_CONFIG;
const MILESTONE_STAGES: MilestoneStage[] = [
  "audit_client",
  "production_v1",
  "production_v2",
  "implementation_client",
  "client_feedback",
  "final_version"
];

// ── Helpers ──────────────────────────────────────────────────────────────
const MONTHS_FR = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
const DAYS_FR = ["L", "M", "M", "J", "V", "S", "D"];

function daysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function firstDayOfMonth(y: number, m: number) { return (new Date(y, m, 1).getDay() + 6) % 7; }
function isToday(y: number, m: number, d: number) {
  const t = new Date();
  return t.getFullYear() === y && t.getMonth() === m && t.getDate() === d;
}

function daysUntil(dateStr: string | null | undefined): number {
  if (!dateStr) return 999;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  if (isNaN(target.getTime())) return 999;
  return Math.ceil((target.getTime() - now.getTime()) / 86400000);
}

function formatDateShort(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function formatDateForInput(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
}

interface ProjectDeadlineCalendarProps {
  project: Project;
  milestones: DeliveryMilestone[];
  currentMonth?: number;
  currentYear?: number;
  onMonthChange?: (month: number, year: number) => void;
  onMilestonesUpdate?: () => void;
}

export function ProjectDeadlineCalendar({
  project,
  milestones,
  currentMonth: propMonth,
  currentYear: propYear,
  onMonthChange,
  onMilestonesUpdate,
}: ProjectDeadlineCalendarProps) {
  const { toast } = useToast();
  const now = new Date();
  const month = propMonth ?? now.getMonth();
  const year = propYear ?? now.getFullYear();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<DeliveryMilestone | null>(null);
  const [editDate, setEditDate] = useState("");
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [milestoneDates, setMilestoneDates] = useState<Record<string, string>>({});
  const [showCalendar, setShowCalendar] = useState(false);

  // Sort milestones by order
  const sortedMilestones = useMemo(() => {
    return [...milestones]
      .filter(m => m.status !== "cancelled")
      .sort((a, b) => {
        const orderA = MILESTONE_CONFIG[a.stage as MilestoneStage]?.order || 0;
        const orderB = MILESTONE_CONFIG[b.stage as MilestoneStage]?.order || 0;
        return orderA - orderB;
      });
  }, [milestones]);

  // Calculate progress
  const completedCount = sortedMilestones.filter(m => m.status === "completed").length;
  const totalCount = sortedMilestones.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const overdueCount = sortedMilestones.filter(m =>
    m.status !== "completed" && daysUntil(m.plannedDate) < 0
  ).length;

  // Find current/next milestone
  const currentMilestone = sortedMilestones.find(m =>
    m.status !== "completed" && daysUntil(m.plannedDate) >= 0
  ) || sortedMilestones.find(m => m.status !== "completed");

  // Mutations
  const updateMilestoneMutation = useMutation({
    mutationFn: async ({ milestoneId, plannedDate }: { milestoneId: string; plannedDate: string }) => {
      return apiRequest("PATCH", `/api/milestones/${milestoneId}`, { plannedDate });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${project.id}/milestones`] });
      onMilestonesUpdate?.();
      setEditDialogOpen(false);
      setSelectedMilestone(null);
      toast({ title: "Date mise à jour", description: "La deadline a été modifiée." });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de mettre à jour.", variant: "destructive" });
    },
  });

  const generateMilestonesMutation = useMutation({
    mutationFn: async (dates: Record<string, string>) => {
      return apiRequest("POST", `/api/projects/${project.id}/milestones/generate`, {
        milestones: MILESTONE_STAGES.map(stage => ({
          stage,
          plannedDate: dates[stage] ? new Date(dates[stage]).toISOString() : null,
        })).filter(m => m.plannedDate),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${project.id}/milestones`] });
      onMilestonesUpdate?.();
      setGenerateDialogOpen(false);
      setMilestoneDates({});
      toast({ title: "Deadlines définies", description: "Les étapes ont été configurées." });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de créer les jalons.", variant: "destructive" });
    },
  });

  // Calendar helpers
  const days = daysInMonth(year, month);
  const offset = firstDayOfMonth(year, month);
  const cells: (number | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);

  const milestonesThisMonth = sortedMilestones.filter(m => {
    const d = new Date(m.plannedDate);
    return d.getMonth() === month && d.getFullYear() === year;
  });

  const getMilestonesForDay = (d: number): DeliveryMilestone[] => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    return milestonesThisMonth.filter(m => m.plannedDate.split("T")[0] === dateStr);
  };

  const handleEditMilestone = (milestone: DeliveryMilestone) => {
    setSelectedMilestone(milestone);
    setEditDate(formatDateForInput(milestone.plannedDate));
    setEditDialogOpen(true);
  };

  const handleOpenGenerateDialog = () => {
    const existing: Record<string, string> = {};
    milestones.forEach(m => {
      existing[m.stage] = formatDateForInput(m.plannedDate);
    });
    setMilestoneDates(existing);
    setGenerateDialogOpen(true);
  };

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="pb-2 bg-gradient-to-r from-primary/5 to-primary/10">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Flag className="h-4 w-4 text-primary" />
              Roadmap Projet
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setShowCalendar(!showCalendar)}
              >
                <Calendar className="h-3 w-3 mr-1" />
                {showCalendar ? "Masquer" : "Calendrier"}
              </Button>
              {sortedMilestones.length > 0 && (
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleOpenGenerateDialog}>
                  <Edit3 className="h-3 w-3 mr-1" />
                  Modifier
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          {/* Progress Bar XP Style */}
          {sortedMilestones.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-sm font-bold">
                    <Trophy className="h-4 w-4 text-amber-500" />
                    <span>{completedCount}/{totalCount}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">étapes complétées</span>
                </div>
                <div className="flex items-center gap-1">
                  {overdueCount > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {overdueCount} en retard
                    </Badge>
                  )}
                  <Badge variant="secondary" className="text-xs font-bold">
                    {progressPercent}%
                  </Badge>
                </div>
              </div>
              <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-emerald-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
                {/* Marqueurs d'étapes */}
                {sortedMilestones.map((_, idx) => (
                  <div
                    key={idx}
                    className="absolute top-0 bottom-0 w-0.5 bg-background/50"
                    style={{ left: `${((idx + 1) / totalCount) * 100}%` }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Roadmap Gamifiée */}
          {sortedMilestones.length > 0 ? (
            <div className="relative py-2">
              {/* Ligne de connexion */}
              <div className="absolute top-1/2 left-4 right-4 h-1 bg-muted rounded-full -translate-y-1/2" />
              <div
                className="absolute top-1/2 left-4 h-1 bg-gradient-to-r from-emerald-500 to-primary rounded-full -translate-y-1/2 transition-all duration-500"
                style={{ width: `calc(${(completedCount / totalCount) * 100}% - 16px)` }}
              />

              {/* Étapes */}
              <div className="relative flex justify-between">
                {sortedMilestones.map((milestone, idx) => {
                  const config = MILESTONE_CONFIG[milestone.stage as MilestoneStage];
                  const days = daysUntil(milestone.plannedDate);
                  const isCompleted = milestone.status === "completed";
                  const isOverdue = !isCompleted && days < 0;
                  const isUrgent = !isCompleted && !isOverdue && days <= 3;
                  const isCurrent = milestone.id === currentMilestone?.id;

                  return (
                    <Tooltip key={milestone.id}>
                      <TooltipTrigger asChild>
                        <motion.button
                          onClick={() => !isCompleted && handleEditMilestone(milestone)}
                          className="flex flex-col items-center gap-1 group"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          {/* Noeud */}
                          <motion.div
                            className={`
                              relative w-12 h-12 rounded-xl flex items-center justify-center text-lg
                              transition-all duration-300 cursor-pointer
                              ${isCompleted
                                ? "bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-500/30"
                                : isOverdue
                                  ? "bg-gradient-to-br from-red-400 to-red-600 text-white shadow-lg shadow-red-500/30 animate-pulse"
                                  : isUrgent
                                    ? "bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-lg shadow-orange-500/30"
                                    : isCurrent
                                      ? `bg-gradient-to-br ${config?.gradientFrom} ${config?.gradientTo} text-white shadow-lg ring-2 ring-offset-2 ${config?.ringColor}`
                                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                              }
                            `}
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ delay: idx * 0.1, type: "spring" }}
                          >
                            {isCompleted ? (
                              <Check className="h-6 w-6" />
                            ) : isOverdue ? (
                              <AlertTriangle className="h-5 w-5" />
                            ) : (
                              <span>{config?.icon}</span>
                            )}

                            {/* Badge compteur */}
                            {!isCompleted && (
                              <motion.div
                                className={`
                                  absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full
                                  flex items-center justify-center text-[10px] font-bold
                                  ${isOverdue
                                    ? "bg-red-500 text-white"
                                    : isUrgent
                                      ? "bg-orange-500 text-white"
                                      : days <= 7
                                        ? "bg-amber-500 text-white"
                                        : "bg-muted-foreground/20 text-muted-foreground"
                                  }
                                `}
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: idx * 0.1 + 0.2 }}
                              >
                                {isOverdue ? `+${Math.abs(days)}` : days}
                              </motion.div>
                            )}

                            {/* Étoile pour complété */}
                            {isCompleted && (
                              <motion.div
                                className="absolute -top-1 -right-1"
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ delay: 0.3, type: "spring" }}
                              >
                                <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                              </motion.div>
                            )}
                          </motion.div>

                          {/* Label */}
                          <span className={`
                            text-[10px] font-medium text-center max-w-[60px] leading-tight
                            ${isCompleted ? "text-emerald-600" : isOverdue ? "text-red-500" : "text-muted-foreground"}
                          `}>
                            {config?.shortLabel}
                          </span>

                          {/* Date */}
                          <span className={`
                            text-[9px]
                            ${isOverdue ? "text-red-500 font-semibold" : "text-muted-foreground"}
                          `}>
                            {formatDateShort(milestone.plannedDate)}
                          </span>
                        </motion.button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-center">
                        <p className="font-semibold">{config?.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {isCompleted
                            ? "✓ Terminé"
                            : isOverdue
                              ? `⚠️ ${Math.abs(days)} jours de retard`
                              : days === 0
                                ? "⚡ Aujourd'hui !"
                                : days === 1
                                  ? "📅 Demain"
                                  : `📅 Dans ${days} jours`
                          }
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-6 border-2 border-dashed rounded-xl bg-muted/20">
              <div className="text-4xl mb-2">🎯</div>
              <p className="text-sm text-muted-foreground mb-3">
                Définissez les deadlines de votre projet
              </p>
              <Button onClick={handleOpenGenerateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Configurer les étapes
              </Button>
            </div>
          )}

          {/* Mini Calendrier (optionnel) */}
          <AnimatePresence>
            {showCalendar && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="border rounded-lg p-3 mt-2">
                  <div className="flex items-center justify-between mb-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => {
                        const newMonth = month === 0 ? 11 : month - 1;
                        const newYear = month === 0 ? year - 1 : year;
                        onMonthChange?.(newMonth, newYear);
                      }}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium">{MONTHS_FR[month]} {year}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => {
                        const newMonth = month === 11 ? 0 : month + 1;
                        const newYear = month === 11 ? year + 1 : year;
                        onMonthChange?.(newMonth, newYear);
                      }}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-7 gap-0.5 mb-1">
                    {DAYS_FR.map((d, i) => (
                      <div key={i} className="text-center text-xs text-muted-foreground font-medium py-1">{d}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-0.5">
                    {cells.map((d, i) => {
                      if (!d) return <div key={`e${i}`} className="h-7" />;
                      const dayMilestones = getMilestonesForDay(d);
                      const today = isToday(year, month, d);
                      const hasOverdue = dayMilestones.some(m => m.status !== "completed" && daysUntil(m.plannedDate) < 0);
                      const hasCompleted = dayMilestones.some(m => m.status === "completed");

                      return (
                        <div
                          key={i}
                          className={`
                            relative h-7 flex items-center justify-center text-xs rounded
                            ${today ? "bg-primary text-primary-foreground font-bold" : ""}
                            ${hasOverdue && !today ? "bg-red-100 dark:bg-red-950 text-red-600" : ""}
                            ${hasCompleted && !hasOverdue && !today ? "bg-emerald-100 dark:bg-emerald-950" : ""}
                            ${dayMilestones.length > 0 && !hasOverdue && !hasCompleted && !today ? "bg-primary/10" : ""}
                          `}
                        >
                          {d}
                          {dayMilestones.length > 0 && (
                            <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                              {dayMilestones.slice(0, 2).map((m, j) => (
                                <div
                                  key={j}
                                  className={`w-1 h-1 rounded-full ${
                                    m.status === "completed" ? "bg-emerald-500" :
                                    daysUntil(m.plannedDate) < 0 ? "bg-red-500" : "bg-primary"
                                  }`}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Légende rapide */}
          {sortedMilestones.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground pt-2 border-t">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-gradient-to-br from-emerald-400 to-emerald-600" />
                <span>Fait</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-gradient-to-br from-red-400 to-red-600" />
                <span>Retard</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-gradient-to-br from-orange-400 to-orange-600" />
                <span>≤3j</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-muted" />
                <span>À venir</span>
              </div>
              <div className="flex items-center gap-1 ml-auto">
                <Zap className="h-3 w-3" />
                <span>Cliquer pour modifier</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedMilestone && (
                <>
                  <span className="text-xl">{MILESTONE_CONFIG[selectedMilestone.stage as MilestoneStage]?.icon}</span>
                  {MILESTONE_CONFIG[selectedMilestone.stage as MilestoneStage]?.label}
                </>
              )}
            </DialogTitle>
            <DialogDescription>Modifier la date de cette étape</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              type="date"
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
              className="text-lg"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Annuler</Button>
            <Button
              onClick={() => {
                if (selectedMilestone && editDate) {
                  updateMilestoneMutation.mutate({
                    milestoneId: selectedMilestone.id,
                    plannedDate: new Date(editDate).toISOString(),
                  });
                }
              }}
              disabled={!editDate || updateMilestoneMutation.isPending}
            >
              {updateMilestoneMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate Dialog */}
      <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-primary" />
              Configurer les deadlines
            </DialogTitle>
            <DialogDescription>Définissez la date limite pour chaque étape</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4 max-h-[400px] overflow-y-auto">
            {MILESTONE_STAGES.map((stage, idx) => {
              const config = MILESTONE_CONFIG[stage];
              const existingMilestone = milestones.find(m => m.stage === stage);
              const isCompleted = existingMilestone?.status === "completed";

              return (
                <motion.div
                  key={stage}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`
                    flex items-center gap-3 p-3 rounded-xl border-2 transition-all
                    ${isCompleted
                      ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"
                      : "bg-muted/30 border-transparent hover:border-primary/20"
                    }
                  `}
                >
                  <div className={`
                    w-10 h-10 rounded-lg flex items-center justify-center text-lg
                    ${isCompleted
                      ? "bg-emerald-500 text-white"
                      : `bg-gradient-to-br ${config.gradientFrom} ${config.gradientTo} text-white`
                    }
                  `}>
                    {isCompleted ? <Check className="h-5 w-5" /> : config.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${isCompleted ? "line-through text-muted-foreground" : ""}`}>
                      {config.label}
                    </p>
                    {isCompleted && <p className="text-xs text-emerald-600">✓ Terminé</p>}
                  </div>
                  <Input
                    type="date"
                    className="w-36"
                    value={milestoneDates[stage] || ""}
                    onChange={(e) => setMilestoneDates(prev => ({ ...prev, [stage]: e.target.value }))}
                    disabled={isCompleted}
                  />
                </motion.div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateDialogOpen(false)}>Annuler</Button>
            <Button
              onClick={() => {
                if (Object.values(milestoneDates).filter(Boolean).length > 0) {
                  generateMilestonesMutation.mutate(milestoneDates);
                }
              }}
              disabled={Object.values(milestoneDates).filter(Boolean).length === 0 || generateMilestonesMutation.isPending}
            >
              {generateMilestonesMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
