import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Download, Loader2, FileSignature, ExternalLink, Calendar, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
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
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Contract, ContractStatus } from '@/lib/types';

const statusConfig: Record<ContractStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof CheckCircle2 }> = {
  draft: { label: 'Brouillon', variant: 'secondary', icon: Clock },
  pending_signature: { label: 'En attente de signature', variant: 'outline', icon: AlertCircle },
  signed: { label: 'Sign\u00e9', variant: 'default', icon: CheckCircle2 },
  active: { label: 'Actif', variant: 'default', icon: CheckCircle2 },
  completed: { label: 'Termin\u00e9', variant: 'secondary', icon: CheckCircle2 },
  cancelled: { label: 'Annul\u00e9', variant: 'destructive', icon: AlertCircle },
};

export default function VendorContracts() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ContractStatus | 'all'>('all');

  const { data: contracts = [], isLoading } = useQuery<Contract[]>({
    queryKey: ['/api/vendor/contracts'],
  });

  const filteredContracts = contracts.filter((contract) => {
    const matchesSearch =
      contract.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.contractNumber?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || contract.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeContracts = contracts.filter(c => c.status === 'active' || c.status === 'signed').length;
  const pendingContracts = contracts.filter(c => c.status === 'pending_signature').length;

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
          <h1 className="text-3xl font-semibold" data-testid="text-page-title">Mes Contrats</h1>
          <p className="text-muted-foreground">Consultez vos contrats et accords de prestation</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <FileSignature className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{contracts.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actifs</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeContracts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En attente</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingContracts}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un contrat..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
            data-testid="input-search-contracts"
          />
        </div>

        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ContractStatus | 'all')}>
          <SelectTrigger className="w-48" data-testid="select-status-filter">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="draft">Brouillon</SelectItem>
            <SelectItem value="pending_signature">En attente</SelectItem>
            <SelectItem value="signed">Sign\u00e9</SelectItem>
            <SelectItem value="active">Actif</SelectItem>
            <SelectItem value="completed">Termin\u00e9</SelectItem>
            <SelectItem value="cancelled">Annul\u00e9</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {contracts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileSignature className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Aucun contrat pour le moment</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Liste des contrats</CardTitle>
            <CardDescription>{filteredContracts.length} contrat(s)</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N\u00b0 Contrat</TableHead>
                  <TableHead>Titre</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date d\u00e9but</TableHead>
                  <TableHead>Date fin</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContracts.map((contract) => {
                  const StatusIcon = statusConfig[contract.status]?.icon || Clock;
                  return (
                    <TableRow key={contract.id}>
                      <TableCell className="font-medium">
                        {contract.contractNumber || '-'}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {contract.title || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {contract.type === 'service' ? 'Service' :
                           contract.type === 'nda' ? 'NDA' :
                           contract.type === 'employment' ? 'Emploi' :
                           contract.type === 'vendor' ? 'Prestataire' : contract.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {contract.startDate
                          ? format(new Date(contract.startDate), 'dd MMM yyyy', { locale: fr })
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        {contract.endDate
                          ? format(new Date(contract.endDate), 'dd MMM yyyy', { locale: fr })
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusConfig[contract.status]?.variant || 'secondary'}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusConfig[contract.status]?.label || contract.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {contract.pdfUrl && (
                            <Button
                              variant="ghost"
                              size="icon"
                              asChild
                            >
                              <a href={contract.pdfUrl} target="_blank" rel="noopener noreferrer" title="T\u00e9l\u00e9charger">
                                <Download className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                          {contract.status === 'pending_signature' && contract.signatureUrl && (
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                            >
                              <a href={contract.signatureUrl} target="_blank" rel="noopener noreferrer">
                                Signer
                              </a>
                            </Button>
                          )}
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
    </div>
  );
}
