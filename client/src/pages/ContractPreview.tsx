import { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { 
  Loader2, ArrowLeft, Send, Sparkles, Check, FileText, 
  Building2, Euro, Calendar, Save, Wand2 
} from 'lucide-react';
import type { Contract } from '@shared/schema';

const typeLabels: Record<string, string> = {
  audit: "Contrat d'Audit",
  prestation: 'Contrat de Prestation',
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
        description: 'ChatGPT a généré des suggestions de personnalisation.' 
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
      toast({ title: 'Suggestions appliquées', description: 'Le contrat a été mis à jour.' });
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

  const sendContractMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/contracts/${id}/send`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contracts', id] });
      toast({ 
        title: 'Contrat envoyé', 
        description: 'Le client recevra un email avec le lien de signature.' 
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
            <CardContent className="space-y-2">
              <div><span className="text-muted-foreground">Type:</span> {typeLabels[contract.type] || contract.type}</div>
              <div className="flex items-center gap-2">
                <Euro className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">{parseFloat(contract.amount).toLocaleString('fr-FR')} €</span>
              </div>
              {contract.startDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  Début: {new Date(contract.startDate).toLocaleDateString('fr-FR')}
                </div>
              )}
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
                Utilisez ChatGPT pour personnaliser le contenu de ce contrat
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ai-instructions">Instructions (optionnel)</Label>
                <Textarea
                  id="ai-instructions"
                  placeholder="Ex: Rendre le ton plus formel, ajouter des clauses de confidentialité, adapter pour une startup tech..."
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
                Générer suggestions IA
              </Button>
            </CardContent>
          </Card>
        )}

        {aiSuggestions && (
          <Card className="border-green-500/50 bg-green-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <Check className="h-5 w-5" />
                Suggestions ChatGPT
              </CardTitle>
              <CardDescription>Vérifiez et appliquez les suggestions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {aiSuggestions.scope && (
                <div>
                  <Label className="font-medium">Périmètre suggéré:</Label>
                  <p className="text-sm mt-1 p-3 bg-background rounded border">{aiSuggestions.scope}</p>
                </div>
              )}
              {aiSuggestions.deliverables && (
                <div>
                  <Label className="font-medium">Livrables suggérés:</Label>
                  <ul className="text-sm mt-1 p-3 bg-background rounded border list-disc pl-5">
                    {aiSuggestions.deliverables.map((d: string, i: number) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>
              )}
              {aiSuggestions.paymentTerms && (
                <div>
                  <Label className="font-medium">Conditions de paiement suggérées:</Label>
                  <p className="text-sm mt-1 p-3 bg-background rounded border">{aiSuggestions.paymentTerms}</p>
                </div>
              )}
              <div className="flex gap-2">
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
                  Appliquer les suggestions
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
              <CardDescription>Périmètre, livrables et conditions</CardDescription>
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
              <Label className="font-medium">Périmètre de la mission</Label>
              {isEditing ? (
                <Textarea
                  value={editedContract.scope ?? contract.scope ?? ''}
                  onChange={(e) => setEditedContract({ ...editedContract, scope: e.target.value })}
                  rows={4}
                  data-testid="input-edit-scope"
                />
              ) : (
                <p className="text-sm p-3 bg-muted rounded">{currentScope || 'Non défini'}</p>
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
                <Input
                  value={editedContract.paymentTerms ?? contract.paymentTerms ?? ''}
                  onChange={(e) => setEditedContract({ ...editedContract, paymentTerms: e.target.value })}
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

        {contract.status === 'draft' && (
          <div className="flex justify-end gap-4">
            <Button
              size="lg"
              onClick={() => sendContractMutation.mutate()}
              disabled={sendContractMutation.isPending || !contract.clientEmail}
              data-testid="button-send-contract"
            >
              {sendContractMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Envoyer le contrat au client
            </Button>
          </div>
        )}

        {!contract.clientEmail && contract.status === 'draft' && (
          <p className="text-sm text-destructive text-right">
            L'email du client est requis pour envoyer le contrat.
          </p>
        )}
      </div>
    </div>
  );
}
