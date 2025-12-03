import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { RefreshCw, Database, Users, Receipt, Check, AlertCircle, Loader2, ArrowRight, Settings2 } from 'lucide-react';
import { SiNotion } from 'react-icons/si';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface NotionDatabase {
  id: string;
  title: string;
}

interface ImportJob {
  id: string;
  source: string;
  status: string;
  totalRecords: number;
  processedRecords: number;
  errorCount: number;
  startedAt: string;
  completedAt?: string;
  errors?: string;
}

interface SyncResult {
  success: boolean;
  importJobId: string;
  totalProcessed: number;
  errorCount: number;
  errors: string[];
}

export default function NotionSync() {
  const { toast } = useToast();
  const [accountsDbId, setAccountsDbId] = useState<string>('');
  const [expensesDbId, setExpensesDbId] = useState<string>('');

  const { data: databases = [], isLoading: isDatabasesLoading, error: databasesError } = useQuery<NotionDatabase[]>({
    queryKey: ['/api/notion/databases'],
    retry: false,
  });

  const { data: importJobs = [], isLoading: isJobsLoading } = useQuery<ImportJob[]>({
    queryKey: ['/api/notion/sync/jobs'],
  });

  const syncAccountsMutation = useMutation({
    mutationFn: async (databaseId: string) => {
      const response = await apiRequest('POST', '/api/notion/sync/accounts', { databaseId });
      return response.json() as Promise<SyncResult>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notion/sync/jobs'] });
      toast({
        title: 'Synchronisation terminée',
        description: `${data.totalProcessed} clients importés${data.errorCount > 0 ? `, ${data.errorCount} erreurs` : ''}`,
      });
    },
    onError: () => {
      toast({ title: 'Erreur de synchronisation', variant: 'destructive' });
    },
  });

  const syncExpensesMutation = useMutation({
    mutationFn: async (databaseId: string) => {
      const response = await apiRequest('POST', '/api/notion/sync/expenses', { databaseId });
      return response.json() as Promise<SyncResult>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notion/sync/jobs'] });
      toast({
        title: 'Synchronisation terminée',
        description: `${data.totalProcessed} charges importées${data.errorCount > 0 ? `, ${data.errorCount} erreurs` : ''}`,
      });
    },
    onError: () => {
      toast({ title: 'Erreur de synchronisation', variant: 'destructive' });
    },
  });

  const recentJobs = importJobs.slice(0, 5);

  if (databasesError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold" data-testid="text-page-title">Synchronisation Notion</h1>
          <p className="text-muted-foreground">Connectez vos bases de données Notion pour importer vos données</p>
        </div>
        
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Connexion Notion non configurée</AlertTitle>
          <AlertDescription>
            Veuillez configurer la connexion Notion dans les paramètres de l'application pour pouvoir synchroniser vos données.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold flex items-center gap-3" data-testid="text-page-title">
            <SiNotion className="h-8 w-8" />
            Synchronisation Notion
          </h1>
          <p className="text-muted-foreground">Importez vos clients et charges depuis Notion</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Clients
            </CardTitle>
            <CardDescription>
              Synchronisez votre base de données clients depuis Notion
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isDatabasesLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Chargement des bases de données...
              </div>
            ) : databases.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Aucune base de données trouvée. Assurez-vous que Notion a accès à vos bases.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Base de données Notion</label>
                  <Select value={accountsDbId} onValueChange={setAccountsDbId}>
                    <SelectTrigger data-testid="select-accounts-database">
                      <SelectValue placeholder="Sélectionner une base de données" />
                    </SelectTrigger>
                    <SelectContent>
                      {databases.map((db) => (
                        <SelectItem key={db.id} value={db.id}>
                          {db.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="text-sm text-muted-foreground space-y-1">
                  <p className="font-medium">Champs reconnus automatiquement :</p>
                  <ul className="list-disc list-inside">
                    <li>Nom / Name / Company / Entreprise</li>
                    <li>Contact / Responsable</li>
                    <li>Email / E-mail</li>
                    <li>Website / Domain / Site</li>
                    <li>Status / Statut</li>
                  </ul>
                </div>

                <Button
                  onClick={() => syncAccountsMutation.mutate(accountsDbId)}
                  disabled={!accountsDbId || syncAccountsMutation.isPending}
                  className="w-full"
                  data-testid="button-sync-accounts"
                >
                  {syncAccountsMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Synchroniser les clients
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Charges
            </CardTitle>
            <CardDescription>
              Synchronisez votre base de données de charges depuis Notion
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isDatabasesLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Chargement des bases de données...
              </div>
            ) : databases.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Aucune base de données trouvée.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Base de données Notion</label>
                  <Select value={expensesDbId} onValueChange={setExpensesDbId}>
                    <SelectTrigger data-testid="select-expenses-database">
                      <SelectValue placeholder="Sélectionner une base de données" />
                    </SelectTrigger>
                    <SelectContent>
                      {databases.map((db) => (
                        <SelectItem key={db.id} value={db.id}>
                          {db.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="text-sm text-muted-foreground space-y-1">
                  <p className="font-medium">Champs reconnus automatiquement :</p>
                  <ul className="list-disc list-inside">
                    <li>Nom / Name / Titre / Libellé</li>
                    <li>Montant / Amount / Total</li>
                    <li>Catégorie / Category / Type</li>
                    <li>Date / Date de paiement</li>
                    <li>Status / Payé / Paid</li>
                  </ul>
                </div>

                <Button
                  onClick={() => syncExpensesMutation.mutate(expensesDbId)}
                  disabled={!expensesDbId || syncExpensesMutation.isPending}
                  className="w-full"
                  data-testid="button-sync-expenses"
                >
                  {syncExpensesMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Synchroniser les charges
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Historique des synchronisations
          </CardTitle>
          <CardDescription>
            Les dernières synchronisations effectuées
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isJobsLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Chargement...
            </div>
          ) : recentJobs.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Aucune synchronisation effectuée pour le moment
            </p>
          ) : (
            <div className="space-y-4">
              {recentJobs.map((job) => {
                const isAccounts = job.source.includes('accounts');
                const isExpenses = job.source.includes('expenses');
                
                return (
                  <div key={job.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        {isAccounts ? <Users className="h-5 w-5" /> : <Receipt className="h-5 w-5" />}
                      </div>
                      <div>
                        <p className="font-medium">
                          {isAccounts ? 'Clients' : isExpenses ? 'Charges' : 'Import'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(job.startedAt), "dd MMM yyyy 'à' HH:mm", { locale: fr })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-medium">{job.processedRecords} enregistrements</p>
                        {job.errorCount > 0 && (
                          <p className="text-sm text-destructive">{job.errorCount} erreurs</p>
                        )}
                      </div>
                      <Badge variant={job.status === 'completed' ? 'default' : job.status === 'running' ? 'secondary' : 'destructive'}>
                        {job.status === 'completed' ? (
                          <><Check className="mr-1 h-3 w-3" /> Terminé</>
                        ) : job.status === 'running' ? (
                          <><Loader2 className="mr-1 h-3 w-3 animate-spin" /> En cours</>
                        ) : (
                          <><AlertCircle className="mr-1 h-3 w-3" /> Erreur</>
                        )}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Comment ça fonctionne
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                1
              </div>
              <div>
                <p className="font-medium">Sélectionnez une base</p>
                <p className="text-sm text-muted-foreground">
                  Choisissez la base de données Notion contenant vos données
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                2
              </div>
              <div>
                <p className="font-medium">Synchronisez</p>
                <p className="text-sm text-muted-foreground">
                  Les champs sont mappés automatiquement selon leurs noms
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                3
              </div>
              <div>
                <p className="font-medium">Vérifiez les résultats</p>
                <p className="text-sm text-muted-foreground">
                  Consultez les clients et charges importés dans l'application
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
