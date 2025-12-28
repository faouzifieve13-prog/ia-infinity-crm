import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Download, Loader2, DollarSign, AlertCircle, Clock, CheckCircle2, FileText, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Invoice, InvoiceStatus } from '@/lib/types';

const statusConfig: Record<InvoiceStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Brouillon', variant: 'secondary' },
  sent: { label: 'Envoyée', variant: 'outline' },
  paid: { label: 'Payée', variant: 'default' },
  overdue: { label: 'En retard', variant: 'destructive' },
  cancelled: { label: 'Annulée', variant: 'secondary' },
};

export default function ClientInvoices() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');

  const { data: invoices = [], isLoading } = useQuery<Invoice[]>({
    queryKey: ['/api/client/invoices'],
  });

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch =
      invoice.invoiceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPaid = invoices.filter((i) => i.status === 'paid').reduce((sum, i) => sum + parseFloat(i.amount), 0);
  const totalPending = invoices.filter((i) => i.status === 'sent').reduce((sum, i) => sum + parseFloat(i.amount), 0);
  const totalOverdue = invoices.filter((i) => i.status === 'overdue').reduce((sum, i) => sum + parseFloat(i.amount), 0);
  const totalAmount = invoices.reduce((sum, i) => sum + parseFloat(i.amount), 0);

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
          <p className="text-muted-foreground">Consultez vos factures et leur statut de paiement</p>
        </div>

        <Button variant="outline" data-testid="button-export">
          <Download className="mr-2 h-4 w-4" />
          Exporter
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total"
          value={totalAmount}
          icon={DollarSign}
          format="currency"
        />
        <MetricCard
          title="Payées"
          value={totalPaid}
          icon={CheckCircle2}
          format="currency"
        />
        <MetricCard
          title="En attente"
          value={totalPending}
          icon={Clock}
          format="currency"
        />
        <MetricCard
          title="En retard"
          value={totalOverdue}
          icon={AlertCircle}
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
            <SelectItem value="sent">Envoyée</SelectItem>
            <SelectItem value="paid">Payée</SelectItem>
            <SelectItem value="overdue">En retard</SelectItem>
            <SelectItem value="cancelled">Annulée</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {invoices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Aucune facture pour le moment</p>
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
                  <TableHead>N° Facture</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Echéance</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
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
                    <TableCell>
                      {invoice.issueDate
                        ? format(new Date(invoice.issueDate), 'dd MMM yyyy', { locale: fr })
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      {invoice.dueDate
                        ? format(new Date(invoice.dueDate), 'dd MMM yyyy', { locale: fr })
                        : '-'
                      }
                    </TableCell>
                    <TableCell className="font-medium">
                      {parseFloat(invoice.amount).toLocaleString('fr-FR', {
                        style: 'currency',
                        currency: 'EUR'
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusConfig[invoice.status]?.variant || 'secondary'}>
                        {statusConfig[invoice.status]?.label || invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {invoice.pdfUrl && (
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                        >
                          <a href={invoice.pdfUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
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
