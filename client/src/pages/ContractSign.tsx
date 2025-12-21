import { useState, useRef } from 'react';
import { useParams } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import SignatureCanvas from 'react-signature-canvas';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Check, FileText, Building2, Calendar, Euro, RefreshCw, PenTool } from 'lucide-react';

const typeLabels: Record<string, string> = {
  audit: 'Audit',
  prestation: 'Prestation',
  formation: 'Formation',
  suivi: 'Suivi',
  sous_traitance: 'Sous-traitance',
};

export default function ContractSign() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const signaturePadRef = useRef<SignatureCanvas>(null);
  const [isSigning, setIsSigning] = useState(false);

  const { data: contract, isLoading, error, refetch } = useQuery<any>({
    queryKey: ['/api/contracts/public', id],
    queryFn: async () => {
      const response = await fetch(`/api/contracts/public/${id}`);
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Contrat non trouvé');
      }
      return response.json();
    },
    enabled: !!id,
  });

  const signMutation = useMutation({
    mutationFn: async (signatureData: string) => {
      const response = await fetch(`/api/contracts/public/${id}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signatureData }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Échec de la signature');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Contrat signé avec succès', description: 'Merci pour votre signature.' });
      refetch();
    },
    onError: (error: any) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });

  const handleSign = () => {
    if (!signaturePadRef.current || signaturePadRef.current.isEmpty()) {
      toast({ title: 'Veuillez signer', description: 'Dessinez votre signature dans la zone prévue.', variant: 'destructive' });
      return;
    }
    const signatureData = signaturePadRef.current.toDataURL('image/png');
    signMutation.mutate(signatureData);
  };

  const clearSignature = () => {
    signaturePadRef.current?.clear();
  };

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
            <CardDescription>
              {(error as Error)?.message || 'Ce lien de signature est invalide ou a expiré.'}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const isAlreadySigned = contract.clientSignatureData || contract.status === 'signed' || contract.status === 'active' || contract.status === 'completed';

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Signature de contrat</h1>
          <p className="text-muted-foreground">IA Infinity</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {contract.title}
                </CardTitle>
                <CardDescription>{contract.contractNumber}</CardDescription>
              </div>
              <Badge>{typeLabels[contract.type] || contract.type}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span>{contract.clientCompany || contract.clientName}</span>
              </div>
              {contract.amount && (
                <div className="flex items-center gap-2 text-sm">
                  <Euro className="h-4 w-4 text-muted-foreground" />
                  <span>{contract.amount} {contract.currency || 'EUR'}</span>
                </div>
              )}
              {contract.startDate && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Début: {format(new Date(contract.startDate), 'dd MMMM yyyy', { locale: fr })}</span>
                </div>
              )}
              {contract.endDate && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Fin: {format(new Date(contract.endDate), 'dd MMMM yyyy', { locale: fr })}</span>
                </div>
              )}
            </div>

            {contract.scope && (
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Objet du contrat</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{contract.scope}</p>
              </div>
            )}

            {contract.driveWebViewLink && (
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Document complet</h4>
                <Button variant="outline" onClick={() => window.open(contract.driveWebViewLink, '_blank')}>
                  <FileText className="mr-2 h-4 w-4" />
                  Voir le contrat sur Google Drive
                </Button>
              </div>
            )}

            {isAlreadySigned ? (
              <div className="border-t pt-4">
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                    <Check className="h-5 w-5" />
                    <span className="font-medium">Ce contrat a déjà été signé</span>
                  </div>
                  {contract.signedAt && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Signé le {format(new Date(contract.signedAt), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                    </p>
                  )}
                  {contract.clientSignatureData && (
                    <div className="mt-4">
                      <img 
                        src={contract.clientSignatureData} 
                        alt="Signature" 
                        className="max-h-24 bg-white rounded border p-2"
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="border-t pt-4">
                <h4 className="font-medium mb-4 flex items-center gap-2">
                  <PenTool className="h-4 w-4" />
                  Votre signature
                </h4>
                <div className="border rounded-lg bg-white p-2">
                  <SignatureCanvas
                    ref={signaturePadRef}
                    canvasProps={{
                      className: 'w-full h-40 border rounded cursor-crosshair',
                      style: { width: '100%', height: '160px' },
                    }}
                    backgroundColor="white"
                    penColor="black"
                  />
                </div>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" onClick={clearSignature}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Effacer
                  </Button>
                  <Button 
                    onClick={handleSign}
                    disabled={signMutation.isPending}
                    className="flex-1"
                  >
                    {signMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="mr-2 h-4 w-4" />
                    )}
                    Signer le contrat
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  En signant ce contrat, vous acceptez les termes et conditions décrits dans le document.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Propulsé par IA Infinity
        </p>
      </div>
    </div>
  );
}
