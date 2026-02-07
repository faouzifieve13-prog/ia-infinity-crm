import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Users, Plus, Pencil, Trash2, Check, X, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { ROLE_CONFIG } from '@/components/vendors/VendorMultiSelect';
import type { Vendor, ProjectVendor, ProjectVendorRole } from '@/lib/types';

interface ProjectVendorsSectionProps {
  projectId: string;
  vendors: Vendor[];
}

function computeTotal(fixedPrice: string): number {
  return Number(fixedPrice) || 0;
}

function formatCurrency(value: number): string {
  return value.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function ProjectVendorsSection({ projectId, vendors }: ProjectVendorsSectionProps) {
  const { toast } = useToast();

  const { data: projectVendors = [], isLoading } = useQuery<(ProjectVendor & { vendor: Vendor })[]>({
    queryKey: [`/api/projects/${projectId}/vendors`],
    enabled: !!projectId,
  });

  // Add vendor state
  const [showAddForm, setShowAddForm] = useState(false);
  const [addVendorId, setAddVendorId] = useState('');
  const [addRole, setAddRole] = useState<ProjectVendorRole>('contributor');
  const [addEstimatedDays, setAddEstimatedDays] = useState('');
  const [addFixedPrice, setAddFixedPrice] = useState('');

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<ProjectVendorRole>('contributor');
  const [editEstimatedDays, setEditEstimatedDays] = useState('');
  const [editFixedPrice, setEditFixedPrice] = useState('');

  const invalidateVendors = () => {
    queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/vendors`] });
  };

  const addMutation = useMutation({
    mutationFn: async () => {
      const days = Number(addEstimatedDays) || 0;
      const price = Number(addFixedPrice) || 0;
      const computedDailyRate = days > 0 ? (price / days).toFixed(2) : '0';
      await apiRequest('POST', `/api/projects/${projectId}/vendors`, {
        vendorId: addVendorId,
        role: addRole,
        dailyRate: computedDailyRate,
        estimatedDays: days,
        fixedPrice: addFixedPrice || '0',
      });
    },
    onSuccess: () => {
      invalidateVendors();
      resetAddForm();
      toast({ title: 'Sous-traitant ajouté' });
    },
    onError: () => {
      toast({ title: 'Erreur', description: "Impossible d'ajouter le sous-traitant", variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      const days = Number(editEstimatedDays) || 0;
      const price = Number(editFixedPrice) || 0;
      const computedDailyRate = days > 0 ? (price / days).toFixed(2) : '0';
      await apiRequest('PATCH', `/api/project-vendors/${assignmentId}`, {
        role: editRole,
        dailyRate: computedDailyRate,
        estimatedDays: days,
        fixedPrice: editFixedPrice || '0',
      });
    },
    onSuccess: () => {
      invalidateVendors();
      setEditingId(null);
      toast({ title: 'Sous-traitant mis à jour' });
    },
    onError: () => {
      toast({ title: 'Erreur', description: 'Impossible de mettre à jour', variant: 'destructive' });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (vendorId: string) => {
      await apiRequest('DELETE', `/api/projects/${projectId}/vendors/${vendorId}`);
    },
    onSuccess: () => {
      invalidateVendors();
      toast({ title: 'Sous-traitant retiré' });
    },
    onError: () => {
      toast({ title: 'Erreur', description: 'Impossible de retirer le sous-traitant', variant: 'destructive' });
    },
  });

  const resetAddForm = () => {
    setShowAddForm(false);
    setAddVendorId('');
    setAddRole('contributor');
    setAddEstimatedDays('');
    setAddFixedPrice('');
  };

  const startEdit = (pv: ProjectVendor) => {
    setEditingId(pv.id);
    setEditRole(pv.role);
    setEditEstimatedDays(String(pv.estimatedDays || 0));
    setEditFixedPrice(pv.fixedPrice || '0');
  };

  const handleAddVendorChange = (vendorId: string) => {
    setAddVendorId(vendorId);
  };

  // Vendors not yet assigned to this project
  const assignedVendorIds = new Set(projectVendors.map(pv => pv.vendorId));
  const availableVendors = vendors.filter(v => !assignedVendorIds.has(v.id));

  const totalBudget = projectVendors.reduce((total, pv) => {
    return total + computeTotal(pv.fixedPrice);
  }, 0);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg">Sous-traitants</CardTitle>
          {projectVendors.length > 0 && (
            <Badge variant="secondary">{projectVendors.length}</Badge>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowAddForm(true)}
          disabled={showAddForm}
        >
          <Plus className="h-4 w-4 mr-1" />
          Ajouter
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Budget summary */}
        {projectVendors.length > 0 && (
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Budget sous-traitants total</span>
              <span className="text-lg font-bold">{formatCurrency(totalBudget)} &euro;</span>
            </div>
          </div>
        )}

        {/* Add vendor form */}
        {showAddForm && (
          <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Sous-traitant</label>
                <Select value={addVendorId} onValueChange={handleAddVendorChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableVendors.map(v => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name} {v.company ? `(${v.company})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Rôle</label>
                <Select value={addRole} onValueChange={(v: ProjectVendorRole) => setAddRole(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLE_CONFIG).map(([key, config]) => {
                      const Icon = config.icon;
                      return (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-3 w-3" />
                            {config.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Montant facturable (&euro;)</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={addFixedPrice}
                  onChange={e => setAddFixedPrice(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Durée de la mission (jours)</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={addEstimatedDays}
                  onChange={e => setAddEstimatedDays(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={resetAddForm}>
                Annuler
              </Button>
              <Button
                size="sm"
                onClick={() => addMutation.mutate()}
                disabled={!addVendorId || addMutation.isPending}
              >
                {addMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Ajouter
              </Button>
            </div>
          </div>
        )}

        {/* Vendor table */}
        {projectVendors.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sous-traitant</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead className="text-right">Montant (&euro;)</TableHead>
                  <TableHead className="text-right">Durée (j)</TableHead>
                  <TableHead className="w-[90px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projectVendors.map(pv => {
                  const isEditing = editingId === pv.id;
                  const roleConfig = ROLE_CONFIG[pv.role];
                  const total = computeTotal(pv.fixedPrice);

                  if (isEditing) {
                    return (
                      <TableRow key={pv.id}>
                        <TableCell className="font-medium">
                          {pv.vendor?.name || 'Inconnu'}
                        </TableCell>
                        <TableCell>
                          <Select value={editRole} onValueChange={(v: ProjectVendorRole) => setEditRole(v)}>
                            <SelectTrigger className="h-8 w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(ROLE_CONFIG).map(([key, config]) => {
                                const Icon = config.icon;
                                return (
                                  <SelectItem key={key} value={key}>
                                    <div className="flex items-center gap-2">
                                      <Icon className="h-3 w-3" />
                                      {config.label}
                                    </div>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            className="h-8 w-[110px] text-right"
                            value={editFixedPrice}
                            onChange={e => setEditFixedPrice(e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            className="h-8 w-[80px] text-right"
                            value={editEstimatedDays}
                            onChange={e => setEditEstimatedDays(e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => updateMutation.mutate(pv.id)}
                              disabled={updateMutation.isPending}
                            >
                              {updateMutation.isPending ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Check className="h-3.5 w-3.5 text-green-600" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setEditingId(null)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  }

                  return (
                    <TableRow key={pv.id}>
                      <TableCell>
                        <div>
                          <span className="font-medium">{pv.vendor?.name || 'Inconnu'}</span>
                          {pv.vendor?.company && (
                            <span className="text-muted-foreground text-xs ml-1">({pv.vendor.company})</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`text-xs ${roleConfig.color}`}>
                          {roleConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">{total > 0 ? formatCurrency(total) : '-'}</TableCell>
                      <TableCell className="text-right">{pv.estimatedDays > 0 ? `${pv.estimatedDays} j` : '-'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => startEdit(pv)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => removeMutation.mutate(pv.vendorId)}
                            disabled={removeMutation.isPending}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : !showAddForm ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            Aucun sous-traitant assigné. Cliquez sur Ajouter pour en affecter.
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
