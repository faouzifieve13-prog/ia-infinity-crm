/**
 * Project Calendar Component
 * Affiche un calendrier interactif avec les jalons et événements du projet
 * Filtrés automatiquement selon le rôle de l'utilisateur (Admin, Client, Vendor)
 */

import { useState, useMemo, useCallback } from "react";
import { Calendar, dateFnsLocalizer, Views, type View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Check,
  Clock,
  AlertCircle,
  X,
  Video,
  FileText,
  Target
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

import "react-big-calendar/lib/css/react-big-calendar.css";

// Configuration du localizer français
const locales = { fr };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

// Types
interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  start: Date;
  end: Date;
  allDay: boolean;
  eventType: string;
  color: string;
  isCompleted: boolean;
  completedAt: Date | null;
  displayTitle: string;
  projectId?: string;
  projectName?: string;
}

interface ProjectCalendarProps {
  projectId?: string;
  showAllProjects?: boolean;
  height?: string;
}

// Mapping des couleurs
const colorMap: Record<string, string> = {
  blue: "#3B82F6",
  red: "#EF4444",
  yellow: "#F59E0B",
  green: "#10B981",
  gray: "#6B7280",
};

// Mapping des types d'événements vers des icônes
const eventTypeIcons: Record<string, typeof CalendarDays> = {
  meeting: Video,
  deadline_client: AlertCircle,
  deadline_internal: Clock,
  milestone: Target,
  delivery: FileText,
  reminder: Clock,
};

// Style personnalisé pour les événements
const eventStyleGetter = (event: CalendarEvent) => {
  const backgroundColor = colorMap[event.color] || colorMap.blue;

  return {
    style: {
      backgroundColor,
      borderRadius: "6px",
      opacity: event.isCompleted ? 0.7 : 1,
      color: "white",
      border: "none",
      textDecoration: event.isCompleted ? "line-through" : "none",
      padding: "2px 6px",
      fontSize: "12px",
      fontWeight: 500,
    },
  };
};

// Messages en français
const messages = {
  today: "Aujourd'hui",
  previous: "Précédent",
  next: "Suivant",
  month: "Mois",
  week: "Semaine",
  day: "Jour",
  agenda: "Agenda",
  date: "Date",
  time: "Heure",
  event: "Événement",
  noEventsInRange: "Aucun événement dans cette période",
};

export function ProjectCalendar({
  projectId,
  showAllProjects = false,
  height = "600px"
}: ProjectCalendarProps) {
  const [view, setView] = useState<View>(Views.MONTH);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Calculer la plage de dates pour la requête
  const dateRange = useMemo(() => {
    const start = startOfMonth(subMonths(currentDate, 1));
    const end = endOfMonth(addMonths(currentDate, 1));
    return { start, end };
  }, [currentDate]);

  // Fetch des événements
  const { data: events = [], isLoading } = useQuery({
    queryKey: showAllProjects
      ? ["/api/calendar/projects", dateRange.start.toISOString(), dateRange.end.toISOString()]
      : ["/api/projects", projectId, "calendar", dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams({
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString(),
      });

      const url = showAllProjects
        ? `/api/calendar/projects?${params}`
        : `/api/projects/${projectId}/calendar?${params}`;

      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch calendar events");
      return res.json();
    },
    enabled: showAllProjects || !!projectId,
  });

  // Mutation pour compléter un jalon
  const completeMutation = useMutation({
    mutationFn: async (milestoneId: string) => {
      const res = await fetch(`/api/milestones/${milestoneId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to complete milestone");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Jalon validé",
        description: "Le jalon a été marqué comme terminé",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/calendar"] });
      setSelectedEvent(null);
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de valider le jalon",
        variant: "destructive",
      });
    },
  });

  // Transformer les événements pour React Big Calendar
  const calendarEvents = useMemo(() => {
    return events.map((e: any) => ({
      ...e,
      start: new Date(e.start),
      end: new Date(e.end),
      title: e.displayTitle || e.title,
    }));
  }, [events]);

  // Navigation
  const handleNavigate = useCallback((action: "PREV" | "NEXT" | "TODAY") => {
    setCurrentDate((prev) => {
      switch (action) {
        case "PREV":
          return view === Views.MONTH ? subMonths(prev, 1) : new Date(prev.setDate(prev.getDate() - 7));
        case "NEXT":
          return view === Views.MONTH ? addMonths(prev, 1) : new Date(prev.setDate(prev.getDate() + 7));
        case "TODAY":
          return new Date();
        default:
          return prev;
      }
    });
  }, [view]);

  // Sélection d'un événement
  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event);
  }, []);

  // Rendu du titre de la toolbar personnalisée
  const formattedTitle = useMemo(() => {
    if (view === Views.MONTH) {
      return format(currentDate, "MMMM yyyy", { locale: fr });
    }
    return format(currentDate, "'Semaine du' d MMMM yyyy", { locale: fr });
  }, [currentDate, view]);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            {showAllProjects ? "Calendrier Projets" : "Calendrier du Projet"}
          </CardTitle>

          {/* Légende */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: colorMap.blue }} />
              <span>Meetings</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: colorMap.red }} />
              <span>Deadlines Client</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: colorMap.yellow }} />
              <span>Deadlines Internes</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: colorMap.green }} />
              <span>Terminé</span>
            </div>
          </div>
        </div>

        {/* Toolbar personnalisée */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleNavigate("PREV")}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleNavigate("TODAY")}
            >
              Aujourd'hui
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleNavigate("NEXT")}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <span className="ml-4 text-lg font-semibold capitalize">
              {formattedTitle}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={view === Views.MONTH ? "default" : "outline"}
              size="sm"
              onClick={() => setView(Views.MONTH)}
            >
              Mois
            </Button>
            <Button
              variant={view === Views.WEEK ? "default" : "outline"}
              size="sm"
              onClick={() => setView(Views.WEEK)}
            >
              Semaine
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div style={{ height }}>
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Calendar
              localizer={localizer}
              events={calendarEvents}
              startAccessor="start"
              endAccessor="end"
              style={{ height: "100%" }}
              view={view}
              onView={(newView) => setView(newView)}
              date={currentDate}
              onNavigate={setCurrentDate}
              eventPropGetter={eventStyleGetter}
              onSelectEvent={handleSelectEvent}
              messages={messages}
              culture="fr"
              toolbar={false}
              popup
              selectable={false}
            />
          )}
        </div>
      </CardContent>

      {/* Modal de détail de l'événement */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedEvent && (
                <>
                  {(() => {
                    const IconComponent = eventTypeIcons[selectedEvent.eventType] || CalendarDays;
                    return <IconComponent className="h-5 w-5" />;
                  })()}
                  {selectedEvent.title}
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedEvent && (
            <div className="space-y-4">
              {/* Badge de statut */}
              <div className="flex items-center gap-2">
                <Badge
                  variant={selectedEvent.isCompleted ? "default" : "secondary"}
                  className={selectedEvent.isCompleted ? "bg-green-500" : ""}
                >
                  {selectedEvent.isCompleted ? (
                    <>
                      <Check className="h-3 w-3 mr-1" />
                      Terminé
                    </>
                  ) : (
                    <>
                      <Clock className="h-3 w-3 mr-1" />
                      En attente
                    </>
                  )}
                </Badge>

                <Badge variant="outline">
                  {selectedEvent.eventType === "meeting" && "Réunion"}
                  {selectedEvent.eventType === "deadline_client" && "Deadline Client"}
                  {selectedEvent.eventType === "deadline_internal" && "Deadline Interne"}
                  {selectedEvent.eventType === "milestone" && "Jalon"}
                  {selectedEvent.eventType === "delivery" && "Livraison"}
                  {selectedEvent.eventType === "reminder" && "Rappel"}
                </Badge>
              </div>

              {/* Date */}
              <div>
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="font-medium">
                  {format(new Date(selectedEvent.start), "EEEE d MMMM yyyy", { locale: fr })}
                </p>
              </div>

              {/* Projet (si vue globale) */}
              {selectedEvent.projectName && (
                <div>
                  <p className="text-sm text-muted-foreground">Projet</p>
                  <p className="font-medium">{selectedEvent.projectName}</p>
                </div>
              )}

              {/* Description */}
              {selectedEvent.description && (
                <div>
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p className="text-sm">{selectedEvent.description}</p>
                </div>
              )}

              {/* Date de complétion */}
              {selectedEvent.isCompleted && selectedEvent.completedAt && (
                <div>
                  <p className="text-sm text-muted-foreground">Complété le</p>
                  <p className="text-sm">
                    {format(new Date(selectedEvent.completedAt), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedEvent(null)}>
              Fermer
            </Button>
            {selectedEvent && !selectedEvent.isCompleted && (
              <Button
                onClick={() => completeMutation.mutate(selectedEvent.id)}
                disabled={completeMutation.isPending}
              >
                {completeMutation.isPending ? (
                  "Validation..."
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Marquer comme terminé
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default ProjectCalendar;
