import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Target,
  Layers,
  Clock,
  AlertTriangle,
  Flag,
  BarChart3,
  FolderKanban,
  CheckCircle2,
  Users,
  Building2,
  Loader2,
  Play,
  Check,
  Circle,
  ArrowRight,
  CalendarDays,
  Bell,
  MessageSquare,
  FileText,
  TrendingUp,
  Zap,
  Eye,
  Edit3,
  Plus,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Project, Task, Account, DeliveryMilestone, ProjectCalendarEvent } from "@/lib/types";

// ── Milestone Stage Config ──────────────────────────────────────────────
const MILESTONE_CONFIG = {
  audit_client: {
    label: "Audit Client",
    shortLabel: "Audit",
    icon: "🔍",
    color: "bg-blue-500",
    textColor: "text-blue-600",
    bgLight: "bg-blue-50 dark:bg-blue-950",
    description: "Audit et analyse des besoins client",
    order: 1,
  },
  production_v1: {
    label: "Production V1",
    shortLabel: "V1",
    icon: "🔧",
    color: "bg-amber-500",
    textColor: "text-amber-600",
    bgLight: "bg-amber-50 dark:bg-amber-950",
    description: "Première version de production",
    order: 2,
  },
  production_v2: {
    label: "Production V2",
    shortLabel: "V2",
    icon: "🔄",
    color: "bg-orange-500",
    textColor: "text-orange-600",
    bgLight: "bg-orange-50 dark:bg-orange-950",
    description: "Deuxième version avec corrections",
    order: 3,
  },
  implementation_client: {
    label: "Implémentation Client",
    shortLabel: "Implémentation",
    icon: "🚀",
    color: "bg-purple-500",
    textColor: "text-purple-600",
    bgLight: "bg-purple-50 dark:bg-purple-950",
    description: "Déploiement chez le client",
    order: 4,
  },
  client_feedback: {
    label: "Retour Client",
    shortLabel: "Retour",
    icon: "💬",
    color: "bg-cyan-500",
    textColor: "text-cyan-600",
    bgLight: "bg-cyan-50 dark:bg-cyan-950",
    description: "Collecte des retours client",
    order: 5,
  },
  final_version: {
    label: "Version Finale",
    shortLabel: "Finale",
    icon: "✅",
    color: "bg-emerald-500",
    textColor: "text-emerald-600",
    bgLight: "bg-emerald-50 dark:bg-emerald-950",
    description: "Version finale validée",
    order: 6,
  },
} as const;

type MilestoneStage = keyof typeof MILESTONE_CONFIG;
const MILESTONE_ORDER: MilestoneStage[] = ["audit_client", "production_v1", "production_v2", "implementation_client", "client_feedback", "final_version"];

// ── Status Config ───────────────────────────────────────────────────────
const statusConfig = {
  active: { label: "Actif", variant: "default" as const, color: "bg-emerald-500", dotColor: "bg-emerald-500" },
  on_hold: { label: "En pause", variant: "secondary" as const, color: "bg-amber-500", dotColor: "bg-amber-500" },
  completed: { label: "Terminé", variant: "outline" as const, color: "bg-blue-500", dotColor: "bg-blue-500" },
  cancelled: { label: "Annulé", variant: "destructive" as const, color: "bg-red-500", dotColor: "bg-red-500" },
  archived: { label: "Archivé", variant: "secondary" as const, color: "bg-slate-500", dotColor: "bg-slate-500" },
};

const milestoneStatusConfig = {
  pending: { label: "En attente", color: "text-slate-500", bgColor: "bg-slate-100 dark:bg-slate-800" },
  in_progress: { label: "En cours", color: "text-blue-500", bgColor: "bg-blue-100 dark:bg-blue-900" },
  completed: { label: "Terminé", color: "text-emerald-500", bgColor: "bg-emerald-100 dark:bg-emerald-900" },
  overdue: { label: "En retard", color: "text-red-500", bgColor: "bg-red-100 dark:bg-red-900" },
  cancelled: { label: "Annulé", color: "text-slate-400", bgColor: "bg-slate-100 dark:bg-slate-800" },
};

// ── Project Color Palette ────────────────────────────────────────────────
const PROJECT_COLORS = [
  { bg: "bg-violet-500", dot: "bg-violet-500", text: "text-violet-600", light: "bg-violet-100 dark:bg-violet-900", hex: "#8B5CF6" },
  { bg: "bg-sky-500", dot: "bg-sky-500", text: "text-sky-600", light: "bg-sky-100 dark:bg-sky-900", hex: "#0EA5E9" },
  { bg: "bg-rose-500", dot: "bg-rose-500", text: "text-rose-600", light: "bg-rose-100 dark:bg-rose-900", hex: "#F43F5E" },
  { bg: "bg-teal-500", dot: "bg-teal-500", text: "text-teal-600", light: "bg-teal-100 dark:bg-teal-900", hex: "#14B8A6" },
  { bg: "bg-orange-500", dot: "bg-orange-500", text: "text-orange-600", light: "bg-orange-100 dark:bg-orange-900", hex: "#F97316" },
  { bg: "bg-indigo-500", dot: "bg-indigo-500", text: "text-indigo-600", light: "bg-indigo-100 dark:bg-indigo-900", hex: "#6366F1" },
  { bg: "bg-pink-500", dot: "bg-pink-500", text: "text-pink-600", light: "bg-pink-100 dark:bg-pink-900", hex: "#EC4899" },
  { bg: "bg-lime-500", dot: "bg-lime-500", text: "text-lime-600", light: "bg-lime-100 dark:bg-lime-900", hex: "#84CC16" },
  { bg: "bg-cyan-500", dot: "bg-cyan-500", text: "text-cyan-600", light: "bg-cyan-100 dark:bg-cyan-900", hex: "#06B6D4" },
  { bg: "bg-fuchsia-500", dot: "bg-fuchsia-500", text: "text-fuchsia-600", light: "bg-fuchsia-100 dark:bg-fuchsia-900", hex: "#D946EF" },
];

function getProjectColor(index: number) {
  return PROJECT_COLORS[index % PROJECT_COLORS.length];
}

// ── Helpers ──────────────────────────────────────────────────────────────
const MONTHS_FR = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const DAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function daysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function firstDayOfMonth(y: number, m: number) { return (new Date(y, m, 1).getDay() + 6) % 7; }
function isToday(y: number, m: number, d: number) { const t = new Date(); return t.getFullYear() === y && t.getMonth() === m && t.getDate() === d; }
function formatDateShort(dateStr: string | null | undefined) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}
function formatDateFull(dateStr: string | null | undefined) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
function daysUntil(dateStr: string | null | undefined) {
  if (!dateStr) return 999;
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  if (isNaN(target.getTime())) return 999;
  return Math.ceil((target.getTime() - now.getTime()) / 86400000);
}
function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

// ── Milestone Badge ─────────────────────────────────────────────────────
const MilestoneBadge = ({ stage, status, size = "md" }: { stage: MilestoneStage; status?: string; size?: "sm" | "md" }) => {
  const config = MILESTONE_CONFIG[stage];
  const isCompleted = status === "completed";
  const isOverdue = status === "overdue";

  return (
    <Badge
      variant="outline"
      className={`
        ${config.bgLight} ${config.textColor} border-0
        ${size === "sm" ? "text-xs px-2 py-0.5" : "px-3 py-1"}
        ${isCompleted ? "opacity-60" : ""}
        ${isOverdue ? "ring-2 ring-red-500 ring-offset-1" : ""}
      `}
    >
      <span className="mr-1.5">{config.icon}</span>
      {size === "sm" ? config.shortLabel : config.label}
      {isCompleted && <Check className="h-3 w-3 ml-1" />}
    </Badge>
  );
};

// ── Interactive Workflow Pipeline ────────────────────────────────────────
const WorkflowPipeline = ({
  milestones,
  onMilestoneClick,
}: {
  milestones: DeliveryMilestone[];
  onMilestoneClick?: (milestone: DeliveryMilestone) => void;
}) => {
  const milestonesByStage = useMemo(() => {
    const map = new Map<MilestoneStage, DeliveryMilestone>();
    milestones.forEach(m => map.set(m.stage as MilestoneStage, m));
    return map;
  }, [milestones]);

  return (
    <div className="relative">
      {/* Connection line */}
      <div className="absolute top-8 left-0 right-0 h-0.5 bg-muted z-0" />

      <div className="relative flex justify-between">
        {MILESTONE_ORDER.map((stage, idx) => {
          const milestone = milestonesByStage.get(stage);
          const config = MILESTONE_CONFIG[stage];
          const isCompleted = milestone?.status === "completed";
          const isInProgress = milestone?.status === "in_progress";
          const isOverdue = milestone?.status === "overdue";
          const isPending = !milestone || milestone.status === "pending";
          const daysLeft = milestone ? daysUntil(milestone.plannedDate) : 999;

          return (
            <motion.div
              key={stage}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="flex flex-col items-center relative z-10"
            >
              {/* Milestone node */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => milestone && onMilestoneClick?.(milestone)}
                    className={`
                      w-16 h-16 rounded-2xl flex items-center justify-center text-2xl
                      transition-all duration-300 cursor-pointer
                      ${isCompleted ? `${config.color} text-white shadow-lg` : ""}
                      ${isInProgress ? `${config.bgLight} ring-2 ring-offset-2 ${config.color.replace("bg-", "ring-")} shadow-md` : ""}
                      ${isOverdue ? "bg-red-100 dark:bg-red-900 ring-2 ring-red-500 shadow-md" : ""}
                      ${isPending ? "bg-muted hover:bg-muted/80" : ""}
                      hover:scale-105 active:scale-95
                    `}
                  >
                    {isCompleted ? (
                      <Check className="h-8 w-8" />
                    ) : isOverdue ? (
                      <AlertTriangle className="h-7 w-7 text-red-500" />
                    ) : (
                      <span>{config.icon}</span>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="font-semibold">{config.label}</p>
                  <p className="text-xs text-muted-foreground">{config.description}</p>
                  {milestone && (
                    <div className="mt-2 text-xs">
                      <p>Date prévue: {formatDateShort(milestone.plannedDate)}</p>
                      {milestone.actualDate && <p>Date réelle: {formatDateShort(milestone.actualDate)}</p>}
                    </div>
                  )}
                </TooltipContent>
              </Tooltip>

              {/* Label */}
              <span className={`mt-2 text-xs font-medium text-center ${isCompleted ? "text-muted-foreground" : ""}`}>
                {config.shortLabel}
              </span>

              {/* Date */}
              {milestone && (
                <span className={`text-xs ${isOverdue ? "text-red-500 font-semibold" : "text-muted-foreground"}`}>
                  {formatDateShort(milestone.plannedDate)}
                </span>
              )}

              {/* Status indicator */}
              {milestone && !isCompleted && daysLeft <= 7 && daysLeft >= 0 && (
                <Badge variant="secondary" className="mt-1 text-xs bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                  J-{daysLeft}
                </Badge>
              )}
              {milestone && isOverdue && (
                <Badge variant="destructive" className="mt-1 text-xs">
                  +{Math.abs(daysLeft)}j retard
                </Badge>
              )}

              {/* Progress connector */}
              {idx < MILESTONE_ORDER.length - 1 && (
                <div
                  className={`absolute top-8 left-1/2 w-full h-0.5 ${isCompleted ? config.color : "bg-transparent"}`}
                  style={{ transform: "translateX(50%)" }}
                />
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

// ── Project Card with Milestones ────────────────────────────────────────
const ProjectMilestoneCard = ({
  project,
  milestones,
  tasks,
  onClick,
  projectColor,
}: {
  project: Project & { account?: Account };
  milestones: DeliveryMilestone[];
  tasks: Task[];
  onClick?: () => void;
  projectColor?: typeof PROJECT_COLORS[0];
}) => {
  const status = statusConfig[project.status];
  const completedMilestones = milestones.filter(m => m.status === "completed").length;
  const totalMilestones = milestones.length;
  const milestoneProgress = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;

  const nextMilestone = milestones
    .filter(m => m.status !== "completed")
    .sort((a, b) => new Date(a.plannedDate).getTime() - new Date(b.plannedDate).getTime())[0];

  const overdueMilestones = milestones.filter(m => m.status === "overdue").length;
  const completedTasks = tasks.filter(t => t.status === "completed").length;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className={`cursor-pointer overflow-hidden border-l-4 hover:shadow-lg transition-all ${projectColor ? projectColor.bg.replace("bg-", "border-l-") : status.color.replace("bg-", "border-l-")}`}
        onClick={onClick}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg truncate">{project.name}</CardTitle>
                {overdueMilestones > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {overdueMilestones} en retard
                  </Badge>
                )}
              </div>
              <CardDescription className="flex items-center gap-2 mt-1">
                <Building2 className="h-3 w-3" />
                {project.account?.name || "Client non assigné"}
              </CardDescription>
            </div>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Mini workflow */}
          <div className="flex items-center gap-1">
            {MILESTONE_ORDER.map((stage, idx) => {
              const milestone = milestones.find(m => m.stage === stage);
              const config = MILESTONE_CONFIG[stage];
              const isCompleted = milestone?.status === "completed";
              const isOverdue = milestone?.status === "overdue";

              return (
                <div key={stage} className="flex items-center">
                  <Tooltip>
                    <TooltipTrigger>
                      <div
                        className={`
                          w-6 h-6 rounded-lg flex items-center justify-center text-xs
                          ${isCompleted ? `${config.color} text-white` : ""}
                          ${isOverdue ? "bg-red-500 text-white" : ""}
                          ${!isCompleted && !isOverdue ? "bg-muted" : ""}
                        `}
                      >
                        {isCompleted ? <Check className="h-3 w-3" /> : isOverdue ? "!" : config.icon}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>{config.label}</TooltipContent>
                  </Tooltip>
                  {idx < MILESTONE_ORDER.length - 1 && (
                    <div className={`w-3 h-0.5 ${isCompleted ? config.color : "bg-muted"}`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Progress */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Progression jalons</span>
              <span className="font-medium">{completedMilestones}/{totalMilestones}</span>
            </div>
            <Progress value={milestoneProgress} className="h-2" />
          </div>

          {/* Next milestone */}
          {nextMilestone && (
            <div className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <span>{MILESTONE_CONFIG[nextMilestone.stage as MilestoneStage].icon}</span>
                <span className="font-medium">{MILESTONE_CONFIG[nextMilestone.stage as MilestoneStage].shortLabel}</span>
              </div>
              <span className={`text-xs ${daysUntil(nextMilestone.plannedDate) < 0 ? "text-red-500" : "text-muted-foreground"}`}>
                {formatDateShort(nextMilestone.plannedDate)}
              </span>
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {completedTasks}/{tasks.length} tâches
            </span>
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {formatDateShort(project.startDate)} - {formatDateShort(project.endDate)}
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// ── Calendar Grid ───────────────────────────────────────────────────────
const CalendarGrid = ({
  year,
  month,
  milestones,
  projectFilter,
  onDayClick,
  selectedDate,
}: {
  year: number;
  month: number;
  milestones: (DeliveryMilestone & { projectName: string; projectColor: string })[];
  projectFilter: string | null;
  onDayClick?: (date: string) => void;
  selectedDate: string | null;
}) => {
  const days = daysInMonth(year, month);
  const offset = firstDayOfMonth(year, month);
  const cells: (number | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);

  const getMilestonesForDay = (d: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    return milestones.filter(m => {
      const mDate = m.plannedDate.split("T")[0];
      return mDate === dateStr && (!projectFilter || m.projectId === projectFilter);
    });
  };

  return (
    <div className="grid grid-cols-7 gap-1">
      {DAYS_FR.map(d => (
        <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2">{d}</div>
      ))}
      {cells.map((d, i) => {
        if (!d) return <div key={`e${i}`} />;
        const dayMilestones = getMilestonesForDay(d);
        const today = isToday(year, month, d);
        const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const selected = selectedDate === dateStr;
        const hasOverdue = dayMilestones.some(m => m.status === "overdue");

        return (
          <div
            key={i}
            onClick={() => dayMilestones.length > 0 && onDayClick?.(dateStr)}
            className={`
              relative text-center p-2 rounded-lg text-sm transition-all min-h-[60px]
              ${dayMilestones.length ? "cursor-pointer hover:bg-accent" : ""}
              ${today ? "bg-primary text-primary-foreground font-bold" : ""}
              ${selected && !today ? "bg-accent ring-2 ring-primary" : ""}
              ${hasOverdue && !today ? "bg-red-50 dark:bg-red-950" : ""}
            `}
          >
            <span className={today ? "" : hasOverdue ? "text-red-600" : ""}>{d}</span>
            {dayMilestones.length > 0 && (
              <div className="flex flex-wrap gap-0.5 justify-center mt-1">
                {dayMilestones.slice(0, 3).map((m, j) => {
                  const config = MILESTONE_CONFIG[m.stage as MilestoneStage];
                  return (
                    <Tooltip key={j}>
                      <TooltipTrigger>
                        <div className={`w-2 h-2 rounded-full ${m.status === "completed" ? "bg-emerald-500" : m.status === "overdue" ? "bg-red-500" : m.projectColor}`} />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-medium">{config.label}</p>
                        <p className="text-xs">{m.projectName}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
                {dayMilestones.length > 3 && (
                  <span className="text-xs text-muted-foreground">+{dayMilestones.length - 3}</span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ── Milestone Detail Dialog ─────────────────────────────────────────────
const MilestoneDetailDialog = ({
  milestone,
  project,
  open,
  onOpenChange,
  onComplete,
}: {
  milestone: DeliveryMilestone | null;
  project: Project | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}) => {
  if (!milestone || !project) return null;

  const config = MILESTONE_CONFIG[milestone.stage as MilestoneStage];
  const statusCfg = milestoneStatusConfig[milestone.status as keyof typeof milestoneStatusConfig];
  const daysLeft = daysUntil(milestone.plannedDate);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${config.bgLight}`}>
              {config.icon}
            </div>
            <div>
              <DialogTitle>{config.label}</DialogTitle>
              <DialogDescription>{project.name}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Statut</p>
              <Badge className={`mt-1 ${statusCfg.bgColor} ${statusCfg.color} border-0`}>
                {statusCfg.label}
              </Badge>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Date prévue</p>
              <p className="font-semibold">{formatDateFull(milestone.plannedDate)}</p>
              {daysLeft < 0 && milestone.status !== "completed" && (
                <p className="text-xs text-red-500">En retard de {Math.abs(daysLeft)} jours</p>
              )}
              {daysLeft >= 0 && daysLeft <= 7 && milestone.status !== "completed" && (
                <p className="text-xs text-amber-500">Dans {daysLeft} jours</p>
              )}
            </div>
          </div>

          {milestone.actualDate && (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950">
              <p className="text-xs text-muted-foreground">Date de réalisation</p>
              <p className="font-semibold text-emerald-600">{formatDateFull(milestone.actualDate)}</p>
            </div>
          )}

          <div>
            <p className="text-sm text-muted-foreground">{config.description}</p>
          </div>

          {milestone.notes && (
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">Notes</p>
              <p className="text-sm">{milestone.notes}</p>
            </div>
          )}

          {milestone.status !== "completed" && (
            <Button onClick={onComplete} className="w-full">
              <Check className="h-4 w-4 mr-2" />
              Marquer comme terminé
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ── Main Component ──────────────────────────────────────────────────────
export default function CRMProjectManagement() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedMilestone, setSelectedMilestone] = useState<DeliveryMilestone | null>(null);
  const [milestoneDialogOpen, setMilestoneDialogOpen] = useState(false);

  // Fetch data
  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
  });

  const { data: allMilestones = [] } = useQuery<DeliveryMilestone[]>({
    queryKey: ["/api/milestones"],
  });

  // Complete milestone mutation
  const completeMilestoneMutation = useMutation({
    mutationFn: async (milestoneId: string) => {
      return apiRequest("POST", `/api/milestones/${milestoneId}/complete`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/milestones"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setMilestoneDialogOpen(false);
      setSelectedMilestone(null);
      toast({
        title: "Jalon terminé",
        description: "Le jalon a été marqué comme terminé avec succès.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de compléter le jalon.",
        variant: "destructive",
      });
    },
  });

  // Enrich projects with account info
  const enrichedProjects = useMemo(() => {
    return projects.map(p => ({
      ...p,
      account: accounts.find(a => a.id === p.accountId),
    }));
  }, [projects, accounts]);

  // Filter active projects
  const activeProjects = enrichedProjects.filter(p => p.status === "active" || p.status === "on_hold");

  // Stable color map: assign a unique color to each project
  const projectColorMap = useMemo(() => {
    const map = new Map<string, typeof PROJECT_COLORS[0]>();
    enrichedProjects.forEach((p, idx) => {
      map.set(p.id, getProjectColor(idx));
    });
    return map;
  }, [enrichedProjects]);

  // Milestones with project info for calendar
  const milestonesWithProject = useMemo(() => {
    return allMilestones.map(m => {
      const project = enrichedProjects.find(p => p.id === m.projectId);
      const pColor = projectColorMap.get(m.projectId) || PROJECT_COLORS[0];
      return {
        ...m,
        projectName: project?.name || "Projet inconnu",
        projectColor: pColor.dot,
      };
    });
  }, [allMilestones, enrichedProjects, projectColorMap]);

  // Milestones for selected date
  const milestonesForDate = useMemo(() => {
    if (!selectedDate) return [];
    return milestonesWithProject.filter(m => {
      const mDate = m.plannedDate.split("T")[0];
      return mDate === selectedDate && (!selectedProject || m.projectId === selectedProject);
    });
  }, [selectedDate, milestonesWithProject, selectedProject]);

  // Current selected project
  const currentProject = enrichedProjects.find(p => p.id === selectedProject);
  const projectMilestones = allMilestones.filter(m => m.projectId === selectedProject);
  const projectTasks = tasks.filter(t => t.projectId === selectedProject);

  // Stats
  const stats = useMemo(() => {
    const upcomingMilestones = allMilestones.filter(m => m.status !== "completed" && daysUntil(m.plannedDate) <= 14 && daysUntil(m.plannedDate) >= 0);
    const overdueMilestones = allMilestones.filter(m => m.status === "overdue" || (m.status !== "completed" && daysUntil(m.plannedDate) < 0));
    const completedMilestones = allMilestones.filter(m => m.status === "completed");

    return {
      activeProjects: activeProjects.length,
      overdueCount: overdueMilestones.length,
      upcomingCount: upcomingMilestones.length,
      completedCount: completedMilestones.length,
      totalMilestones: allMilestones.length,
      progress: allMilestones.length > 0 ? Math.round((completedMilestones.length / allMilestones.length) * 100) : 0,
    };
  }, [activeProjects, allMilestones]);

  // Navigation
  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  };

  if (projectsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            Gestion de Projets
          </h1>
          <p className="text-muted-foreground mt-1">
            Suivi des jalons et deadlines · Audit → V1 → V2 → Implémentation → Retour Client → Version Finale
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Layers className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.activeProjects}</p>
                <p className="text-xs text-muted-foreground">Projets actifs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={stats.overdueCount > 0 ? "bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20" : ""}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stats.overdueCount > 0 ? "bg-red-500/20" : "bg-muted"}`}>
                <AlertTriangle className={`h-5 w-5 ${stats.overdueCount > 0 ? "text-red-500" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.overdueCount}</p>
                <p className="text-xs text-muted-foreground">En retard</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={stats.upcomingCount > 0 ? "bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20" : ""}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stats.upcomingCount > 0 ? "bg-amber-500/20" : "bg-muted"}`}>
                <Clock className={`h-5 w-5 ${stats.upcomingCount > 0 ? "text-amber-500" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.upcomingCount}</p>
                <p className="text-xs text-muted-foreground">{"< 14 jours"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.completedCount}</p>
                <p className="text-xs text-muted-foreground">Jalons terminés</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.progress}%</p>
                <p className="text-xs text-muted-foreground">Progression</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workflow Legend */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center gap-3 overflow-x-auto">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider shrink-0">Workflow</span>
            {MILESTONE_ORDER.map((stage, idx) => {
              const config = MILESTONE_CONFIG[stage];
              return (
                <div key={stage} className="flex items-center shrink-0">
                  <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${config.bgLight}`}>
                    <span>{config.icon}</span>
                    <span className={`text-xs font-medium ${config.textColor}`}>{config.shortLabel}</span>
                  </div>
                  {idx < MILESTONE_ORDER.length - 1 && (
                    <ArrowRight className="h-4 w-4 mx-1 text-muted-foreground" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview" className="gap-2">
            <Layers className="h-4 w-4" />
            Vue d'ensemble
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-2">
            <CalendarIcon className="h-4 w-4" />
            Calendrier
          </TabsTrigger>
          <TabsTrigger value="projects" className="gap-2">
            <FolderKanban className="h-4 w-4" />
            Projets
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Projects with milestones */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FolderKanban className="h-5 w-5" />
                Projets en cours
              </h2>
              <div className="grid gap-4">
                {activeProjects.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <p className="text-muted-foreground">Aucun projet actif</p>
                    </CardContent>
                  </Card>
                ) : (
                  activeProjects.map(project => (
                    <ProjectMilestoneCard
                      key={project.id}
                      project={project}
                      milestones={allMilestones.filter(m => m.projectId === project.id)}
                      tasks={tasks.filter(t => t.projectId === project.id)}
                      onClick={() => navigate(`/projects/${project.id}`)}
                      projectColor={projectColorMap.get(project.id)}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Upcoming milestones */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Flag className="h-4 w-4 text-amber-500" />
                    Prochains jalons
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {allMilestones
                      .filter(m => m.status !== "completed")
                      .sort((a, b) => new Date(a.plannedDate).getTime() - new Date(b.plannedDate).getTime())
                      .slice(0, 5)
                      .map(m => {
                        const project = enrichedProjects.find(p => p.id === m.projectId);
                        const config = MILESTONE_CONFIG[m.stage as MilestoneStage];
                        const pColor = projectColorMap.get(m.projectId) || PROJECT_COLORS[0];
                        const dl = daysUntil(m.plannedDate);
                        const isOverdue = dl < 0;
                        const isUrgent = dl >= 0 && dl <= 7;

                        return (
                          <div
                            key={m.id}
                            onClick={() => {
                              setSelectedMilestone(m);
                              setMilestoneDialogOpen(true);
                            }}
                            className={`
                              p-3 rounded-lg border cursor-pointer hover:bg-accent transition-colors
                              ${isOverdue ? "border-red-500/50 bg-red-50 dark:bg-red-950" : ""}
                              ${isUrgent && !isOverdue ? "border-amber-500/50 bg-amber-50 dark:bg-amber-950" : ""}
                            `}
                          >
                            <div className="flex items-center gap-2">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.bgLight}`}>
                                {config.icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{config.shortLabel}</p>
                                <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                                  <span className={`w-1.5 h-1.5 rounded-full inline-block ${pColor.dot}`} />
                                  {project?.name}
                                </p>
                              </div>
                              <Badge variant={isOverdue ? "destructive" : isUrgent ? "secondary" : "outline"} className="shrink-0">
                                {isOverdue ? `+${Math.abs(dl)}j` : `J-${dl}`}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    {allMilestones.filter(m => m.status !== "completed").length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">Aucun jalon à venir</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Clients */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-blue-500" />
                    Clients actifs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {accounts
                      .filter(a => activeProjects.some(p => p.accountId === a.id))
                      .slice(0, 5)
                      .map(account => {
                        const projectCount = activeProjects.filter(p => p.accountId === account.id).length;
                        return (
                          <div
                            key={account.id}
                            onClick={() => navigate(`/accounts/${account.id}`)}
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent cursor-pointer transition-colors"
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">{getInitials(account.name)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{account.name}</p>
                              <p className="text-xs text-muted-foreground">{projectCount} projet{projectCount > 1 ? "s" : ""}</p>
                            </div>
                            <ExternalLink className="h-4 w-4 text-muted-foreground" />
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Calendar Tab */}
        <TabsContent value="calendar" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Button variant="ghost" size="icon" onClick={prevMonth}>
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <CardTitle>{MONTHS_FR[calMonth]} {calYear}</CardTitle>
                  <Button variant="ghost" size="icon" onClick={nextMonth}>
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <CalendarGrid
                  year={calYear}
                  month={calMonth}
                  milestones={milestonesWithProject}
                  projectFilter={selectedProject}
                  onDayClick={setSelectedDate}
                  selectedDate={selectedDate}
                />

                {/* Day Detail */}
                <AnimatePresence>
                  {selectedDate && milestonesForDate.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-6 pt-4 border-t"
                    >
                      <h3 className="font-semibold mb-3">
                        {new Date(selectedDate + "T00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                      </h3>
                      <div className="space-y-2">
                        {milestonesForDate.map(m => {
                          const config = MILESTONE_CONFIG[m.stage as MilestoneStage];
                          const mPColor = projectColorMap.get(m.projectId) || PROJECT_COLORS[0];
                          return (
                            <div
                              key={m.id}
                              onClick={() => {
                                setSelectedMilestone(m);
                                setMilestoneDialogOpen(true);
                              }}
                              className={`flex items-center gap-3 p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors border-l-3 ${mPColor.bg.replace("bg-", "border-l-")}`}
                            >
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${config.bgLight}`}>
                                {config.icon}
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-sm">{config.label}</p>
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <span className={`w-2 h-2 rounded-full inline-block ${mPColor.dot}`} />
                                  {m.projectName}
                                </p>
                              </div>
                              <Badge variant={m.status === "completed" ? "outline" : m.status === "overdue" ? "destructive" : "secondary"}>
                                {milestoneStatusConfig[m.status as keyof typeof milestoneStatusConfig]?.label || m.status}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>

            {/* Calendar sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Filtrer par projet</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Button
                      variant={selectedProject === null ? "secondary" : "ghost"}
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => setSelectedProject(null)}
                    >
                      Tous les projets
                    </Button>
                    {enrichedProjects.filter(p => p.status !== "archived").map(p => {
                      const pColor = projectColorMap.get(p.id) || PROJECT_COLORS[0];
                      return (
                        <Button
                          key={p.id}
                          variant={selectedProject === p.id ? "secondary" : "ghost"}
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => setSelectedProject(p.id)}
                        >
                          <div className={`w-3 h-3 rounded-full mr-2 flex-shrink-0 ${pColor.dot}`} />
                          <span className="truncate">{p.name}</span>
                        </Button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="py-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Couleurs projets</p>
                  <div className="space-y-2">
                    {enrichedProjects.filter(p => p.status !== "archived").map(p => {
                      const pColor = projectColorMap.get(p.id) || PROJECT_COLORS[0];
                      return (
                        <div key={p.id} className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${pColor.dot}`} />
                          <span className="text-xs truncate">{p.name}</span>
                        </div>
                      );
                    })}
                    <Separator className="my-2" />
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-500" />
                      <span className="text-xs">Terminé</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <span className="text-xs">En retard</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {enrichedProjects.filter(p => p.status !== "archived").map(project => (
              <ProjectMilestoneCard
                key={project.id}
                project={project}
                milestones={allMilestones.filter(m => m.projectId === project.id)}
                tasks={tasks.filter(t => t.projectId === project.id)}
                onClick={() => navigate(`/projects/${project.id}`)}
                projectColor={projectColorMap.get(project.id)}
              />
            ))}
            {enrichedProjects.length === 0 && (
              <div className="col-span-full">
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">Aucun projet trouvé</p>
                    <Button variant="outline" className="mt-4" onClick={() => navigate("/projects")}>
                      <Plus className="h-4 w-4 mr-2" />
                      Créer un projet
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Milestone Detail Dialog */}
      <MilestoneDetailDialog
        milestone={selectedMilestone}
        project={selectedMilestone ? enrichedProjects.find(p => p.id === selectedMilestone.projectId) || null : null}
        open={milestoneDialogOpen}
        onOpenChange={setMilestoneDialogOpen}
        onComplete={() => {
          if (selectedMilestone) {
            completeMilestoneMutation.mutate(selectedMilestone.id);
          }
        }}
      />
    </div>
  );
}
