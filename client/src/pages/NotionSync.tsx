import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  RefreshCw, Database, Users, Receipt, Check, AlertCircle, Loader2, 
  Settings2, UserCircle, Briefcase, FolderKanban, ListTodo, FileText,
  Building, ClipboardList, File
} from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

type EntityType = 'accounts' | 'contacts' | 'deals' | 'projects' | 'tasks' | 'invoices' | 'expenses' | 'vendors' | 'missions' | 'documents';

interface EntityConfig {
  key: EntityType;
  label: string;
  labelPlural: string;
  icon: React.ComponentType<{ className?: string }>;
  fields: string[];
  cacheKey: string;
  description: string;
  dependencies?: string[];
}

const ENTITY_CONFIGS: EntityConfig[] = [
  {
    key: 'accounts',
    label: 'Client',
    labelPlural: 'Clients',
    icon: Users,
    fields: ['Nom / Name / Company', 'Contact / Responsable', 'Email', 'Website / Domain', 'Status / Statut'],
    cacheKey: '/api/accounts',
    description: 'Base de données clients',
  },
  {
    key: 'contacts',
    label: 'Contact',
    labelPlural: 'Contacts',
    icon: UserCircle,
    fields: ['Nom / Name', 'Email', 'Rôle / Position', 'Téléphone / Phone', 'LinkedIn'],
    cacheKey: '/api/contacts',
    description: 'Contacts associés aux clients',
    dependencies: ['Clients'],
  },
  {
    key: 'deals',
    label: 'Opportunité',
    labelPlural: 'Opportunités',
    icon: Briefcase,
    fields: ['Nom / Name', 'Montant / Amount', 'Stage / Étape', 'Probabilité', 'Prochaine action'],
    cacheKey: '/api/deals',
    description: 'Pipeline commercial',
    dependencies: ['Clients', 'Contacts'],
  },
  {
    key: 'projects',
    label: 'Projet',
    labelPlural: 'Projets',
    icon: FolderKanban,
    fields: ['Nom / Name', 'Description', 'Status / Statut', 'Date début', 'Date fin', 'Progression'],
    cacheKey: '/api/projects',
    description: 'Projets client',
    dependencies: ['Clients', 'Opportunités'],
  },
  {
    key: 'tasks',
    label: 'Tâche',
    labelPlural: 'Tâches',
    icon: ListTodo,
    fields: ['Titre / Title', 'Description', 'Status / Statut', 'Priorité', 'Date échéance'],
    cacheKey: '/api/tasks',
    description: 'Tâches projet',
    dependencies: ['Projets'],
  },
  {
    key: 'invoices',
    label: 'Facture',
    labelPlural: 'Factures',
    icon: FileText,
    fields: ['Numéro', 'Montant / Amount', 'Status / Statut', 'Date émission', 'Date échéance'],
    cacheKey: '/api/invoices',
    description: 'Factures clients',
    dependencies: ['Clients', 'Projets'],
  },
  {
    key: 'expenses',
    label: 'Charge',
    labelPlural: 'Charges',
    icon: Receipt,
    fields: ['Titre / Name', 'Montant / Amount', 'Catégorie / Type', 'Date', 'Status / Payé'],
    cacheKey: '/api/expenses',
    description: 'Charges et dépenses',
  },
  {
    key: 'vendors',
    label: 'Prestataire',
    labelPlural: 'Prestataires',
    icon: Building,
    fields: ['Nom / Name', 'Entreprise / Company', 'Email', 'TJM / Daily rate', 'Compétences / Skills'],
    cacheKey: '/api/vendors',
    description: 'Prestataires externes',
  },
  {
    key: 'missions',
    label: 'Mission',
    labelPlural: 'Missions',
    icon: ClipboardList,
    fields: ['Titre / Title', 'Description', 'Status / Statut', 'Date début', 'Date fin', 'Livrables'],
    cacheKey: '/api/missions',
    description: 'Missions prestataires',
    dependencies: ['Projets', 'Prestataires'],
  },
  {
    key: 'documents',
    label: 'Document',
    labelPlural: 'Documents',
    icon: File,
    fields: ['Nom / Name', 'URL / Lien', 'Type / Format'],
    cacheKey: '/api/documents',
    description: 'Documents attachés',
    dependencies: ['Clients', 'Projets'],
  },
];

function SyncCard({ 
  config, 
  databases, 
  selectedDbId, 
  onSelectDb, 
  onSync, 
  isPending 
}: {
  config: EntityConfig;
  databases: NotionDatabase[];
  selectedDbId: string;
  onSelectDb: (id: string) => void;
  onSync: () => void;
  isPending: boolean;
}) {
  const Icon = config.icon;
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4" />
          {config.labelPlural}
        </CardTitle>
        <CardDescription className="text-xs">
          {config.description}
          {config.dependencies && (
            <span className="block mt-1 text-muted-foreground/70">
              Dépend de : {config.dependencies.join(', ')}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Select value={selectedDbId} onValueChange={onSelectDb}>
          <SelectTrigger data-testid={`select-${config.key}-database`} className="h-9 text-sm">
            <SelectValue placeholder="Sélectionner une base" />
          </SelectTrigger>
          <SelectContent>
            {databases.map((db) => (
              <SelectItem key={db.id} value={db.id}>
                {db.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="text-xs text-muted-foreground">
          <p className="font-medium mb-1">Champs reconnus :</p>
          <p className="line-clamp-2">{config.fields.join(' • ')}</p>
        </div>

        <Button
          onClick={onSync}
          disabled={!selectedDbId || isPending}
          className="w-full"
          size="sm"
          data-testid={`button-sync-${config.key}`}
        >
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Synchroniser
        </Button>
      </CardContent>
    </Card>
  );
}

function getEntityIcon(source: string): React.ComponentType<{ className?: string }> {
  for (const config of ENTITY_CONFIGS) {
    if (source.includes(config.key)) {
      return config.icon;
    }
  }
  return Database;
}

function getEntityLabel(source: string): string {
  for (const config of ENTITY_CONFIGS) {
    if (source.includes(config.key)) {
      return config.labelPlural;
    }
  }
  return 'Import';
}

export default function NotionSync() {
  const { toast } = useToast();
  const [selectedDbs, setSelectedDbs] = useState<Record<EntityType, string>>({
    accounts: '',
    contacts: '',
    deals: '',
    projects: '',
    tasks: '',
    invoices: '',
    expenses: '',
    vendors: '',
    missions: '',
    documents: '',
  });
  const [pendingMutations, setPendingMutations] = useState<Set<EntityType>>(new Set());

  const { data: databases = [], isLoading: isDatabasesLoading, error: databasesError } = useQuery<NotionDatabase[]>({
    queryKey: ['/api/notion/databases'],
    retry: false,
  });

  const { data: importJobs = [], isLoading: isJobsLoading } = useQuery<ImportJob[]>({
    queryKey: ['/api/notion/sync/jobs'],
  });

  const createSyncMutation = (entityType: EntityType) => {
    return useMutation({
      mutationFn: async (databaseId: string) => {
        setPendingMutations(prev => new Set(prev).add(entityType));
        const response = await apiRequest('POST', `/api/notion/sync/${entityType}`, { databaseId });
        return response.json() as Promise<SyncResult>;
      },
      onSuccess: (data) => {
        const config = ENTITY_CONFIGS.find(c => c.key === entityType)!;
        queryClient.invalidateQueries({ queryKey: [config.cacheKey] });
        queryClient.invalidateQueries({ queryKey: ['/api/notion/sync/jobs'] });
        toast({
          title: 'Synchronisation terminée',
          description: `${data.totalProcessed} ${config.labelPlural.toLowerCase()} importé(e)s${data.errorCount > 0 ? `, ${data.errorCount} erreurs` : ''}`,
        });
        setPendingMutations(prev => {
          const next = new Set(prev);
          next.delete(entityType);
          return next;
        });
      },
      onError: () => {
        toast({ title: 'Erreur de synchronisation', variant: 'destructive' });
        setPendingMutations(prev => {
          const next = new Set(prev);
          next.delete(entityType);
          return next;
        });
      },
    });
  };

  const syncAccountsMutation = createSyncMutation('accounts');
  const syncContactsMutation = createSyncMutation('contacts');
  const syncDealsMutation = createSyncMutation('deals');
  const syncProjectsMutation = createSyncMutation('projects');
  const syncTasksMutation = createSyncMutation('tasks');
  const syncInvoicesMutation = createSyncMutation('invoices');
  const syncExpensesMutation = createSyncMutation('expenses');
  const syncVendorsMutation = createSyncMutation('vendors');
  const syncMissionsMutation = createSyncMutation('missions');
  const syncDocumentsMutation = createSyncMutation('documents');

  const mutations: Record<EntityType, ReturnType<typeof createSyncMutation>> = {
    accounts: syncAccountsMutation,
    contacts: syncContactsMutation,
    deals: syncDealsMutation,
    projects: syncProjectsMutation,
    tasks: syncTasksMutation,
    invoices: syncInvoicesMutation,
    expenses: syncExpensesMutation,
    vendors: syncVendorsMutation,
    missions: syncMissionsMutation,
    documents: syncDocumentsMutation,
  };

  const handleSync = (entityType: EntityType) => {
    const dbId = selectedDbs[entityType];
    if (dbId) {
      mutations[entityType].mutate(dbId);
    }
  };

  const handleSelectDb = (entityType: EntityType, dbId: string) => {
    setSelectedDbs(prev => ({ ...prev, [entityType]: dbId }));
  };

  const recentJobs = importJobs.slice(0, 10);

  const crmEntities = ENTITY_CONFIGS.filter(c => ['accounts', 'contacts', 'deals'].includes(c.key));
  const deliveryEntities = ENTITY_CONFIGS.filter(c => ['projects', 'tasks', 'invoices'].includes(c.key));
  const financeEntities = ENTITY_CONFIGS.filter(c => ['expenses'].includes(c.key));
  const vendorEntities = ENTITY_CONFIGS.filter(c => ['vendors', 'missions'].includes(c.key));
  const documentEntities = ENTITY_CONFIGS.filter(c => ['documents'].includes(c.key));

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
          <p className="text-muted-foreground">Importez toutes vos données depuis Notion vers IA Infinity</p>
        </div>
        {databases.length > 0 && (
          <Badge variant="outline" className="text-sm">
            {databases.length} base{databases.length > 1 ? 's' : ''} disponible{databases.length > 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {isDatabasesLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Chargement des bases de données Notion...
            </div>
          </CardContent>
        </Card>
      ) : databases.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Aucune base de données trouvée</AlertTitle>
          <AlertDescription>
            Assurez-vous que votre compte Notion a partagé l'accès aux bases de données avec l'intégration IA Infinity.
          </AlertDescription>
        </Alert>
      ) : (
        <Tabs defaultValue="crm" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="crm" data-testid="tab-crm">CRM</TabsTrigger>
            <TabsTrigger value="delivery" data-testid="tab-delivery">Projets</TabsTrigger>
            <TabsTrigger value="finance" data-testid="tab-finance">Finance</TabsTrigger>
            <TabsTrigger value="vendors" data-testid="tab-vendors">Prestataires</TabsTrigger>
            <TabsTrigger value="documents" data-testid="tab-documents">Documents</TabsTrigger>
          </TabsList>

          <TabsContent value="crm" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              {crmEntities.map(config => (
                <SyncCard
                  key={config.key}
                  config={config}
                  databases={databases}
                  selectedDbId={selectedDbs[config.key]}
                  onSelectDb={(id) => handleSelectDb(config.key, id)}
                  onSync={() => handleSync(config.key)}
                  isPending={pendingMutations.has(config.key)}
                />
              ))}
            </div>
            <Alert>
              <Settings2 className="h-4 w-4" />
              <AlertDescription>
                <strong>Ordre recommandé :</strong> Synchronisez d'abord les Clients, puis les Contacts, puis les Opportunités pour que les relations soient correctement établies.
              </AlertDescription>
            </Alert>
          </TabsContent>

          <TabsContent value="delivery" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              {deliveryEntities.map(config => (
                <SyncCard
                  key={config.key}
                  config={config}
                  databases={databases}
                  selectedDbId={selectedDbs[config.key]}
                  onSelectDb={(id) => handleSelectDb(config.key, id)}
                  onSync={() => handleSync(config.key)}
                  isPending={pendingMutations.has(config.key)}
                />
              ))}
            </div>
            <Alert>
              <Settings2 className="h-4 w-4" />
              <AlertDescription>
                <strong>Ordre recommandé :</strong> Synchronisez les Projets avant les Tâches et Factures pour établir les liens entre les entités.
              </AlertDescription>
            </Alert>
          </TabsContent>

          <TabsContent value="finance" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              {financeEntities.map(config => (
                <SyncCard
                  key={config.key}
                  config={config}
                  databases={databases}
                  selectedDbId={selectedDbs[config.key]}
                  onSelectDb={(id) => handleSelectDb(config.key, id)}
                  onSync={() => handleSync(config.key)}
                  isPending={pendingMutations.has(config.key)}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="vendors" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {vendorEntities.map(config => (
                <SyncCard
                  key={config.key}
                  config={config}
                  databases={databases}
                  selectedDbId={selectedDbs[config.key]}
                  onSelectDb={(id) => handleSelectDb(config.key, id)}
                  onSync={() => handleSync(config.key)}
                  isPending={pendingMutations.has(config.key)}
                />
              ))}
            </div>
            <Alert>
              <Settings2 className="h-4 w-4" />
              <AlertDescription>
                <strong>Ordre recommandé :</strong> Synchronisez les Prestataires avant les Missions pour établir les liens.
              </AlertDescription>
            </Alert>
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {documentEntities.map(config => (
                <SyncCard
                  key={config.key}
                  config={config}
                  databases={databases}
                  selectedDbId={selectedDbs[config.key]}
                  onSelectDb={(id) => handleSelectDb(config.key, id)}
                  onSync={() => handleSync(config.key)}
                  isPending={pendingMutations.has(config.key)}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}

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
            <div className="space-y-3">
              {recentJobs.map((job) => {
                const Icon = getEntityIcon(job.source);
                const label = getEntityLabel(job.source);
                
                return (
                  <div key={job.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{label}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(job.startedAt), "dd MMM yyyy 'à' HH:mm", { locale: fr })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-medium">{job.processedRecords} enregistrements</p>
                        {job.errorCount > 0 && (
                          <p className="text-xs text-destructive">{job.errorCount} erreurs</p>
                        )}
                      </div>
                      <Badge 
                        variant={job.status === 'completed' ? 'default' : job.status === 'running' ? 'secondary' : 'destructive'}
                        className="text-xs"
                      >
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
          <div className="grid gap-4 md:grid-cols-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                1
              </div>
              <div>
                <p className="font-medium text-sm">Sélectionnez</p>
                <p className="text-xs text-muted-foreground">
                  Choisissez la base Notion pour chaque type de données
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                2
              </div>
              <div>
                <p className="font-medium text-sm">Synchronisez</p>
                <p className="text-xs text-muted-foreground">
                  Les champs sont mappés automatiquement
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                3
              </div>
              <div>
                <p className="font-medium text-sm">Respectez l'ordre</p>
                <p className="text-xs text-muted-foreground">
                  Sync les entités parentes avant les enfants
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                4
              </div>
              <div>
                <p className="font-medium text-sm">Vérifiez</p>
                <p className="text-xs text-muted-foreground">
                  Consultez les données importées
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
