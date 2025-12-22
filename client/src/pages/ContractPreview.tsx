import { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { cn } from '@/lib/utils';
import { 
  Loader2, ArrowLeft, Send, Sparkles, Check, FileText, 
  Building2, Euro, Calendar as CalendarIcon, Save, Wand2, Download, AlertCircle, Edit3, X
} from 'lucide-react';
import type { Contract } from '@shared/schema';
import logoIAInfinity from '@assets/logo_iA_Infinity_1766415032734.png';

const typeLabels: Record<string, string> = {
  audit: "Contrat d'Audit",
  prestation: "Contrat de Prestation",
  formation: "Contrat de Formation",
  suivi: "Contrat de Suivi",
  sous_traitance: "Contrat de Sous-Traitance",
};

const typeTitles: Record<string, string> = {
  audit: "Contrat d'Audit Général",
  prestation: "Contrat de Prestation d'Automatisation",
  formation: "Contrat de Formation",
  suivi: "Contrat de Suivi",
  sous_traitance: "Contrat de Sous-Traitance",
};

interface DatePickerInlineProps {
  value: Date | string | null | undefined;
  onSave: (date: Date | null) => void;
  placeholder?: string;
  testId?: string;
  isPending?: boolean;
  label: string;
}

function DatePickerInline({ value, onSave, placeholder = "Choisir une date", testId, isPending, label }: DatePickerInlineProps) {
  const [open, setOpen] = useState(false);
  const dateValue = value ? new Date(value) : undefined;
  
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground">{label}:</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-auto py-0.5 px-2 font-normal hover-elevate",
              !value && "text-destructive"
            )}
            data-testid={testId}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <CalendarIcon className="mr-1 h-3 w-3" />
            )}
            {dateValue 
              ? format(dateValue, "dd MMMM yyyy", { locale: fr })
              : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={dateValue}
            onSelect={(date) => {
              onSave(date || null);
              setOpen(false);
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

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
        description: 'Le client recevra un email avec le lien vers son espace de signature.' 
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
        <Card className="max-w-md w-full p-6">
          <h2 className="text-xl font-semibold text-destructive mb-2">Contrat non trouvé</h2>
          <p className="text-muted-foreground mb-4">Ce contrat n'existe pas ou vous n'y avez pas accès.</p>
          <Button onClick={() => navigate('/deals')} data-testid="button-back-deals">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour aux deals
          </Button>
        </Card>
      </div>
    );
  }

  const canSend = contract.clientEmail && contract.startDate && contract.endDate;
  const missingFields: string[] = [];
  if (!contract.startDate) missingFields.push('date de début');
  if (!contract.endDate) missingFields.push('date de fin');
  if (!contract.clientEmail) missingFields.push('email du client');

  const formatAmount = (amount: string) => {
    const num = parseFloat(amount);
    return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
  };

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
    <div className="min-h-screen bg-muted/30 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate('/deals')} data-testid="button-back">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour
            </Button>
            <Badge variant={contract.status === 'draft' ? 'outline' : 'default'}>
              {contract.status === 'draft' ? 'Brouillon' : 
               contract.status === 'sent' ? 'Envoyé' :
               contract.status === 'signed' ? 'Signé' : contract.status}
            </Badge>
          </div>
          <div className="flex gap-2 flex-wrap">
            {contract.status === 'draft' && !isEditing && (
              <Button variant="outline" onClick={() => setIsEditing(true)} data-testid="button-edit-contract">
                <Edit3 className="mr-2 h-4 w-4" />
                Modifier
              </Button>
            )}
            {isEditing && (
              <>
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
                  <X className="mr-2 h-4 w-4" />
                  Annuler
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="bg-background rounded-lg shadow-lg overflow-hidden">
          <div className="bg-primary text-primary-foreground p-6">
            <div className="flex items-center gap-4">
              <img 
                src={logoIAInfinity} 
                alt="IA Infinity" 
                className="h-14 w-auto bg-white/10 rounded-lg p-1"
              />
              <div>
                <h1 className="text-2xl font-bold">IA Infinity</h1>
                <p className="opacity-90">{typeLabels[contract.type] || contract.type}</p>
                <p className="text-sm opacity-75">N° {contract.contractNumber}</p>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-8">
            <div>
              <h2 className="text-2xl font-semibold mb-6">{contract.title}</h2>
            </div>

            <section>
              <h3 className="text-lg font-semibold text-primary mb-3">PARTIES</h3>
              <div className="space-y-1 text-sm">
                <p><span className="text-muted-foreground">Client:</span> {contract.clientName}</p>
                {contract.clientCompany && (
                  <p><span className="text-muted-foreground">Société:</span> {contract.clientCompany}</p>
                )}
                <p><span className="text-muted-foreground">Email:</span> {contract.clientEmail}</p>
                {contract.clientPhone && (
                  <p><span className="text-muted-foreground">Téléphone:</span> {contract.clientPhone}</p>
                )}
                {contract.clientAddress && (
                  <p><span className="text-muted-foreground">Adresse:</span> {contract.clientAddress}</p>
                )}
                {contract.clientSiret && (
                  <p><span className="text-muted-foreground">SIRET:</span> {contract.clientSiret}</p>
                )}
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-primary mb-3">OBJET DU CONTRAT</h3>
              {isEditing ? (
                <Textarea
                  value={editedContract.scope ?? contract.scope ?? ''}
                  onChange={(e) => setEditedContract({ ...editedContract, scope: e.target.value })}
                  rows={6}
                  placeholder="Décrivez le périmètre et l'objet de la mission..."
                  className="text-sm"
                  data-testid="input-edit-scope"
                />
              ) : (
                <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                  {contract.scope || (
                    <span className="italic text-destructive">
                      Aucun objet défini. Utilisez la personnalisation IA ou modifiez manuellement.
                    </span>
                  )}
                </p>
              )}
            </section>

            <section>
              <h3 className="text-lg font-semibold text-primary mb-3">LIVRABLES</h3>
              {isEditing ? (
                <Textarea
                  value={(editedContract.deliverables ?? contract.deliverables ?? []).join('\n')}
                  onChange={(e) => setEditedContract({ 
                    ...editedContract, 
                    deliverables: e.target.value.split('\n').filter(d => d.trim()) 
                  })}
                  placeholder="Un livrable par ligne"
                  rows={5}
                  className="text-sm"
                  data-testid="input-edit-deliverables"
                />
              ) : (
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {(contract.deliverables || []).length > 0 ? (
                    contract.deliverables?.map((d, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{d}</span>
                      </li>
                    ))
                  ) : (
                    <li className="italic text-destructive">
                      Aucun livrable défini. Utilisez la personnalisation IA ou modifiez manuellement.
                    </li>
                  )}
                </ul>
              )}
            </section>

            <section>
              <h3 className="text-lg font-semibold text-primary mb-3">CONDITIONS FINANCIÈRES</h3>
              <div className="space-y-3 text-sm">
                <p className="font-medium text-lg">
                  Montant: {formatAmount(contract.amount)} € HT
                </p>
                
                {isEditing ? (
                  <Textarea
                    value={editedContract.paymentTerms ?? contract.paymentTerms ?? ''}
                    onChange={(e) => setEditedContract({ ...editedContract, paymentTerms: e.target.value })}
                    rows={4}
                    placeholder="Conditions de paiement..."
                    className="text-sm"
                    data-testid="input-edit-payment-terms"
                  />
                ) : (
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {contract.paymentTerms || (
                      <span className="italic text-destructive">
                        Conditions de paiement non définies.
                      </span>
                    )}
                  </p>
                )}
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-primary mb-3">DURÉE DE LA MISSION</h3>
              <div className="space-y-2 text-sm">
                {contract.status === 'draft' ? (
                  <>
                    <DatePickerInline
                      value={contract.startDate}
                      onSave={(date) => updateContractMutation.mutate({ startDate: date })}
                      placeholder="Cliquez pour définir"
                      testId="button-start-date"
                      isPending={updateContractMutation.isPending}
                      label="Date de début"
                    />
                    <DatePickerInline
                      value={contract.endDate}
                      onSave={(date) => updateContractMutation.mutate({ endDate: date })}
                      placeholder="Cliquez pour définir"
                      testId="button-end-date"
                      isPending={updateContractMutation.isPending}
                      label="Date de fin"
                    />
                  </>
                ) : (
                  <>
                    <p>
                      <span className="text-muted-foreground">Date de début:</span>{' '}
                      {contract.startDate 
                        ? format(new Date(contract.startDate), "dd MMMM yyyy", { locale: fr })
                        : "Non définie"}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Date de fin:</span>{' '}
                      {contract.endDate 
                        ? format(new Date(contract.endDate), "dd MMMM yyyy", { locale: fr })
                        : "Non définie"}
                    </p>
                  </>
                )}
              </div>
            </section>

            <Separator className="my-8" />

            <section>
              <h3 className="text-lg font-semibold text-primary mb-6">SIGNATURES</h3>
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="font-medium mb-4">IA Infinity</p>
                  <div className="border-b border-foreground/30 h-16" />
                  <p className="text-xs text-muted-foreground mt-2">Signature</p>
                </div>
                <div>
                  <p className="font-medium mb-4">{contract.clientName}</p>
                  <div className="border-b border-foreground/30 h-16" />
                  <p className="text-xs text-muted-foreground mt-2">Signature</p>
                </div>
              </div>
            </section>
          </div>
        </div>

        {contract.status === 'draft' && (
          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Personnalisation IA</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                ChatGPT génère automatiquement le contenu du contrat selon le modèle {contract.type === 'audit' ? "d'Audit Général" : "de Prestation d'Automatisation"}.
              </p>
              <div className="space-y-2">
                <Label htmlFor="ai-instructions">Instructions supplémentaires (optionnel)</Label>
                <Textarea
                  id="ai-instructions"
                  placeholder="Ex: Préciser les délais, ajouter des clauses spécifiques..."
                  value={aiInstructions}
                  onChange={(e) => setAiInstructions(e.target.value)}
                  rows={2}
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
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <Check className="h-5 w-5" />
                <h3 className="font-semibold">Contrat personnalisé par ChatGPT</h3>
              </div>
              <p className="text-sm text-muted-foreground">Vérifiez le contenu et appliquez les modifications</p>
              
              {aiSuggestions.title && (
                <div>
                  <Label className="font-medium text-xs text-muted-foreground">Titre:</Label>
                  <p className="text-sm mt-1 p-3 bg-background rounded border">{aiSuggestions.title}</p>
                </div>
              )}
              {aiSuggestions.scope && (
                <div>
                  <Label className="font-medium text-xs text-muted-foreground">Objet du contrat:</Label>
                  <p className="text-sm mt-1 p-3 bg-background rounded border whitespace-pre-wrap">{aiSuggestions.scope}</p>
                </div>
              )}
              {aiSuggestions.deliverables && (
                <div>
                  <Label className="font-medium text-xs text-muted-foreground">Livrables:</Label>
                  <ul className="text-sm mt-1 p-3 bg-background rounded border list-disc pl-5">
                    {aiSuggestions.deliverables.map((d: string, i: number) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>
              )}
              {aiSuggestions.paymentTerms && (
                <div>
                  <Label className="font-medium text-xs text-muted-foreground">Conditions de paiement:</Label>
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

        {missingFields.length > 0 && contract.status === 'draft' && (
          <div className="flex items-center gap-2 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">
              Champs obligatoires manquants: <strong>{missingFields.join(', ')}</strong>
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
