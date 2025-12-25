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
  MessageCircle,
  Mail,
  Building2,
  User,
  Send,
  SkipForward,
  AlertCircle,
  Pencil,
  Trash2,
  CalendarDays,
  LayoutGrid,
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

interface DBCalendarEvent {
  id: string;
  orgId: string;
  googleEventId: string;
  title: string;
  description: string | null;
  start: string;
  end: string;
  timezone: string | null;
  location: string | null;
  meetLink: string | null;
  status: 'confirmed' | 'tentative' | 'cancelled';
  attendees: string[];
  accountId: string | null;
  contactId: string | null;
  dealId: string | null;
  preConfirmationStatus: 'pending' | 'sent' | 'skipped' | 'failed';
  preConfirmationSentAt: string | null;
  reminderStatus: 'pending' | 'sent' | 'skipped' | 'failed';
  reminderSentAt: string | null;
  thankYouStatus: 'pending' | 'sent' | 'skipped' | 'failed';
  thankYouSentAt: string | null;
  lastSyncedAt: string | null;
  createdAt: string;
}

export default function Calendar() {
  const { toast } = useToast();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'calendar' | 'rdv'>('calendar');
  const [viewMode, setViewMode] = useState<'month' | 'day'>('month');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    start: '',
    end: '',
    location: '',
  });
  const [editEvent, setEditEvent] = useState({
    id: '',
    title: '',
    description: '',
    start: '',
    end: '',
    location: '',
  });

  const { data: calendarStatus, isLoading: isStatusLoading } = useQuery<CalendarStatus>({
    queryKey: ['/api/calendar/status'],
  });

  // DB synced events
  const { data: dbUpcomingEvents = [], refetch: refetchDbEvents } = useQuery<DBCalendarEvent[]>({
    queryKey: ['/api/calendar/db/upcoming'],
    enabled: calendarStatus?.connected === true,
  });

  const { data: dbPastEvents = [] } = useQuery<DBCalendarEvent[]>({
    queryKey: ['/api/calendar/db/past'],
    enabled: calendarStatus?.connected === true,
  });

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/calendar/sync', { daysAhead: 30 });
    },
    onSuccess: async (response) => {
      const result = await response.json();
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/db/upcoming'] });
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/db/past'] });
      toast({ 
        title: 'Synchronisation terminée', 
        description: `${result.synced} événement(s) synchronisé(s)` 
      });
    },
    onError: () => {
      toast({ title: 'Erreur', description: 'Échec de la synchronisation', variant: 'destructive' });
    },
  });

  // Update message status mutation
  const updateMessageStatusMutation = useMutation({
    mutationFn: async ({ eventId, messageType, status }: { eventId: string; messageType: string; status: string }) => {
      return apiRequest('PATCH', `/api/calendar/db/${eventId}/message-status`, { messageType, status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/db/upcoming'] });
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/db/past'] });
      toast({ title: 'Statut mis à jour' });
    },
    onError: () => {
      toast({ title: 'Erreur', description: 'Échec de la mise à jour', variant: 'destructive' });
    },
  });

  // Send meeting message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ eventId, messageType }: { eventId: string; messageType: string }) => {
      return apiRequest('POST', `/api/calendar/db/${eventId}/send-message`, { messageType, useAI: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/db/upcoming'] });
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/db/past'] });
      toast({ title: 'Message envoyé', description: 'Le message a été envoyé avec succès' });
    },
    onError: () => {
      toast({ title: 'Erreur', description: 'Échec de l\'envoi du message', variant: 'destructive' });
    },
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

  const updateEventMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; title?: string; description?: string; start?: string; end?: string; location?: string }) => {
      return apiRequest('PATCH', `/api/calendar/events/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/events'] });
      toast({ title: 'Événement modifié', description: 'L\'événement a été mis à jour' });
      setIsEditOpen(false);
      setEditEvent({ id: '', title: '', description: '', start: '', end: '', location: '' });
    },
    onError: () => {
      toast({ title: 'Erreur', description: 'Échec de la modification de l\'événement', variant: 'destructive' });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/calendar/events/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/events'] });
      toast({ title: 'Événement supprimé', description: 'L\'événement a été supprimé de votre calendrier' });
      setIsEditOpen(false);
    },
    onError: () => {
      toast({ title: 'Erreur', description: 'Échec de la suppression de l\'événement', variant: 'destructive' });
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

  const handleEditEvent = () => {
    if (!editEvent.title || !editEvent.start || !editEvent.end) {
      toast({ title: 'Erreur', description: 'Veuillez remplir tous les champs obligatoires', variant: 'destructive' });
      return;
    }
    updateEventMutation.mutate(editEvent);
  };

  const openEditDialog = (event: CalendarEvent) => {
    setEditEvent({
      id: event.id,
      title: event.title,
      description: event.description || '',
      start: event.start ? format(new Date(event.start), "yyyy-MM-dd'T'HH:mm") : '',
      end: event.end ? format(new Date(event.end), "yyyy-MM-dd'T'HH:mm") : '',
      location: event.location || '',
    });
    setIsEditOpen(true);
  };

  const goToPreviousDay = () => setSelectedDate(new Date(selectedDate.getTime() - 86400000));
  const goToNextDay = () => setSelectedDate(new Date(selectedDate.getTime() + 86400000));

  // Generate time slots for day view (6:00 - 22:00)
  const timeSlots = Array.from({ length: 17 }, (_, i) => i + 6);

  const getEventsAtHour = (hour: number) => {
    return selectedDayEvents.filter(event => {
      const eventStart = new Date(event.start);
      return eventStart.getHours() === hour;
    });
  };

  const getMessageStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'skipped':
        return <SkipForward className="h-4 w-4 text-muted-foreground" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getMessageStatusLabel = (status: string) => {
    switch (status) {
      case 'sent': return 'Envoyé';
      case 'skipped': return 'Ignoré';
      case 'failed': return 'Échec';
      default: return 'En attente';
    }
  };

  const renderDbEventCard = (event: DBCalendarEvent, isPast: boolean = false) => {
    const hasAccount = !!event.accountId;
    const hasContact = !!event.contactId;
    const canSendMessages = hasAccount || hasContact;

    return (
      <Card key={event.id} className="hover-elevate" data-testid={`card-event-${event.id}`}>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate">{event.title}</h3>
                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {format(new Date(event.start), 'd MMM HH:mm', { locale: fr })}
                  </span>
                  {event.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      <span className="truncate max-w-[150px]">{event.location}</span>
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {event.meetLink && (
                  <Badge variant="secondary">
                    <Video className="h-3 w-3 mr-1" />
                    Visio
                  </Badge>
                )}
                {event.status === 'cancelled' && (
                  <Badge variant="destructive">Annulé</Badge>
                )}
              </div>
            </div>

            {canSendMessages && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {hasAccount && (
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    Compte lié
                  </span>
                )}
                {hasContact && (
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    Contact lié
                  </span>
                )}
              </div>
            )}

            <div className="border-t pt-3 mt-1">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-4 text-xs">
                  {!isPast && (
                    <>
                      <div className="flex items-center gap-1" title="Pré-confirmation 48h avant">
                        {getMessageStatusIcon(event.preConfirmationStatus)}
                        <span>Confirmation</span>
                      </div>
                      <div className="flex items-center gap-1" title="Rappel 24h avant">
                        {getMessageStatusIcon(event.reminderStatus)}
                        <span>Rappel</span>
                      </div>
                    </>
                  )}
                  <div className="flex items-center gap-1" title="Remerciement après RDV">
                    {getMessageStatusIcon(event.thankYouStatus)}
                    <span>Remerciement</span>
                  </div>
                </div>
                
                {canSendMessages && (
                  <div className="flex items-center gap-1">
                    {isPast && event.thankYouStatus === 'pending' && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => sendMessageMutation.mutate({
                            eventId: event.id,
                            messageType: 'thankYou',
                          })}
                          disabled={sendMessageMutation.isPending}
                        >
                          <Send className="h-3 w-3 mr-1" />
                          Envoyer
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => updateMessageStatusMutation.mutate({
                            eventId: event.id,
                            messageType: 'thankYou',
                            status: 'skipped',
                          })}
                          disabled={updateMessageStatusMutation.isPending}
                        >
                          <SkipForward className="h-3 w-3 mr-1" />
                          Ignorer
                        </Button>
                      </>
                    )}
                    {!isPast && event.preConfirmationStatus === 'pending' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => sendMessageMutation.mutate({
                          eventId: event.id,
                          messageType: 'preConfirmation',
                        })}
                        disabled={sendMessageMutation.isPending}
                      >
                        <Send className="h-3 w-3 mr-1" />
                        Confirmation
                      </Button>
                    )}
                    {!isPast && event.reminderStatus === 'pending' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => sendMessageMutation.mutate({
                          eventId: event.id,
                          messageType: 'reminder',
                        })}
                        disabled={sendMessageMutation.isPending}
                      >
                        <Send className="h-3 w-3 mr-1" />
                        Rappel
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold" data-testid="text-page-title">Calendrier</h1>
          <p className="text-muted-foreground">Gérez vos rendez-vous et réunions</p>
        </div>
        <div className="flex items-center gap-2">
          {calendarStatus?.connected && (
            <>
              <div className="flex items-center border rounded-lg p-1">
                <Button
                  variant={viewMode === 'month' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('month')}
                  data-testid="button-view-month"
                >
                  <LayoutGrid className="h-4 w-4 mr-1" />
                  Mois
                </Button>
                <Button
                  variant={viewMode === 'day' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('day')}
                  data-testid="button-view-day"
                >
                  <CalendarDays className="h-4 w-4 mr-1" />
                  Jour
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending}
              >
                {syncMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Synchroniser
              </Button>
            </>
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

      {/* Edit Event Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier l'événement</DialogTitle>
            <DialogDescription>Modifiez les détails de votre rendez-vous</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Titre *</Label>
              <Input 
                id="edit-title" 
                value={editEvent.title} 
                onChange={(e) => setEditEvent(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Réunion client"
                data-testid="input-edit-event-title"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-start">Début *</Label>
                <Input 
                  id="edit-start" 
                  type="datetime-local"
                  value={editEvent.start} 
                  onChange={(e) => setEditEvent(prev => ({ ...prev, start: e.target.value }))}
                  data-testid="input-edit-event-start"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-end">Fin *</Label>
                <Input 
                  id="edit-end" 
                  type="datetime-local"
                  value={editEvent.end} 
                  onChange={(e) => setEditEvent(prev => ({ ...prev, end: e.target.value }))}
                  data-testid="input-edit-event-end"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-location">Lieu</Label>
              <Input 
                id="edit-location" 
                value={editEvent.location} 
                onChange={(e) => setEditEvent(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Bureau, Google Meet, etc."
                data-testid="input-edit-event-location"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea 
                id="edit-description" 
                value={editEvent.description} 
                onChange={(e) => setEditEvent(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Détails de l'événement..."
                data-testid="input-edit-event-description"
              />
            </div>
          </div>
          <DialogFooter className="flex justify-between gap-2">
            <Button
              variant="destructive"
              onClick={() => deleteEventMutation.mutate(editEvent.id)}
              disabled={deleteEventMutation.isPending}
            >
              {deleteEventMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Supprimer
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>Annuler</Button>
              <Button onClick={handleEditEvent} disabled={updateEventMutation.isPending}>
                {updateEventMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Pencil className="mr-2 h-4 w-4" />
                )}
                Enregistrer
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <>
      {viewMode === 'month' ? (
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
                      onClick={() => {
                        setSelectedDate(day);
                        setViewMode('day');
                      }}
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
      ) : (
        /* Day View */
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={goToPreviousDay}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="text-center">
                <h2 className="text-xl font-semibold capitalize">
                  {format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}
                </h2>
                {isToday(selectedDate) && (
                  <Badge variant="secondary" className="mt-1">Aujourd'hui</Badge>
                )}
              </div>
              <Button variant="ghost" size="icon" onClick={goToNextDay}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Aujourd'hui
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {timeSlots.map((hour) => {
                const eventsAtHour = getEventsAtHour(hour);
                return (
                  <div key={hour} className="flex gap-4 min-h-[60px] border-t py-2">
                    <div className="w-16 text-sm text-muted-foreground shrink-0">
                      {String(hour).padStart(2, '0')}:00
                    </div>
                    <div className="flex-1 space-y-1">
                      {eventsAtHour.map((event) => (
                        <div
                          key={event.id}
                          onClick={() => openEditDialog(event)}
                          className="p-3 rounded-lg bg-primary/10 border border-primary/20 cursor-pointer hover:bg-primary/20 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm">{event.title}</h4>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                <Clock className="h-3 w-3" />
                                <span>
                                  {format(new Date(event.start), 'HH:mm')} - {format(new Date(event.end), 'HH:mm')}
                                </span>
                              </div>
                              {event.location && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <MapPin className="h-3 w-3" />
                                  <span className="truncate">{event.location}</span>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              {isVideoCall(event) && (
                                <Badge variant="secondary" className="text-xs">
                                  <Video className="h-3 w-3" />
                                </Badge>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditDialog(event);
                                }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            {selectedDayEvents.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CalendarIcon className="h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">Aucun événement prévu ce jour</p>
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
            )}
          </CardContent>
        </Card>
      )}

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

      {calendarStatus?.connected && (dbUpcomingEvents.length > 0 || dbPastEvents.length > 0) && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-primary" />
                RDV à venir
              </CardTitle>
              <CardDescription>
                Événements synchronisés avec gestion des messages automatiques
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dbUpcomingEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CalendarIcon className="h-12 w-12 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Aucun RDV à venir</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Synchronisez vos événements pour les voir ici
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {dbUpcomingEvents.slice(0, 10).map((event) => renderDbEventCard(event, false))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                RDV passés
              </CardTitle>
              <CardDescription>
                Remerciements à envoyer après vos rendez-vous
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dbPastEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CalendarIcon className="h-12 w-12 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Aucun RDV passé récent</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {dbPastEvents.slice(0, 10).map((event) => renderDbEventCard(event, true))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
      </>
    </div>
  );
}
