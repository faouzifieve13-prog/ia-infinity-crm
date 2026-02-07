import { useState, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Plus, Search, Loader2, Receipt, FileText, Upload, CheckCircle2, Clock, AlertCircle, Trash2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Invoice, InvoiceStatus, Project } from '@/lib/types';

const statusConfig: Record<InvoiceStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Brouillon', variant: 'secondary' },
  sent: { label: 'Envoy\u00e9e', variant: 'outline' },
  paid: { label: 'Pay\u00e9e', variant: 'default' },
  overdue: { label: 'En retard', variant: 'destructive' },
  cancelled: { label: 'Annul\u00e9e', variant: 'secondary' },
};

export default function VendorInvoices() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [fileData, setFileData] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    invoiceType: '',
    accountId: '',
    pdfUrl: '',
    projectId: '',
  });

  const { data: invoices = [], isLoading } = useQuery<Invoice[]>({
    queryKey: ['/api/vendor/invoices'],
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['/api/vendor/projects'],
  });

  const { data: accounts = [] } = useQuery<any[]>({
    queryKey: ['/api/vendor/accounts'],
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.includes('pdf') && !file.type.includes('image')) {
      toast({
        title: 'Type de fichier invalide',
        description: 'Seuls les PDF et images sont acceptés',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'Fichier trop volumineux',
        description: 'Le fichier ne doit pas dépasser 10MB',
        variant: 'destructive',
      });
      return;
    }

    setFileName(file.name);
    setUploading(true);

    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const base64Data = base64.split(',')[1]; // Remove prefix

        // Upload to server
        const response = await apiRequest('POST', '/api/vendor/invoices/upload', {
          fileData: base64Data,
          fileName: file.name,
          mimeType: file.type
        });

        const data = await response.json();
        if (response.ok) {
          setFileData(data.fileUrl);
          setFormData(prev => ({ ...prev, pdfUrl: data.fileUrl }));
          toast({
            title: 'Fichier uploadé',
            description: 'Votre fichier a été uploadé avec succès',
          });

          // Auto-analyze the invoice with AI
          setAnalyzing(true);
          try {
            const analyzeResponse = await apiRequest('POST', '/api/vendor/invoices/analyze', {
              fileData: base64Data,
              mimeType: file.type,
            });
            const analysis = await analyzeResponse.json();
            if (analyzeResponse.ok && analysis) {
              setFormData(prev => ({
                ...prev,
                pdfUrl: data.fileUrl,
                description: analysis.description || prev.description,
                amount: analysis.amount ? String(analysis.amount) : prev.amount,
                invoiceType: analysis.invoiceType || prev.invoiceType,
              }));
              toast({
                title: 'Analyse IA terminée',
                description: 'Les champs ont été pré-remplis automatiquement',
              });
            }
          } catch (analyzeError) {
            // Analysis is optional, don't block the flow
            console.error('Invoice analysis failed:', analyzeError);
          } finally {
            setAnalyzing(false);
          }
        } else {
          toast({
            title: 'Erreur d\'upload',
            description: data.error || 'Échec de l\'upload',
            variant: 'destructive',
          });
        }
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Erreur lors de l\'upload du fichier',
        variant: 'destructive',
      });
      setUploading(false);
    }
  };

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest('POST', '/api/vendor/invoices', {
        description: data.description,
        amount: parseFloat(data.amount),
        invoiceType: data.invoiceType,
        accountId: data.accountId,
        pdfUrl: data.pdfUrl,
        projectId: data.projectId || undefined,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vendor/invoices'] });
      setIsDialogOpen(false);
      setFormData({ description: '', amount: '', invoiceType: '', accountId: '', pdfUrl: '', projectId: '' });
      setFileData(null);
      setFileName('');
      toast({
        title: 'Facture soumise',
        description: 'Votre facture a \u00e9t\u00e9 soumise avec succ\u00e8s.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de soumettre la facture',
        variant: 'destructive',
      });
    },
  });

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch =
      invoice.invoiceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalAmount = invoices.reduce((sum, i) => sum + parseFloat(i.amount || '0'), 0);
  const paidAmount = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + parseFloat(i.amount || '0'), 0);
  const pendingAmount = invoices.filter(i => i.status === 'sent').reduce((sum, i) => sum + parseFloat(i.amount || '0'), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description || !formData.amount || !formData.invoiceType || !formData.accountId || !formData.pdfUrl) {
      toast({
        title: 'Champs requis',
        description: 'Tous les champs sont obligatoires (description, montant, nature, client, fichier).',
        variant: 'destructive',
      });
      return;
    }
    createMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold" data-testid="text-page-title">Mes Factures</h1>
          <p className="text-muted-foreground">G\u00e9rez et soumettez vos factures de prestation</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-invoice">
              <Plus className="mr-2 h-4 w-4" />
              Soumettre une facture
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nouvelle Facture</DialogTitle>
              <DialogDescription>
                Soumettez une facture pour vos prestations.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              {/* Upload de fichier */}
              <div className="space-y-2">
                <Label htmlFor="file">Fichier de facture (PDF/Image) *</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".pdf,image/*"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  required
                />
                {uploading && <p className="text-sm text-gray-500">Upload en cours...</p>}
                {analyzing && (
                  <div className="flex items-center gap-2 text-sm text-violet-600">
                    <Sparkles className="h-4 w-4 animate-pulse" />
                    Analyse IA en cours...
                  </div>
                )}
                {fileName && !uploading && !analyzing && <p className="text-sm text-green-600">&#10003; {fileName}</p>}
              </div>

              {/* Description/Objet */}
              <div className="space-y-2">
                <Label htmlFor="description">Objet de la facture *</Label>
                <Input
                  id="description"
                  placeholder="Ex: D\u00e9veloppement module X"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>

              {/* Montant */}
              <div className="space-y-2">
                <Label htmlFor="amount">Montant HT (\u20ac) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="1500.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                />
              </div>

              {/* Nature */}
              <div className="space-y-2">
                <Label htmlFor="invoiceType">Nature *</Label>
                <Select
                  value={formData.invoiceType}
                  onValueChange={(value) => setFormData({ ...formData, invoiceType: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="S\u00e9lectionner la nature" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prestation">Prestation</SelectItem>
                    <SelectItem value="materiel">Mat\u00e9riel</SelectItem>
                    <SelectItem value="frais">Frais</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Client \u00e0 facturer */}
              <div className="space-y-2">
                <Label htmlFor="accountId">Client \u00e0 facturer *</Label>
                <Select
                  value={formData.accountId}
                  onValueChange={(value) => setFormData({ ...formData, accountId: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="S\u00e9lectionner un client" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Projet (optionnel) */}
              {projects.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="project">Projet (optionnel)</Label>
                  <Select
                    value={formData.projectId || 'none'}
                    onValueChange={(v) => setFormData({ ...formData, projectId: v === 'none' ? '' : v })}
                  >
                    <SelectTrigger id="project">
                      <SelectValue placeholder="S\u00e9lectionner un projet" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun projet</SelectItem>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={!fileData || uploading || createMutation.isPending}>
                  {createMutation.isPending ? 'Envoi...' : 'Envoyer la facture'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Total factur\u00e9"
          value={totalAmount}
          icon={Receipt}
          format="currency"
        />
        <MetricCard
          title="Pay\u00e9"
          value={paidAmount}
          icon={CheckCircle2}
          format="currency"
        />
        <MetricCard
          title="En attente"
          value={pendingAmount}
          icon={Clock}
          format="currency"
        />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une facture..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
            data-testid="input-search-invoices"
          />
        </div>

        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as InvoiceStatus | 'all')}>
          <SelectTrigger className="w-40" data-testid="select-status-filter">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="draft">Brouillon</SelectItem>
            <SelectItem value="sent">Envoy\u00e9e</SelectItem>
            <SelectItem value="paid">Pay\u00e9e</SelectItem>
            <SelectItem value="overdue">En retard</SelectItem>
            <SelectItem value="cancelled">Annul\u00e9e</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {invoices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">Aucune facture soumise</p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Soumettre votre premi\u00e8re facture
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Historique des factures</CardTitle>
            <CardDescription>{filteredInvoices.length} facture(s)</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N\u00b0 Facture</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>\u00c9ch\u00e9ance</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date de paiement</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">
                      {invoice.invoiceNumber || '-'}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {invoice.description || '-'}
                    </TableCell>
                    <TableCell className="font-medium">
                      {parseFloat(invoice.amount || '0').toLocaleString('fr-FR', {
                        style: 'currency',
                        currency: 'EUR'
                      })}
                    </TableCell>
                    <TableCell>
                      {invoice.dueDate
                        ? format(new Date(invoice.dueDate), 'dd MMM yyyy', { locale: fr })
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusConfig[invoice.status]?.variant || 'secondary'}>
                        {statusConfig[invoice.status]?.label || invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {invoice.paidDate
                        ? format(new Date(invoice.paidDate), 'dd MMM yyyy', { locale: fr })
                        : '-'
                      }
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
