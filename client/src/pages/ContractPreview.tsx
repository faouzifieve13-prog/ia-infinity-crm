import { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { cn } from '@/lib/utils';
import { 
  Loader2, ArrowLeft, Send, Sparkles, Check, FileText, 
  Building2, Euro, Calendar as CalendarIcon, Save, Wand2, Download, AlertCircle
} from 'lucide-react';
import type { Contract } from '@shared/schema';

const typeLabels: Record<string, string> = {
  audit: "Contrat d'Audit Général",
  prestation: "Contrat de Prestation d'Automatisation",
  formation: 'Contrat de Formation',
  suivi: 'Contrat de Suivi',
  sous_traitance: 'Contrat de Sous-Traitance',
};

export default function ContractPreview() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [isEditing, setIsEditing] = useState(false);
  const [aiInstructions, setAiInstructions] = useState('');
  const [editedContract, setEditedContract] = useState<Partial<Contract>>({});
  const [aiSuggestions, setAiSuggestions] = useState<any>(null);

  const { data: contract, isLoading, error } = useQuery<Contract>({
    queryKey: ['/api/contracts', id],
    enabled: !!id,
  });

  const personalizeMutation = useMutation({
    mutationFn: async (instructions: string) => {
      const response = await apiRequest('POST', `/api/contracts/${id}/personalize`, { instructions });
      return response.json();
    },
    onSuccess: (data) => {
      setAiSuggestions(data.suggestions);
      toast({ 
        title: 'Suggestions générées', 
        description: 'ChatGPT a personnalisé le contrat selon le modèle.' 
      });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erreur', 
        description: error.message || 'Impossible de générer les suggestions.', 
        variant: 'destructive' 
      });
    },
  });

  const applySuggestionsMutation = useMutation({
    mutationFn: async (suggestions: any) => {
      const response = await apiRequest('POST', `/api/contracts/${id}/apply-suggestions`, suggestions);
      return response.json();
    },
    onSuccess: () => {
      setAiSuggestions(null);
      queryClient.invalidateQueries({ queryKey: ['/api/contracts', id] });
      toast({ title: 'Contrat personnalisé', description: 'Les modifications ont été appliquées.' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erreur', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });

  const updateContractMutation = useMutation({
    mutationFn: async (data: Partial<Contract>) => {
      const response = await apiRequest('PATCH', `/api/contracts/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      setIsEditing(false);
      setEditedContract({});
      queryClient.invalidateQueries({ queryKey: ['/api/contracts', id] });
      toast({ title: 'Contrat mis à jour' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erreur', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });

  const downloadPdfMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/contracts/${id}/download-pdf`);
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Téléchargement échoué');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contrat-${contract?.contractNumber || id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erreur', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });

  const sendContractMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/contracts/${id}/send`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contracts', id] });
      toast({ 
        title: 'Contrat envoyé', 
        description: 'Le client recevra une alerte par email avec le lien vers son espace de signature.' 
      });
      navigate('/deals');
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erreur', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-destructive">Contrat non trouvé</CardTitle>
            <CardDescription>Ce contrat n'existe pas ou vous n'y avez pas accès.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/deals')} data-testid="button-back-deals">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour aux deals
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentScope = isEditing && editedContract.scope !== undefined 
    ? editedContract.scope 
    : contract.scope;
  const currentDeliverables = isEditing && editedContract.deliverables !== undefined 
    ? editedContract.deliverables 
    : contract.deliverables;
  const currentPaymentTerms = isEditing && editedContract.paymentTerms !== undefined 
    ? editedContract.paymentTerms 
    : contract.paymentTerms;
  const currentStartDate = isEditing && editedContract.startDate !== undefined
    ? editedContract.startDate
    : contract.startDate;
  const currentEndDate = isEditing && editedContract.endDate !== undefined
    ? editedContract.endDate
    : contract.endDate;

  const canSend = contract.clientEmail && contract.startDate && contract.endDate;
  const missingFields: string[] = [];
  if (!contract.startDate) missingFields.push('date de début');
  if (!contract.endDate) missingFields.push('date de fin');
  if (!contract.clientEmail) missingFields.push('email du client');

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate('/deals')} data-testid="button-back">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{contract.title}</h1>
              <p className="text-muted-foreground">{contract.contractNumber}</p>
            </div>
          </div>
          <Badge variant={contract.status === 'draft' ? 'outline' : 'default'}>
            {contract.status === 'draft' ? 'Brouillon' : 
             contract.status === 'sent' ? 'Envoyé' :
             contract.status === 'signed' ? 'Signé' : contract.status}
          </Badge>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Informations client
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div><span className="text-muted-foreground">Nom:</span> {contract.clientName}</div>
              <div><span className="text-muted-foreground">Email:</span> {contract.clientEmail}</div>
              {contract.clientCompany && (
                <div><span className="text-muted-foreground">Société:</span> {contract.clientCompany}</div>
              )}
              {contract.clientPhone && (
                <div><span className="text-muted-foreground">Téléphone:</span> {contract.clientPhone}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Détails du contrat
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div><span className="text-muted-foreground">Type:</span> {typeLabels[contract.type] || contract.type}</div>
              <div className="flex items-center gap-2">
                <Euro className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">{parseFloat(contract.amount).toLocaleString('fr-FR')} €</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Date de début</Label>
                  {isEditing ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !currentStartDate && "text-muted-foreground"
                          )}
                          data-testid="button-start-date"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {currentStartDate 
                            ? format(new Date(currentStartDate), "dd MMM yyyy", { locale: fr })
                            : "Choisir..."}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={currentStartDate ? new Date(currentStartDate) : undefined}
                          onSelect={(date) => setEditedContract({ ...editedContract, startDate: date || null })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <p className={cn("text-sm font-medium", !contract.startDate && "text-destructive")}>
                      {contract.startDate 
                        ? format(new Date(contract.startDate), "dd MMMM yyyy", { locale: fr })
                        : "Non définie"}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Date de fin</Label>
                  {isEditing ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !currentEndDate && "text-muted-foreground"
                          )}
                          data-testid="button-end-date"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {currentEndDate 
                            ? format(new Date(currentEndDate), "dd MMM yyyy", { locale: fr })
                            : "Choisir..."}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={currentEndDate ? new Date(currentEndDate) : undefined}
                          onSelect={(date) => setEditedContract({ ...editedContract, endDate: date || null })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <p className={cn("text-sm font-medium", !contract.endDate && "text-destructive")}>
                      {contract.endDate 
                        ? format(new Date(contract.endDate), "dd MMMM yyyy", { locale: fr })
                        : "Non définie"}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {contract.status === 'draft' && (
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Personnalisation IA
              </CardTitle>
              <CardDescription>
                ChatGPT personnalise automatiquement le contrat selon le modèle {contract.type === 'audit' ? "d'Audit Général" : "de Prestation d'Automatisation"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ai-instructions">Instructions supplémentaires (optionnel)</Label>
                <Textarea
                  id="ai-instructions"
                  placeholder="Ex: Ajouter une clause spécifique sur la confidentialité, préciser les délais de livraison..."
                  value={aiInstructions}
                  onChange={(e) => setAiInstructions(e.target.value)}
                  rows={3}
                  data-testid="input-ai-instructions"
                />
              </div>
              <Button 
                onClick={() => personalizeMutation.mutate(aiInstructions)}
                disabled={personalizeMutation.isPending}
                data-testid="button-personalize-ai"
              >
                {personalizeMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="mr-2 h-4 w-4" />
                )}
                Personnaliser avec ChatGPT
              </Button>
            </CardContent>
          </Card>
        )}

        {aiSuggestions && (
          <Card className="border-green-500/50 bg-green-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <Check className="h-5 w-5" />
                Contrat personnalisé par ChatGPT
              </CardTitle>
              <CardDescription>Vérifiez le contenu et appliquez les modifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {aiSuggestions.title && (
                <div>
                  <Label className="font-medium">Titre du contrat:</Label>
                  <p className="text-sm mt-1 p-3 bg-background rounded border">{aiSuggestions.title}</p>
                </div>
              )}
              {aiSuggestions.scope && (
                <div>
                  <Label className="font-medium">Objet / Périmètre de la mission:</Label>
                  <p className="text-sm mt-1 p-3 bg-background rounded border whitespace-pre-wrap">{aiSuggestions.scope}</p>
                </div>
              )}
              {aiSuggestions.deliverables && (
                <div>
                  <Label className="font-medium">Livrables:</Label>
                  <ul className="text-sm mt-1 p-3 bg-background rounded border list-disc pl-5">
                    {aiSuggestions.deliverables.map((d: string, i: number) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>
              )}
              {aiSuggestions.paymentTerms && (
                <div>
                  <Label className="font-medium">Conditions de paiement:</Label>
                  <p className="text-sm mt-1 p-3 bg-background rounded border">{aiSuggestions.paymentTerms}</p>
                </div>
              )}
              <div className="flex gap-2 flex-wrap">
                <Button 
                  onClick={() => applySuggestionsMutation.mutate(aiSuggestions)}
                  disabled={applySuggestionsMutation.isPending}
                  data-testid="button-apply-suggestions"
                >
                  {applySuggestionsMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-2 h-4 w-4" />
                  )}
                  Appliquer
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setAiSuggestions(null)}
                  data-testid="button-dismiss-suggestions"
                >
                  Ignorer
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle>Contenu du contrat</CardTitle>
              <CardDescription>Objet, livrables et conditions</CardDescription>
            </div>
            {contract.status === 'draft' && !isEditing && (
              <Button 
                variant="outline" 
                onClick={() => setIsEditing(true)}
                data-testid="button-edit-contract"
              >
                Modifier
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="font-medium">Objet / Périmètre de la mission</Label>
              {isEditing ? (
                <Textarea
                  value={editedContract.scope ?? contract.scope ?? ''}
                  onChange={(e) => setEditedContract({ ...editedContract, scope: e.target.value })}
                  rows={4}
                  data-testid="input-edit-scope"
                />
              ) : (
                <p className="text-sm p-3 bg-muted rounded whitespace-pre-wrap">{currentScope || 'Non défini'}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="font-medium">Livrables</Label>
              {isEditing ? (
                <Textarea
                  value={(editedContract.deliverables ?? contract.deliverables ?? []).join('\n')}
                  onChange={(e) => setEditedContract({ 
                    ...editedContract, 
                    deliverables: e.target.value.split('\n').filter(d => d.trim()) 
                  })}
                  placeholder="Un livrable par ligne"
                  rows={4}
                  data-testid="input-edit-deliverables"
                />
              ) : (
                <ul className="text-sm p-3 bg-muted rounded list-disc pl-5">
                  {(currentDeliverables || []).map((d, i) => <li key={i}>{d}</li>)}
                  {(!currentDeliverables || currentDeliverables.length === 0) && (
                    <li className="text-muted-foreground">Non définis</li>
                  )}
                </ul>
              )}
            </div>

            <div className="space-y-2">
              <Label className="font-medium">Conditions de paiement</Label>
              {isEditing ? (
                <Textarea
                  value={editedContract.paymentTerms ?? contract.paymentTerms ?? ''}
                  onChange={(e) => setEditedContract({ ...editedContract, paymentTerms: e.target.value })}
                  rows={2}
                  data-testid="input-edit-payment-terms"
                />
              ) : (
                <p className="text-sm p-3 bg-muted rounded">{currentPaymentTerms || 'Non définies'}</p>
              )}
            </div>

            {isEditing && (
              <div className="flex gap-2">
                <Button 
                  onClick={() => updateContractMutation.mutate(editedContract)}
                  disabled={updateContractMutation.isPending}
                  data-testid="button-save-changes"
                >
                  {updateContractMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Enregistrer
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => { setIsEditing(false); setEditedContract({}); }}
                  data-testid="button-cancel-edit"
                >
                  Annuler
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {missingFields.length > 0 && contract.status === 'draft' && (
          <div className="flex items-center gap-2 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <p className="text-sm text-destructive">
              Champs obligatoires manquants: <strong>{missingFields.join(', ')}</strong>. 
              Cliquez sur "Modifier" pour les renseigner.
            </p>
          </div>
        )}

        {contract.status === 'draft' && (
          <div className="flex justify-end gap-4 flex-wrap">
            <Button
              variant="outline"
              onClick={() => downloadPdfMutation.mutate()}
              disabled={downloadPdfMutation.isPending}
              data-testid="button-download-pdf"
            >
              {downloadPdfMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Télécharger PDF
            </Button>
            <Button
              size="lg"
              onClick={() => sendContractMutation.mutate()}
              disabled={sendContractMutation.isPending || !canSend}
              data-testid="button-send-contract"
            >
              {sendContractMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Envoyer pour signature
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
