import { useState, useRef, useMemo, useCallback } from 'react';
import { useParams } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import SignatureCanvas from 'react-signature-canvas';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Check, FileText, RefreshCw, PenTool, Download } from 'lucide-react';
import logoIAInfinity from '@assets/logo_iA_Infinity_1766415032734.png';

const typeLabels: Record<string, string> = {
  audit: "Contrat d'Audit",
  prestation: "Contrat de Prestation",
  formation: "Contrat de Formation",
  suivi: "Contrat de Suivi",
  sous_traitance: "Contrat de Sous-Traitance",
};

export default function ContractSign() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const signaturePadRef = useRef<SignatureCanvas>(null);
  const queryClient = useQueryClient();
  const [signedContract, setSignedContract] = useState<any>(null);
  
  const token = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('token') || '';
  }, []);

  const { data: fetchedContract, isLoading, error } = useQuery<any>({
    queryKey: ['/api/contracts/public', id, token],
    queryFn: async () => {
      const response = await fetch(`/api/contracts/public/${id}?token=${encodeURIComponent(token)}`);
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Contrat non trouvé');
      }
      return response.json();
    },
    enabled: !!id && !!token && !signedContract,
  });

  const contract = signedContract || fetchedContract;

  const signMutation = useMutation({
    mutationFn: async (signatureData: string) => {
      const response = await fetch(`/api/contracts/public/${id}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signatureData, token }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Échec de la signature');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({ title: 'Contrat signé avec succès', description: 'Merci pour votre signature. Le contrat a été enregistré.' });
      if (data.contract) {
        setSignedContract(data.contract);
      }
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

  if (!token) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-6">
          <h2 className="text-xl font-semibold text-destructive mb-2">Lien invalide</h2>
          <p className="text-muted-foreground">
            Ce lien de signature est invalide. Veuillez utiliser le lien complet reçu par email.
          </p>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-6">
          <h2 className="text-xl font-semibold text-destructive mb-2">Contrat non trouvé</h2>
          <p className="text-muted-foreground">
            {(error as Error)?.message || 'Ce lien de signature est invalide ou a expiré.'}
          </p>
        </Card>
      </div>
    );
  }

  const isAlreadySigned = contract.clientSignatureData || contract.status === 'signed' || contract.status === 'active' || contract.status === 'completed';

  const formatAmount = (amount: string) => {
    const num = parseFloat(amount);
    return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
  };

  return (
    <div className="min-h-screen bg-muted/30 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
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
              </div>
            </div>
          </div>

          <div className="p-8 space-y-6">
            <div>
              <p className="text-lg font-medium mb-1">Bonjour {contract.clientName},</p>
              <p className="text-muted-foreground">
                Veuillez trouver ci-dessous les détails de votre contrat. Pour finaliser, veuillez le consulter et le signer électroniquement.
              </p>
            </div>

            <Card className="border">
              <CardContent className="p-6 space-y-4">
                <div>
                  <h3 className="text-xl font-semibold">{contract.title}</h3>
                  <p className="text-sm text-muted-foreground">N° {contract.contractNumber}</p>
                </div>
                
                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Montant</p>
                    <p className="text-lg font-semibold text-primary">{formatAmount(contract.amount)} €</p>
                  </div>
                  {contract.startDate && (
                    <div>
                      <p className="text-sm text-muted-foreground">Date de début</p>
                      <p className="font-medium">{format(new Date(contract.startDate), 'dd MMMM yyyy', { locale: fr })}</p>
                    </div>
                  )}
                  {contract.endDate && (
                    <div>
                      <p className="text-sm text-muted-foreground">Date de fin</p>
                      <p className="font-medium">{format(new Date(contract.endDate), 'dd MMMM yyyy', { locale: fr })}</p>
                    </div>
                  )}
                </div>

                {contract.paymentTerms && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Conditions de paiement</p>
                      <p className="text-sm whitespace-pre-wrap">{contract.paymentTerms}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <section>
              <h3 className="text-lg font-semibold text-primary mb-3">OBJET DU CONTRAT</h3>
              <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                {contract.scope || "Non défini"}
              </p>
            </section>

            {contract.deliverables && contract.deliverables.length > 0 && (
              <section>
                <h3 className="text-lg font-semibold text-primary mb-3">LIVRABLES</h3>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {contract.deliverables.map((d: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                onClick={() => window.open(`/api/contracts/${id}/public-pdf?token=${encodeURIComponent(token)}`, '_blank')}
                data-testid="button-download-pdf"
              >
                <Download className="mr-2 h-4 w-4" />
                Télécharger le contrat PDF
              </Button>
            </div>

            <Separator className="my-6" />

            {isAlreadySigned ? (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-2">
                  <Check className="h-5 w-5" />
                  <span className="font-semibold text-lg">Contrat signé</span>
                </div>
                {contract.signedAt && (
                  <p className="text-sm text-muted-foreground">
                    Signé le {format(new Date(contract.signedAt), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                  </p>
                )}
                {contract.clientSignatureData && (
                  <div className="mt-4">
                    <p className="text-xs text-muted-foreground mb-2">Votre signature:</p>
                    <img 
                      src={contract.clientSignatureData} 
                      alt="Signature" 
                      className="max-h-20 bg-white rounded border p-2"
                    />
                  </div>
                )}
              </div>
            ) : (
              <section>
                <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
                  <PenTool className="h-5 w-5" />
                  SIGNATURE
                </h3>
                
                <div className="grid grid-cols-2 gap-8 mb-6">
                  <div>
                    <p className="font-medium mb-2">IA Infinity</p>
                    <div className="border-b border-foreground/30 h-12" />
                    <p className="text-xs text-muted-foreground mt-1">Prestataire</p>
                  </div>
                  <div>
                    <p className="font-medium mb-2">{contract.clientName}</p>
                    <div className="border rounded-lg bg-white p-2">
                      <SignatureCanvas
                        ref={signaturePadRef}
                        canvasProps={{
                          className: 'w-full cursor-crosshair',
                          style: { width: '100%', height: '100px' },
                        }}
                        backgroundColor="white"
                        penColor="black"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Client - Dessinez votre signature ci-dessus</p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button variant="outline" onClick={clearSignature} data-testid="button-clear-signature">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Effacer
                  </Button>
                  <Button 
                    onClick={handleSign}
                    disabled={signMutation.isPending}
                    className="flex-1"
                    data-testid="button-sign-contract"
                  >
                    {signMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="mr-2 h-4 w-4" />
                    )}
                    Signer le contrat
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  En signant ce contrat, vous acceptez les termes et conditions décrits dans le document.
                </p>
              </section>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Propulsé par IA Infinity
        </p>
      </div>
    </div>
  );
}
