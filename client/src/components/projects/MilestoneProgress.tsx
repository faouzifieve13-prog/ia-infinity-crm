/**
 * Milestone Progress Component
 * Affiche la progression des jalons d'un projet avec une timeline visuelle
 */

import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  XCircle,
  ArrowRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Milestone {
  id: string;
  stage: string;
  title: string;
  description: string | null;
  plannedDate: string;
  actualDate: string | null;
  status: "pending" | "in_progress" | "completed" | "overdue" | "cancelled";
  visibleToClient: boolean;
  visibleToVendor: boolean;
}

interface MilestoneStats {
  total: number;
  completed: number;
  pending: number;
  inProgress: number;
  overdue: number;
  progress: number;
}

interface MilestoneProgressProps {
  projectId: string;
  compact?: boolean;
}

// Mapping des statuts vers des icônes et couleurs
const statusConfig = {
  pending: {
    icon: Circle,
    color: "text-gray-400",
    bgColor: "bg-gray-100",
    label: "En attente",
  },
  in_progress: {
    icon: Clock,
    color: "text-blue-500",
    bgColor: "bg-blue-100",
    label: "En cours",
  },
  completed: {
    icon: CheckCircle2,
    color: "text-green-500",
    bgColor: "bg-green-100",
    label: "Terminé",
  },
  overdue: {
    icon: AlertTriangle,
    color: "text-red-500",
    bgColor: "bg-red-100",
    label: "En retard",
  },
  cancelled: {
    icon: XCircle,
    color: "text-gray-500",
    bgColor: "bg-gray-100",
    label: "Annulé",
  },
};

// Mapping des étapes vers des labels français
const stageLabels: Record<string, string> = {
  production_v1: "Production V1",
  delivery_v1_client: "Livraison V1",
  client_meeting: "RDV Client",
  retouches_v2: "Retouches V2",
  final_delivery: "Livraison Finale",
};

export function MilestoneProgress({ projectId, compact = false }: MilestoneProgressProps) {
  // Fetch des jalons
  const { data: milestones = [], isLoading: loadingMilestones } = useQuery<Milestone[]>({
    queryKey: ["/api/projects", projectId, "milestones"],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/milestones`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch milestones");
      return res.json();
    },
  });

  // Fetch des statistiques
  const { data: stats } = useQuery<MilestoneStats>({
    queryKey: ["/api/projects", projectId, "milestones", "stats"],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/milestones/stats`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch milestone stats");
      return res.json();
    },
  });

  if (loadingMilestones) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (milestones.length === 0) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-center text-muted-foreground">
            Aucun jalon défini pour ce projet.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Progression</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>
                {stats?.completed || 0} / {stats?.total || 0} jalons
              </span>
              <span className="font-medium">{stats?.progress || 0}%</span>
            </div>
            <Progress value={stats?.progress || 0} className="h-2" />
            {(stats?.overdue || 0) > 0 && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {stats?.overdue} jalon(s) en retard
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Suivi des Jalons</CardTitle>
          {stats && (
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="text-green-600">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {stats.completed} terminé(s)
              </Badge>
              {stats.overdue > 0 && (
                <Badge variant="destructive">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {stats.overdue} en retard
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Barre de progression globale */}
        {stats && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progression globale</span>
              <span className="font-medium">{stats.progress}%</span>
            </div>
            <Progress value={stats.progress} className="h-3" />
          </div>
        )}
      </CardHeader>

      <CardContent>
        {/* Timeline des jalons */}
        <div className="relative">
          {/* Ligne de connexion */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

          <div className="space-y-6">
            {milestones.map((milestone, index) => {
              const config = statusConfig[milestone.status];
              const Icon = config.icon;

              return (
                <div key={milestone.id} className="relative flex items-start gap-4">
                  {/* Icône du statut */}
                  <div
                    className={cn(
                      "relative z-10 flex items-center justify-center w-12 h-12 rounded-full",
                      config.bgColor
                    )}
                  >
                    <Icon className={cn("h-6 w-6", config.color)} />
                  </div>

                  {/* Contenu du jalon */}
                  <div className="flex-1 min-w-0 pb-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h4 className="font-medium">
                          {stageLabels[milestone.stage] || milestone.title}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {milestone.description || milestone.title}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <Badge
                          variant="outline"
                          className={cn(
                            "mb-1",
                            milestone.status === "completed" && "border-green-500 text-green-600",
                            milestone.status === "overdue" && "border-red-500 text-red-600",
                            milestone.status === "in_progress" && "border-blue-500 text-blue-600"
                          )}
                        >
                          {config.label}
                        </Badge>
                        <p className="text-xs text-muted-foreground">
                          {milestone.status === "completed" && milestone.actualDate
                            ? format(new Date(milestone.actualDate), "d MMM yyyy", { locale: fr })
                            : format(new Date(milestone.plannedDate), "d MMM yyyy", { locale: fr })}
                        </p>
                      </div>
                    </div>

                    {/* Indicateurs de visibilité */}
                    <div className="flex items-center gap-2 mt-2">
                      {milestone.visibleToClient && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                          Visible Client
                        </span>
                      )}
                      {milestone.visibleToVendor && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                          Visible Sous-traitant
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default MilestoneProgress;
