import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfDay, addMonths } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarDays, Clock, AlertCircle, Target, Video, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProjectCalendar } from "@/components/projects/ProjectCalendar";

const eventTypeLabels: Record<string, string> = {
  meeting: "Reunion",
  deadline_client: "Deadline Client",
  deadline_internal: "Deadline Interne",
  milestone: "Jalon",
  delivery: "Livraison",
  reminder: "Rappel",
};

const eventTypeColors: Record<string, string> = {
  meeting: "bg-blue-500",
  deadline_client: "bg-red-500",
  deadline_internal: "bg-yellow-500",
  milestone: "bg-purple-500",
  delivery: "bg-green-500",
  reminder: "bg-gray-500",
};

export default function ProjectsCalendar() {
  const now = useMemo(() => startOfDay(new Date()), []);
  const end = useMemo(() => addMonths(now, 3), [now]);

  const { data: events = [] } = useQuery({
    queryKey: ["/api/calendar/projects", now.toISOString(), end.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams({
        start: now.toISOString(),
        end: end.toISOString(),
      });
      const res = await fetch(`/api/calendar/projects?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch calendar events");
      return res.json();
    },
  });

  const upcomingEvents = useMemo(() => {
    return events
      .filter((e: any) => new Date(e.start) >= now && !e.isCompleted)
      .sort((a: any, b: any) => new Date(a.start).getTime() - new Date(b.start).getTime())
      .slice(0, 15);
  }, [events, now]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <CalendarDays className="h-6 w-6" />
          Calendrier Projets
        </h1>
        <p className="text-muted-foreground">
          Vue globale des jalons et deadlines de tous les projets
        </p>
      </div>

      <ProjectCalendar showAllProjects={true} height="550px" />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Prochaines echéances
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingEvents.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">
              Aucune echeance a venir
            </p>
          ) : (
            <div className="space-y-2">
              {upcomingEvents.map((event: any) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${eventTypeColors[event.eventType] || "bg-gray-400"}`}
                    />
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{event.title}</p>
                      {event.projectName && (
                        <p className="text-xs text-muted-foreground truncate">
                          {event.projectName}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <Badge variant="outline" className="text-xs">
                      {eventTypeLabels[event.eventType] || event.eventType}
                    </Badge>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(event.start), "d MMM yyyy", { locale: fr })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
