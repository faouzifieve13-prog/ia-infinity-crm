import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Plus, Trash2, Pencil, CalendarDays, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { format, differenceInDays, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameMonth, isSameDay, isWithinInterval, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { VendorAvailabilityPeriod, VendorAvailability } from '@/lib/types';

const statusConfig: Record<VendorAvailability, { label: string; color: string; bgClass: string }> = {
  available: { label: 'Disponible', color: 'text-green-700 dark:text-green-400', bgClass: 'bg-green-100 dark:bg-green-900/20' },
  busy: { label: 'Occupe', color: 'text-yellow-700 dark:text-yellow-400', bgClass: 'bg-yellow-100 dark:bg-yellow-900/20' },
  unavailable: { label: 'Indisponible', color: 'text-red-700 dark:text-red-400', bgClass: 'bg-red-100 dark:bg-red-900/20' },
};

const dayLabels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

interface PeriodFormData {
  startDate: string;
  endDate: string;
  status: VendorAvailability;
  notes: string;
}

const emptyFormData: PeriodFormData = {
  startDate: '',
  endDate: '',
  status: 'available',
  notes: '',
};

export default function VendorAvailabilityPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<VendorAvailabilityPeriod | null>(null);
  const [formData, setFormData] = useState<PeriodFormData>(emptyFormData);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  // ── Queries ──────────────────────────────────────────────────────────

  const { data: periods = [], isLoading } = useQuery<VendorAvailabilityPeriod[]>({
    queryKey: ['/api/vendor/availabilities'],
  });

  // ── Mutations ────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: async (data: PeriodFormData) => {
      const response = await apiRequest('POST', '/api/vendor/availabilities', {
        startDate: data.startDate,
        endDate: data.endDate,
        status: data.status,
        notes: data.notes || null,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vendor/availabilities'] });
      closeDialog();
      toast({
        title: 'Periode ajoutee',
        description: 'Votre periode de disponibilite a ete ajoutee avec succes.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de creer la periode',
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: PeriodFormData }) => {
      const response = await apiRequest('PATCH', `/api/vendor/availabilities/${id}`, {
        startDate: data.startDate,
        endDate: data.endDate,
        status: data.status,
        notes: data.notes || null,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vendor/availabilities'] });
      closeDialog();
      toast({
        title: 'Periode modifiee',
        description: 'Votre periode de disponibilite a ete mise a jour.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de modifier la periode',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/vendor/availabilities/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vendor/availabilities'] });
      toast({
        title: 'Periode supprimee',
        description: 'La periode a ete supprimee.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de supprimer la periode',
        variant: 'destructive',
      });
    },
  });

  // ── Handlers ─────────────────────────────────────────────────────────

  function closeDialog() {
    setIsDialogOpen(false);
    setEditingPeriod(null);
    setFormData(emptyFormData);
  }

  function openCreateDialog() {
    setEditingPeriod(null);
    setFormData(emptyFormData);
    setIsDialogOpen(true);
  }

  function openEditDialog(period: VendorAvailabilityPeriod) {
    setEditingPeriod(period);
    setFormData({
      startDate: period.startDate.split('T')[0],
      endDate: period.endDate.split('T')[0],
      status: period.status,
      notes: period.notes || '',
    });
    setIsDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.startDate || !formData.endDate || !formData.status) {
      toast({
        title: 'Champs requis',
        description: 'Veuillez remplir la date de debut, la date de fin et le statut.',
        variant: 'destructive',
      });
      return;
    }
    if (formData.startDate > formData.endDate) {
      toast({
        title: 'Dates invalides',
        description: 'La date de debut doit etre anterieure a la date de fin.',
        variant: 'destructive',
      });
      return;
    }
    if (editingPeriod) {
      updateMutation.mutate({ id: editingPeriod.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  }

  function handleDelete(id: string) {
    if (window.confirm('Etes-vous sur de vouloir supprimer cette periode ?')) {
      deleteMutation.mutate(id);
    }
  }

  // ── Stats computation ────────────────────────────────────────────────

  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  function countFutureDays(status: VendorAvailability): number {
    let total = 0;
    for (const period of periods) {
      if (period.status !== status) continue;
      const start = period.startDate.split('T')[0];
      const end = period.endDate.split('T')[0];
      const effectiveStart = start >= todayStr ? start : todayStr;
      if (effectiveStart > end) continue;
      total += differenceInDays(parseISO(end), parseISO(effectiveStart)) + 1;
    }
    return total;
  }

  const availableDays = countFutureDays('available');
  const busyDays = countFutureDays('busy');
  const unavailableDays = countFutureDays('unavailable');

  // ── Mini calendar helpers ────────────────────────────────────────────

  const monthStart = startOfMonth(calendarMonth);
  const monthEnd = endOfMonth(calendarMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // getDay returns 0=Sunday ... 6=Saturday. We want Monday=0 ... Sunday=6.
  const startDayOfWeek = (getDay(monthStart) + 6) % 7;

  // Pad the beginning with days from the previous month
  const prevMonthEnd = new Date(monthStart);
  prevMonthEnd.setDate(prevMonthEnd.getDate() - 1);
  const paddingBefore: Date[] = [];
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = new Date(monthStart);
    d.setDate(d.getDate() - (i + 1));
    paddingBefore.push(d);
  }

  // Pad the end to complete the last week row
  const totalCells = paddingBefore.length + daysInMonth.length;
  const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  const paddingAfter: Date[] = [];
  for (let i = 1; i <= remainingCells; i++) {
    const d = new Date(monthEnd);
    d.setDate(d.getDate() + i);
    paddingAfter.push(d);
  }

  const allCalendarDays = [...paddingBefore, ...daysInMonth, ...paddingAfter];

  function getDayStatus(day: Date): VendorAvailability | null {
    for (const period of periods) {
      const start = parseISO(period.startDate.split('T')[0]);
      const end = parseISO(period.endDate.split('T')[0]);
      if (isSameDay(day, start) || isSameDay(day, end) || isWithinInterval(day, { start, end })) {
        return period.status;
      }
    }
    return null;
  }

  function getDayBgClass(day: Date): string {
    const status = getDayStatus(day);
    if (!status) return '';
    return statusConfig[status].bgClass;
  }

  // ── Render ───────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <CalendarDays className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Mes Disponibilites</h1>
          <p className="text-muted-foreground">Gerez vos periodes de disponibilite</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Ajouter une periode
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Jours disponibles</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">{availableDays}</div>
            <p className="text-xs text-muted-foreground">jours a venir</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Jours occupes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">{busyDays}</div>
            <p className="text-xs text-muted-foreground">jours a venir</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Jours indisponibles</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700 dark:text-red-400">{unavailableDays}</div>
            <p className="text-xs text-muted-foreground">jours a venir</p>
          </CardContent>
        </Card>
      </div>

      {/* Mini Calendar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Calendrier
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}>
                &larr;
              </Button>
              <span className="text-sm font-medium min-w-[140px] text-center">
                {format(calendarMonth, 'MMMM yyyy', { locale: fr })}
              </span>
              <Button variant="outline" size="sm" onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}>
                &rarr;
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Legend */}
          <div className="flex gap-4 mb-4 flex-wrap">
            {(Object.keys(statusConfig) as VendorAvailability[]).map((key) => (
              <div key={key} className="flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded-sm ${statusConfig[key].bgClass}`} />
                <span className={`text-xs ${statusConfig[key].color}`}>{statusConfig[key].label}</span>
              </div>
            ))}
          </div>

          {/* Day labels */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {dayLabels.map((label) => (
              <div key={label} className="text-center text-xs font-medium text-muted-foreground py-1">
                {label}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-1">
            {allCalendarDays.map((day, idx) => {
              const inCurrentMonth = isSameMonth(day, calendarMonth);
              const isToday = isSameDay(day, today);
              const dayBg = inCurrentMonth ? getDayBgClass(day) : '';

              return (
                <div
                  key={idx}
                  className={`
                    text-center text-xs py-1.5 rounded-sm
                    ${inCurrentMonth ? '' : 'text-muted-foreground/40'}
                    ${dayBg}
                    ${isToday ? 'ring-1 ring-primary font-bold' : ''}
                  `}
                >
                  {format(day, 'd')}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Periods Table */}
      {periods.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <CalendarDays className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">Aucune periode de disponibilite enregistree</p>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter votre premiere periode
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Periodes de disponibilite</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date de debut</TableHead>
                  <TableHead>Date de fin</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {periods.map((period) => {
                  const config = statusConfig[period.status];
                  return (
                    <TableRow key={period.id}>
                      <TableCell>
                        {format(parseISO(period.startDate), 'dd/MM/yyyy', { locale: fr })}
                      </TableCell>
                      <TableCell>
                        {format(parseISO(period.endDate), 'dd/MM/yyyy', { locale: fr })}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${config.bgClass} ${config.color} border-0`}>
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {period.notes || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(period)}
                            title="Modifier"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(period.id)}
                            disabled={deleteMutation.isPending}
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); else setIsDialogOpen(true); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingPeriod ? 'Modifier la periode' : 'Nouvelle periode'}
            </DialogTitle>
            <DialogDescription>
              {editingPeriod
                ? 'Modifiez les informations de cette periode de disponibilite.'
                : 'Ajoutez une nouvelle periode de disponibilite.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Date de debut *</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Date de fin *</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Statut *</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value as VendorAvailability })}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Selectionner un statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Disponible</SelectItem>
                  <SelectItem value="busy">Occupe</SelectItem>
                  <SelectItem value="unavailable">Indisponible</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Notes optionnelles..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {(createMutation.isPending || updateMutation.isPending)
                  ? 'Enregistrement...'
                  : editingPeriod
                    ? 'Enregistrer'
                    : 'Ajouter'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
