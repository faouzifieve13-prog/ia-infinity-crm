import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Video,
  Users,
  Plus,
  Loader2,
  ExternalLink,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
  attendees?: string[];
  htmlLink?: string;
  status?: string;
}

interface CalendarStatus {
  connected: boolean;
  email?: string;
  error?: string;
}

export default function Calendar() {
  const { toast } = useToast();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    start: '',
    end: '',
    location: '',
  });

  const { data: calendarStatus, isLoading: isStatusLoading } = useQuery<CalendarStatus>({
    queryKey: ['/api/calendar/status'],
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const { data: events = [], isLoading, refetch } = useQuery<CalendarEvent[]>({
    queryKey: ['/api/calendar/events', format(currentMonth, 'yyyy-MM')],
    queryFn: async () => {
      const timeMin = startOfMonth(currentMonth).toISOString();
      const timeMax = endOfMonth(addMonths(currentMonth, 1)).toISOString();
      const response = await fetch(`/api/calendar/events?timeMin=${timeMin}&timeMax=${timeMax}`);
      if (!response.ok) throw new Error('Failed to fetch events');
      return response.json();
    },
    enabled: calendarStatus?.connected === true,
  });

  const createEventMutation = useMutation({
    mutationFn: async (event: typeof newEvent) => {
      return apiRequest('POST', '/api/calendar/events', event);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/events'] });
      toast({ title: 'Événement créé', description: 'L\'événement a été ajouté à votre calendrier' });
      setIsCreateOpen(false);
      setNewEvent({ title: '', description: '', start: '', end: '', location: '' });
    },
    onError: () => {
      toast({ title: 'Erreur', description: 'Échec de la création de l\'événement', variant: 'destructive' });
    },
  });

  const calendarStart = startOfWeek(monthStart, { locale: fr });
  const calendarEnd = endOfWeek(monthEnd, { locale: fr });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToToday = () => {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
  };

  const getEventsForDay = (day: Date) => {
    return events.filter(event => isSameDay(new Date(event.start), day));
  };

  const selectedDayEvents = getEventsForDay(selectedDate);

  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  const isVideoCall = (event: CalendarEvent) => {
    return event.location?.toLowerCase().includes('meet') || 
           event.location?.toLowerCase().includes('zoom') ||
           event.location?.toLowerCase().includes('teams') ||
           event.htmlLink?.includes('meet.google.com');
  };

  const handleCreateEvent = () => {
    if (!newEvent.title || !newEvent.start || !newEvent.end) {
      toast({ title: 'Erreur', description: 'Veuillez remplir tous les champs obligatoires', variant: 'destructive' });
      return;
    }
    createEventMutation.mutate(newEvent);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold" data-testid="text-page-title">Calendrier</h1>
          <p className="text-muted-foreground">Gérez vos rendez-vous et réunions</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday}>
            Aujourd'hui
          </Button>
          {calendarStatus?.connected && (
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button disabled={!calendarStatus?.connected}>
                <Plus className="mr-2 h-4 w-4" />
                Nouveau RDV
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Créer un événement</DialogTitle>
                <DialogDescription>Ajoutez un nouveau rendez-vous à votre calendrier</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Titre *</Label>
                  <Input 
                    id="title" 
                    value={newEvent.title} 
                    onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Réunion client"
                    data-testid="input-event-title"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start">Début *</Label>
                    <Input 
                      id="start" 
                      type="datetime-local"
                      value={newEvent.start} 
                      onChange={(e) => setNewEvent(prev => ({ ...prev, start: e.target.value }))}
                      data-testid="input-event-start"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end">Fin *</Label>
                    <Input 
                      id="end" 
                      type="datetime-local"
                      value={newEvent.end} 
                      onChange={(e) => setNewEvent(prev => ({ ...prev, end: e.target.value }))}
                      data-testid="input-event-end"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Lieu</Label>
                  <Input 
                    id="location" 
                    value={newEvent.location} 
                    onChange={(e) => setNewEvent(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Bureau, Google Meet, etc."
                    data-testid="input-event-location"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea 
                    id="description" 
                    value={newEvent.description} 
                    onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Détails de l'événement..."
                    data-testid="input-event-description"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Annuler</Button>
                <Button onClick={handleCreateEvent} disabled={createEventMutation.isPending}>
                  {createEventMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  Créer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isStatusLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : calendarStatus?.connected ? (
        <Card className="bg-green-500/10 border-green-500/30">
          <CardContent className="flex items-center gap-3 py-4">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <div>
              <p className="font-medium text-green-500">Google Calendar connecté</p>
              <p className="text-sm text-muted-foreground">
                Synchronisé avec {calendarStatus.email || 'votre compte Google'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="flex items-center gap-3 py-4">
            <XCircle className="h-5 w-5 text-red-500" />
            <div>
              <p className="font-medium text-red-500">Google Calendar non connecté</p>
              <p className="text-sm text-muted-foreground">
                Connectez votre compte Google Calendar pour synchroniser vos événements.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={goToPreviousMonth}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <h2 className="text-xl font-semibold capitalize">
                {format(currentMonth, 'MMMM yyyy', { locale: fr })}
              </h2>
              <Button variant="ghost" size="icon" onClick={goToNextMonth}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-px bg-muted rounded-lg overflow-hidden">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="bg-background p-3 text-center text-sm font-medium text-muted-foreground"
                >
                  {day}
                </div>
              ))}
              {calendarDays.map((day, index) => {
                const dayEvents = getEventsForDay(day);
                const isSelected = isSameDay(day, selectedDate);
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isDayToday = isToday(day);

                return (
                  <button
                    key={index}
                    onClick={() => setSelectedDate(day)}
                    className={`
                      bg-background p-2 min-h-[80px] text-left transition-colors relative
                      hover:bg-muted/50
                      ${!isCurrentMonth ? 'text-muted-foreground/50' : ''}
                      ${isSelected ? 'ring-2 ring-primary ring-inset' : ''}
                    `}
                  >
                    <span
                      className={`
                        inline-flex items-center justify-center w-7 h-7 rounded-full text-sm
                        ${isDayToday ? 'bg-primary text-primary-foreground font-bold' : ''}
                      `}
                    >
                      {format(day, 'd')}
                    </span>
                    {dayEvents.length > 0 && (
                      <div className="mt-1 space-y-1">
                        {dayEvents.slice(0, 2).map((event) => (
                          <div
                            key={event.id}
                            className="text-xs p-1 rounded bg-primary/20 text-primary truncate"
                          >
                            {event.title}
                          </div>
                        ))}
                        {dayEvents.length > 2 && (
                          <div className="text-xs text-muted-foreground">
                            +{dayEvents.length - 2} autre(s)
                          </div>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              {format(selectedDate, 'EEEE d MMMM', { locale: fr })}
            </CardTitle>
            <CardDescription>
              {isToday(selectedDate) ? "Aujourd'hui" : format(selectedDate, 'yyyy', { locale: fr })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : selectedDayEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CalendarIcon className="h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">Aucun événement prévu</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-4" 
                  disabled={!calendarStatus?.connected}
                  onClick={() => setIsCreateOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter un RDV
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {selectedDayEvents.map((event) => (
                  <div
                    key={event.id}
                    className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-medium">{event.title}</h3>
                      {isVideoCall(event) && (
                        <Badge variant="secondary" className="shrink-0">
                          <Video className="h-3 w-3 mr-1" />
                          Visio
                        </Badge>
                      )}
                    </div>
                    <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>
                          {format(new Date(event.start), 'HH:mm')} - {format(new Date(event.end), 'HH:mm')}
                        </span>
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span>{event.location}</span>
                        </div>
                      )}
                      {event.attendees && event.attendees.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <span>{event.attendees.length} participant(s)</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Prochains rendez-vous</CardTitle>
          <CardDescription>Vos 5 prochains événements planifiés</CardDescription>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CalendarIcon className="h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">
                {calendarStatus?.connected 
                  ? "Aucun événement à venir" 
                  : "Connectez Google Calendar pour voir vos événements"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {events.slice(0, 5).map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <span className="text-lg font-bold">
                      {format(new Date(event.start), 'd')}
                    </span>
                    <span className="text-xs uppercase">
                      {format(new Date(event.start), 'MMM', { locale: fr })}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{event.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {format(new Date(event.start), 'HH:mm')}
                      </span>
                      {event.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {event.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isVideoCall(event) && (
                      <Badge variant="outline">
                        <Video className="h-3 w-3 mr-1" />
                        Visio
                      </Badge>
                    )}
                    {event.htmlLink && (
                      <Button variant="ghost" size="icon" asChild>
                        <a href={event.htmlLink} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
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
