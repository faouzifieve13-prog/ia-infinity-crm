import { useState, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Calendar,
  AlertTriangle,
  Check,
  CheckCircle2,
  Pencil,
  Plus,
  Save,
  Loader2,
  Flag,
  Clock,
  X,
  ChevronLeft,
  ChevronRight,
  List,
  CalendarDays,
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
    icon: "🔍",
    dotColor: "bg-blue-500",
    order: 1,
  },
  production_v1: {
    label: "Production V1",
    icon: "🔧",
    dotColor: "bg-amber-500",
    order: 2,
  },
  production_v2: {
    label: "Production V2",
    icon: "🔄",
    dotColor: "bg-orange-500",
    order: 3,
  },
  implementation_client: {
    label: "Implémentation Client",
    icon: "🚀",
    dotColor: "bg-purple-500",
    order: 4,
  },
  client_feedback: {
    label: "Retour Client",
    icon: "💬",
    dotColor: "bg-cyan-500",
    order: 5,
  },
  final_version: {
    label: "Version Finale",
    icon: "🏆",
    dotColor: "bg-emerald-500",
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
  "final_version",
];

// ── Helpers ──────────────────────────────────────────────────────────────

const MONTHS_FR = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const DAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function daysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function firstDayOfMonth(y: number, m: number) { return (new Date(y, m, 1).getDay() + 6) % 7; }
function isSameDay(y: number, m: number, d: number) {
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

function formatDateFR(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function formatDateForInput(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
}

function getStatusBadge(milestone: DeliveryMilestone): { label: string; variant: "default" | "destructive" | "secondary" | "outline"; className?: string } {
  if (milestone.status === "completed") {
    return { label: "Terminé", variant: "default", className: "bg-emerald-600 hover:bg-emerald-700" };
  }
  const days = daysUntil(milestone.plannedDate);
  if (days < 0) {
    return { label: `En retard +${Math.abs(days)}j`, variant: "destructive" };
  }
  if (days === 0) {
    return { label: "Aujourd'hui", variant: "destructive", className: "bg-orange-600 hover:bg-orange-700" };
  }
  if (days === 1) {
    return { label: "Demain", variant: "destructive", className: "bg-orange-500 hover:bg-orange-600" };
  }
  if (days <= 3) {
    return { label: `J-${days}`, variant: "secondary", className: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" };
  }
  return { label: `J-${days}`, variant: "outline" };
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

  const [viewMode, setViewMode] = useState<"table" | "calendar">("table");
  const [calMonth, setCalMonth] = useState(propMonth ?? now.getMonth());
  const [calYear, setCalYear] = useState(propYear ?? now.getFullYear());
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState("");
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [milestoneDates, setMilestoneDates] = useState<Record<string, string>>({});

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

  // ── Mutations ──────────────────────────────────────────────────────────

  const updateMilestoneMutation = useMutation({
    mutationFn: async ({ milestoneId, plannedDate }: { milestoneId: string; plannedDate: string }) => {
      return apiRequest("PATCH", `/api/milestones/${milestoneId}`, { plannedDate });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${project.id}/milestones`] });
      onMilestonesUpdate?.();
      setEditingMilestoneId(null);
      setEditDate("");
      toast({ title: "Date mise à jour", description: "La deadline a été modifiée." });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de mettre à jour.", variant: "destructive" });
    },
  });

  const completeMilestoneMutation = useMutation({
    mutationFn: async (milestoneId: string) => {
      return apiRequest("POST", `/api/milestones/${milestoneId}/complete`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${project.id}/milestones`] });
      onMilestonesUpdate?.();
      toast({ title: "Étape terminée", description: "Le jalon a été marqué comme terminé." });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de valider l'étape.", variant: "destructive" });
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

  // ── Handlers ──────────────────────────────────────────────────────────

  const handleOpenGenerateDialog = () => {
    const existing: Record<string, string> = {};
    milestones.forEach(m => {
      existing[m.stage] = formatDateForInput(m.plannedDate);
    });
    setMilestoneDates(existing);
    setGenerateDialogOpen(true);
  };

  const startInlineEdit = (milestone: DeliveryMilestone) => {
    setEditingMilestoneId(milestone.id);
    setEditDate(formatDateForInput(milestone.plannedDate));
  };

  const cancelInlineEdit = () => {
    setEditingMilestoneId(null);
    setEditDate("");
  };

  const saveInlineEdit = (milestoneId: string) => {
    if (editDate) {
      updateMilestoneMutation.mutate({
        milestoneId,
        plannedDate: new Date(editDate).toISOString(),
      });
    }
  };

  const navigateMonth = (delta: number) => {
    let newMonth = calMonth + delta;
    let newYear = calYear;
    if (newMonth > 11) { newMonth = 0; newYear++; }
    if (newMonth < 0) { newMonth = 11; newYear--; }
    setCalMonth(newMonth);
    setCalYear(newYear);
    onMonthChange?.(newMonth, newYear);
  };

  // ── Calendar data ──────────────────────────────────────────────────────

  const days = daysInMonth(calYear, calMonth);
  const offset = firstDayOfMonth(calYear, calMonth);
  const cells: (number | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);

  const getMilestonesForDay = (d: number): DeliveryMilestone[] => {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    return sortedMilestones.filter(m => m.plannedDate?.split("T")[0] === dateStr);
  };

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Flag className="h-4 w-4 text-primary" />
              Roadmap Projet
            </CardTitle>
            <div className="flex items-center gap-1">
              {/* View toggle */}
              {sortedMilestones.length > 0 && (
                <div className="flex border rounded-md overflow-hidden mr-2">
                  <Button
                    variant={viewMode === "table" ? "default" : "ghost"}
                    size="sm"
                    className="h-7 px-2 rounded-none"
                    onClick={() => setViewMode("table")}
                  >
                    <List className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant={viewMode === "calendar" ? "default" : "ghost"}
                    size="sm"
                    className="h-7 px-2 rounded-none"
                    onClick={() => setViewMode("calendar")}
                  >
                    <CalendarDays className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={handleOpenGenerateDialog}
              >
                {sortedMilestones.length > 0 ? (
                  <>
                    <Pencil className="h-3 w-3 mr-1" />
                    Configurer
                  </>
                ) : (
                  <>
                    <Plus className="h-3 w-3 mr-1" />
                    Configurer
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {sortedMilestones.length > 0 ? (
            <>
              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {completedCount}/{totalCount} étapes terminées
                  </span>
                  <div className="flex items-center gap-2">
                    {overdueCount > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {overdueCount} en retard
                      </Badge>
                    )}
                    <span className="text-sm font-medium">{progressPercent}%</span>
                  </div>
                </div>
                <Progress value={progressPercent} className="h-2" />
              </div>

              {/* Table view */}
              {viewMode === "table" && (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50 border-b">
                        <th className="text-left font-medium px-3 py-2">Étape</th>
                        <th className="text-left font-medium px-3 py-2 hidden sm:table-cell">Date prévue</th>
                        <th className="text-center font-medium px-3 py-2">Statut</th>
                        <th className="text-right font-medium px-3 py-2 w-20">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedMilestones.map((milestone) => {
                        const config = MILESTONE_CONFIG[milestone.stage as MilestoneStage];
                        const isCompleted = milestone.status === "completed";
                        const isEditing = editingMilestoneId === milestone.id;
                        const badge = getStatusBadge(milestone);

                        return (
                          <tr
                            key={milestone.id}
                            className={`border-b last:border-b-0 ${
                              isCompleted ? "bg-emerald-50/50 dark:bg-emerald-950/20" : ""
                            } ${
                              !isCompleted && daysUntil(milestone.plannedDate) < 0
                                ? "bg-red-50/50 dark:bg-red-950/20"
                                : ""
                            }`}
                          >
                            {/* Stage name */}
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-2">
                                <span className="text-base">{config?.icon}</span>
                                <span className={`font-medium ${isCompleted ? "line-through text-muted-foreground" : ""}`}>
                                  {config?.label}
                                </span>
                              </div>
                            </td>

                            {/* Date */}
                            <td className="px-3 py-2.5 hidden sm:table-cell">
                              {isEditing ? (
                                <div className="flex items-center gap-1">
                                  <Input
                                    type="date"
                                    value={editDate}
                                    onChange={(e) => setEditDate(e.target.value)}
                                    className="h-7 w-36 text-xs"
                                  />
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => saveInlineEdit(milestone.id)}
                                    disabled={!editDate || updateMilestoneMutation.isPending}
                                  >
                                    {updateMilestoneMutation.isPending ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Save className="h-3 w-3 text-emerald-600" />
                                    )}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={cancelInlineEdit}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                  <Calendar className="h-3 w-3" />
                                  <span>{formatDateFR(milestone.plannedDate)}</span>
                                </div>
                              )}
                            </td>

                            {/* Status badge */}
                            <td className="px-3 py-2.5 text-center">
                              <Badge variant={badge.variant} className={`text-xs ${badge.className || ""}`}>
                                {isCompleted && <Check className="h-3 w-3 mr-1" />}
                                {!isCompleted && daysUntil(milestone.plannedDate) < 0 && <AlertTriangle className="h-3 w-3 mr-1" />}
                                {!isCompleted && daysUntil(milestone.plannedDate) >= 0 && daysUntil(milestone.plannedDate) <= 3 && <Clock className="h-3 w-3 mr-1" />}
                                {badge.label}
                              </Badge>
                            </td>

                            {/* Actions */}
                            <td className="px-3 py-2.5 text-right">
                              {!isCompleted && !isEditing && (
                                <div className="flex items-center justify-end gap-0.5">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                                        onClick={() => completeMilestoneMutation.mutate(milestone.id)}
                                        disabled={completeMilestoneMutation.isPending}
                                      >
                                        {completeMilestoneMutation.isPending ? (
                                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                          <CheckCircle2 className="h-3.5 w-3.5" />
                                        )}
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Marquer comme terminé</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() => startInlineEdit(milestone)}
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Modifier la date</TooltipContent>
                                  </Tooltip>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Calendar view */}
              {viewMode === "calendar" && (
                <div className="border rounded-lg p-3">
                  {/* Month navigation */}
                  <div className="flex items-center justify-between mb-3">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigateMonth(-1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-semibold">{MONTHS_FR[calMonth]} {calYear}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigateMonth(1)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Day headers */}
                  <div className="grid grid-cols-7 gap-1 mb-1">
                    {DAYS_FR.map((d, i) => (
                      <div key={i} className="text-center text-xs text-muted-foreground font-medium py-1">{d}</div>
                    ))}
                  </div>

                  {/* Calendar grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {cells.map((d, i) => {
                      if (!d) return <div key={`e${i}`} className="h-16" />;
                      const dayMilestones = getMilestonesForDay(d);
                      const today = isSameDay(calYear, calMonth, d);

                      return (
                        <div
                          key={i}
                          className={`
                            relative h-16 rounded-md border p-1 text-xs transition-colors
                            ${today ? "border-primary bg-primary/5" : "border-transparent hover:bg-muted/50"}
                            ${dayMilestones.length > 0 ? "bg-muted/30" : ""}
                          `}
                        >
                          <span className={`text-[11px] ${today ? "font-bold text-primary" : "text-muted-foreground"}`}>
                            {d}
                          </span>
                          <div className="mt-0.5 space-y-0.5 overflow-hidden">
                            {dayMilestones.map((m) => {
                              const cfg = MILESTONE_CONFIG[m.stage as MilestoneStage];
                              const isCompleted = m.status === "completed";
                              const isOverdue = !isCompleted && daysUntil(m.plannedDate) < 0;
                              return (
                                <Tooltip key={m.id}>
                                  <TooltipTrigger asChild>
                                    <div className={`
                                      flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] leading-tight truncate cursor-default
                                      ${isCompleted
                                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 line-through"
                                        : isOverdue
                                          ? "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300"
                                          : "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300"
                                      }
                                    `}>
                                      {isCompleted ? (
                                        <Check className="h-2.5 w-2.5 flex-shrink-0" />
                                      ) : (
                                        <div className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${cfg?.dotColor}`} />
                                      )}
                                      <span className="truncate">{cfg?.label}</span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">
                                    <p className="font-medium">{cfg?.icon} {cfg?.label}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {isCompleted
                                        ? "Terminé"
                                        : isOverdue
                                          ? `En retard de ${Math.abs(daysUntil(m.plannedDate))} jour(s)`
                                          : `Dans ${daysUntil(m.plannedDate)} jour(s)`
                                      }
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Legend */}
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <div className="w-2.5 h-2.5 rounded bg-emerald-100 dark:bg-emerald-900/50 border border-emerald-300 dark:border-emerald-700" />
                      Terminé
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2.5 h-2.5 rounded bg-blue-100 dark:bg-blue-900/50 border border-blue-300 dark:border-blue-700" />
                      À venir
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2.5 h-2.5 rounded bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-700" />
                      En retard
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 border-2 border-dashed rounded-lg">
              <Calendar className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-3">
                Aucune deadline configurée
              </p>
              <Button onClick={handleOpenGenerateDialog} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Configurer les étapes
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generate/Configure Dialog */}
      <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-primary" />
              Configurer les deadlines
            </DialogTitle>
            <DialogDescription>Définissez la date limite pour chaque étape du projet</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4 max-h-[400px] overflow-y-auto">
            {MILESTONE_STAGES.map((stage) => {
              const config = MILESTONE_CONFIG[stage];
              const existingMilestone = milestones.find(m => m.stage === stage);
              const isCompleted = existingMilestone?.status === "completed";

              return (
                <div
                  key={stage}
                  className={`
                    flex items-center gap-3 p-3 rounded-lg border transition-colors
                    ${isCompleted
                      ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"
                      : milestoneDates[stage]
                        ? "bg-primary/5 border-primary/20"
                        : "border-transparent hover:bg-muted/50"
                    }
                  `}
                >
                  <span className="text-xl w-8 text-center flex-shrink-0">
                    {isCompleted ? <Check className="h-5 w-5 text-emerald-600 mx-auto" /> : config.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${isCompleted ? "line-through text-muted-foreground" : ""}`}>
                      {config.label}
                    </p>
                    {isCompleted && <p className="text-xs text-emerald-600">Terminé</p>}
                  </div>
                  <Input
                    type="date"
                    className="w-40 h-8 text-sm"
                    value={milestoneDates[stage] || ""}
                    onChange={(e) => setMilestoneDates(prev => ({ ...prev, [stage]: e.target.value }))}
                    disabled={isCompleted}
                  />
                </div>
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
