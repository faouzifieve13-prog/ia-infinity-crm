import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Search, FileText, File, Download, Eye, MoreHorizontal, Upload, FolderOpen, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import type { Document, Account, Project } from '@/lib/types';

const documentFormSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  url: z.string().url('URL invalide').optional().or(z.literal('')),
  accountId: z.string().optional(),
  projectId: z.string().optional(),
  mimeType: z.string().optional(),
});

type DocumentFormValues = z.infer<typeof documentFormSchema>;

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return 'Inconnu';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Documents() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'proposal' | 'audit' | 'contract' | 'other'>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<DocumentFormValues>({
    resolver: zodResolver(documentFormSchema),
    defaultValues: {
      name: '',
      url: '',
      accountId: '',
      projectId: '',
      mimeType: 'application/pdf',
    },
  });

  const { data: documents = [], isLoading } = useQuery<Document[]>({
    queryKey: ['/api/documents'],
  });

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ['/api/accounts'],
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: DocumentFormValues) => {
      const payload = {
        ...data,
        accountId: data.accountId || null,
        projectId: data.projectId || null,
        url: data.url || null,
        mimeType: data.mimeType || 'application/pdf',
      };
      return apiRequest('POST', '/api/documents', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      setDialogOpen(false);
      form.reset();
      toast({
        title: 'Document créé',
        description: 'Le document a été ajouté avec succès.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de créer le document.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: DocumentFormValues) => {
    createMutation.mutate(data);
  };

  const getAccountName = (accountId: string | null | undefined) => {
    if (!accountId) return 'Non assigné';
    return accounts.find((a) => a.id === accountId)?.name || 'Inconnu';
  };

  const getDocType = (mimeType: string | null | undefined, name: string): string => {
    if (!mimeType) return 'other';
    if (name.toLowerCase().includes('proposal') || name.toLowerCase().includes('proposition')) return 'proposal';
    if (name.toLowerCase().includes('audit')) return 'audit';
    if (name.toLowerCase().includes('contract') || name.toLowerCase().includes('contrat')) return 'contract';
    return 'other';
  };

  const documentsWithType = documents.map(doc => ({
    ...doc,
    type: getDocType(doc.mimeType, doc.name),
    accountName: getAccountName(doc.accountId),
  }));

  const filteredDocuments = documentsWithType.filter((doc) => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.accountName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || doc.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const typeConfig = {
    proposal: { label: 'Proposition', color: 'bg-pipeline-proposal' },
    audit: { label: 'Audit', color: 'bg-pipeline-audit' },
    contract: { label: 'Contrat', color: 'bg-pipeline-won' },
    other: { label: 'Autre', color: 'bg-muted' },
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
          <h1 className="text-3xl font-semibold" data-testid="text-page-title">Documents</h1>
          <p className="text-muted-foreground">Gérez vos propositions, contrats et rapports</p>
        </div>

        <div className="flex items-center gap-2">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-document">
                <Plus className="mr-2 h-4 w-4" />
                Nouveau document
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Créer un document</DialogTitle>
                <DialogDescription>
                  Ajoutez un nouveau document à votre bibliothèque.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom du document *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Ex: Proposition commerciale - Client X" 
                            {...field} 
                            data-testid="input-document-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>URL du document</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Ex: https://drive.google.com/..." 
                            {...field} 
                            data-testid="input-document-url"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="mimeType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type de fichier</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-document-type">
                              <SelectValue placeholder="Sélectionner un type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="application/pdf">PDF</SelectItem>
                            <SelectItem value="application/vnd.openxmlformats-officedocument.wordprocessingml.document">Word (DOCX)</SelectItem>
                            <SelectItem value="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet">Excel (XLSX)</SelectItem>
                            <SelectItem value="application/vnd.openxmlformats-officedocument.presentationml.presentation">PowerPoint (PPTX)</SelectItem>
                            <SelectItem value="image/png">Image (PNG)</SelectItem>
                            <SelectItem value="image/jpeg">Image (JPEG)</SelectItem>
                            <SelectItem value="text/plain">Texte</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="accountId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client associé</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-document-account">
                              <SelectValue placeholder="Sélectionner un client" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {accounts.map((account) => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="projectId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Projet associé</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-document-project">
                              <SelectValue placeholder="Sélectionner un projet" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {projects.map((project) => (
                              <SelectItem key={project.id} value={project.id}>
                                {project.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-3 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setDialogOpen(false)}
                      data-testid="button-cancel"
                    >
                      Annuler
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createMutation.isPending}
                      data-testid="button-submit-document"
                    >
                      {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Créer le document
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher des documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
            data-testid="input-search-documents"
          />
        </div>

        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
          <SelectTrigger className="w-40" data-testid="select-type-filter">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            <SelectItem value="proposal">Propositions</SelectItem>
            <SelectItem value="audit">Audits</SelectItem>
            <SelectItem value="contract">Contrats</SelectItem>
            <SelectItem value="other">Autres</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredDocuments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <File className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">Aucun document trouvé</p>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau document
          </Button>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Tous les documents
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {filteredDocuments.map((doc) => {
                const type = typeConfig[doc.type as keyof typeof typeConfig];

                return (
                  <div
                    key={doc.id}
                    className="flex items-center gap-4 p-4 hover-elevate"
                    data-testid={`document-item-${doc.id}`}
                  >
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${type.color} bg-opacity-10`}>
                      <FileText className={`h-5 w-5 ${type.color.replace('bg-', 'text-')}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium text-sm truncate">{doc.name}</span>
                        <Badge variant="outline" className="text-xs">{type.label}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{doc.accountName}</span>
                        <span>{doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('fr-FR') : 'N/A'}</span>
                        <span>{formatFileSize(doc.size)}</span>
                      </div>
                    </div>

                    <Button variant="ghost" size="icon" onClick={() => console.log('Preview', doc.id)}>
                      <Eye className="h-4 w-4" />
                    </Button>

                    {doc.url && (
                      <Button variant="ghost" size="icon" onClick={() => window.open(doc.url, '_blank')}>
                        <Download className="h-4 w-4" />
                      </Button>
                    )}

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Modifier</DropdownMenuItem>
                        <DropdownMenuItem>Partager</DropdownMenuItem>
                        <DropdownMenuItem>Dupliquer</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">Supprimer</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
