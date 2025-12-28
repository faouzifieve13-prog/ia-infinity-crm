import { useState, useRef, useMemo } from 'react';
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import SignatureCanvas from 'react-signature-canvas';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, CheckCircle, Clock, AlertCircle, Loader2, Check, RefreshCw, PenTool, Download } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import logoIAInfinity from '@assets/logo_iA_Infinity_1766415032734.png';

interface QuoteLineItem {
  id: string;
  description: string;
  quantity: string;
  unit: string | null;
  unitPrice: string;
  vatRate: string | null;
  totalHt: string;
  sortOrder: number | null;
}

interface PublicQuote {
  id: string;
  number: string;
  title: string;
  description: string | null;
  amount: string;
  vatRate: string | null;
  vatAmount: string | null;
  totalWithVat: string | null;
  validityDays: number | null;
  expiresAt: string | null;
  termsAndConditions: string | null;
  paymentTerms: string | null;
  notes: string | null;
  status: string;
  quoteUrl: string | null;
  pdfUrl: string | null;
  driveFileUrl: string | null;
  adminSignature: boolean;
  adminSignedAt: string | null;
  adminSignedBy: string | null;
  clientSignature: boolean;
  clientSignedAt: string | null;
  clientSignedBy: string | null;
  accountName: string | null;
  clientName: string | null;
  createdAt: string;
  lineItems: QuoteLineItem[];
}

export default function SignQuote() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const signaturePadRef = useRef<SignatureCanvas>(null);
  const [signedQuote, setSignedQuote] = useState<any>(null);

  const token = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('token') || '';
  }, []);

  const { data: fetchedQuote, isLoading, error } = useQuery<PublicQuote>({
    queryKey: ["/api/quotes", id, "public", token],
    queryFn: async () => {
      const url = token
        ? `/api/quotes/${id}/public?token=${token}`
        : `/api/quotes/${id}/public`;
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur de chargement");
      }
      return response.json();
    },
    enabled: !!id && !signedQuote,
  });

  const quote = signedQuote || fetchedQuote;

  const signMutation = useMutation({
    mutationFn: async (signatureData: string) => {
      const response = await fetch(`/api/quotes/${id}/sign-client`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signature: signatureData,
          clientName: quote?.clientName || quote?.accountName || 'Client',
          token
        }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Erreur de signature');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes", id, "public"] });
      toast({
        title: "Devis signé avec succès",
        description: "Merci pour votre signature. Le devis a été enregistré.",
      });
      if (data.quote) {
        setSignedQuote({
          ...quote,
          clientSignature: true,
          clientSignedAt: new Date().toISOString(),
          clientSignedBy: quote?.clientName || quote?.accountName || 'Client'
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'enregistrer la signature",
        variant: "destructive",
      });
    },
  });

  const handleSign = () => {
    if (!signaturePadRef.current || signaturePadRef.current.isEmpty()) {
      toast({
        title: 'Veuillez signer',
        description: 'Dessinez votre signature dans la zone prévue.',
        variant: 'destructive'
      });
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Chargement du devis...</span>
        </div>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive mb-2">
              <AlertCircle className="h-5 w-5" />
              <span className="font-semibold">Erreur d'accès</span>
            </div>
            <p className="text-muted-foreground">
              {(error as Error)?.message || "Ce devis n'existe pas ou le lien a expiré."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isAlreadySigned = quote.clientSignature;
  const isFullySigned = quote.adminSignature && quote.clientSignature;

  const formatAmount = (amount: string) => {
    const num = parseFloat(amount);
    return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
  };

  return (
    <div className="min-h-screen bg-muted/30 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-background rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-primary text-primary-foreground p-6">
            <div className="flex items-center gap-4">
              <img
                src={logoIAInfinity}
                alt="IA Infinity"
                className="h-14 w-auto bg-white/10 rounded-lg p-1"
              />
              <div>
                <h1 className="text-2xl font-bold">IA Infinity</h1>
                <p className="opacity-90">Devis N° {quote.number}</p>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-6">
            {/* Welcome message */}
            <div>
              <p className="text-lg font-medium mb-1">Bonjour {quote.clientName || quote.accountName},</p>
              <p className="text-muted-foreground">
                Veuillez trouver ci-dessous les détails de votre devis. Pour finaliser, veuillez le consulter et le signer électroniquement.
              </p>
            </div>

            {/* Quote Summary Card */}
            <Card className="border">
              <CardContent className="p-6 space-y-4">
                <div>
                  <h3 className="text-xl font-semibold">{quote.title}</h3>
                  <p className="text-sm text-muted-foreground">N° {quote.number}</p>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Montant HT</p>
                    <p className="text-lg font-semibold text-primary">{formatAmount(quote.amount)} €</p>
                  </div>
                  {quote.totalWithVat && (
                    <div>
                      <p className="text-sm text-muted-foreground">Montant TTC</p>
                      <p className="text-lg font-semibold">{formatAmount(quote.totalWithVat)} €</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Date d'émission</p>
                    <p className="font-medium">{format(new Date(quote.createdAt), 'dd MMMM yyyy', { locale: fr })}</p>
                  </div>
                  {quote.expiresAt && (
                    <div>
                      <p className="text-sm text-muted-foreground">Valide jusqu'au</p>
                      <p className="font-medium">{format(new Date(quote.expiresAt), 'dd MMMM yyyy', { locale: fr })}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Description */}
            {quote.description && (
              <section>
                <h3 className="text-lg font-semibold text-primary mb-3">DESCRIPTION</h3>
                <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                  {quote.description}
                </p>
              </section>
            )}

            {/* Line Items Table */}
            {quote.lineItems && quote.lineItems.length > 0 && (
              <section>
                <h3 className="text-lg font-semibold text-primary mb-3">DÉTAIL DES PRESTATIONS</h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Quantité</TableHead>
                        <TableHead className="text-right">Prix unitaire</TableHead>
                        <TableHead className="text-right">Total HT</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {quote.lineItems.map((item: QuoteLineItem) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.description}</TableCell>
                          <TableCell className="text-right">{item.quantity} {item.unit || ''}</TableCell>
                          <TableCell className="text-right">{formatAmount(item.unitPrice)} €</TableCell>
                          <TableCell className="text-right font-semibold">{formatAmount(item.totalHt)} €</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Totals */}
                <div className="mt-4 flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Total HT</span>
                      <span className="font-semibold">{formatAmount(quote.amount)} €</span>
                    </div>
                    {quote.vatRate && quote.vatAmount && (
                      <div className="flex justify-between text-sm">
                        <span>TVA ({quote.vatRate}%)</span>
                        <span>{formatAmount(quote.vatAmount)} €</span>
                      </div>
                    )}
                    {quote.totalWithVat && (
                      <div className="flex justify-between text-base font-bold border-t pt-2">
                        <span>Total TTC</span>
                        <span className="text-primary">{formatAmount(quote.totalWithVat)} €</span>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* Payment Terms */}
            {quote.paymentTerms && (
              <section>
                <h3 className="text-lg font-semibold text-primary mb-3">CONDITIONS DE PAIEMENT</h3>
                <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                  {quote.paymentTerms}
                </p>
              </section>
            )}

            {/* Terms and Conditions */}
            {quote.termsAndConditions && (
              <section>
                <h3 className="text-lg font-semibold text-primary mb-3">CONDITIONS GÉNÉRALES</h3>
                <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                  {quote.termsAndConditions}
                </p>
              </section>
            )}

            {/* Notes */}
            {quote.notes && (
              <section>
                <h3 className="text-lg font-semibold text-primary mb-3">NOTES</h3>
                <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                  {quote.notes}
                </p>
              </section>
            )}

            {/* External links */}
            {(quote.quoteUrl || quote.driveFileUrl) && (
              <div className="flex flex-wrap gap-2">
                {quote.driveFileUrl && (
                  <Button
                    variant="outline"
                    onClick={() => window.open(quote.driveFileUrl!, '_blank')}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Télécharger le PDF
                  </Button>
                )}
              </div>
            )}

            <Separator className="my-6" />

            {/* Signature Status */}
            <section className="space-y-4">
              <h3 className="text-lg font-semibold text-primary">ÉTAT DES SIGNATURES</h3>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  {quote.adminSignature ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <Clock className="h-5 w-5 text-amber-500" />
                  )}
                  <div>
                    <p className="font-medium">Signature prestataire</p>
                    {quote.adminSignedBy && quote.adminSignedAt && (
                      <p className="text-sm text-muted-foreground">
                        Signé par {quote.adminSignedBy} le{" "}
                        {format(new Date(quote.adminSignedAt), 'dd MMMM yyyy', { locale: fr })}
                      </p>
                    )}
                  </div>
                </div>
                <Badge variant={quote.adminSignature ? "default" : "secondary"}>
                  {quote.adminSignature ? "Signé" : "En attente"}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  {quote.clientSignature ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <Clock className="h-5 w-5 text-amber-500" />
                  )}
                  <div>
                    <p className="font-medium">Signature client</p>
                    {quote.clientSignedBy && quote.clientSignedAt && (
                      <p className="text-sm text-muted-foreground">
                        Signé par {quote.clientSignedBy} le{" "}
                        {format(new Date(quote.clientSignedAt), 'dd MMMM yyyy', { locale: fr })}
                      </p>
                    )}
                  </div>
                </div>
                <Badge variant={quote.clientSignature ? "default" : "secondary"}>
                  {quote.clientSignature ? "Signé" : "En attente"}
                </Badge>
              </div>
            </section>

            <Separator className="my-6" />

            {/* Signature Section */}
            {isAlreadySigned ? (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-2">
                  <Check className="h-5 w-5" />
                  <span className="font-semibold text-lg">Devis signé</span>
                </div>
                {quote.clientSignedAt && (
                  <p className="text-sm text-muted-foreground">
                    Signé le {format(new Date(quote.clientSignedAt), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                  </p>
                )}
                {isFullySigned && (
                  <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                    Les deux parties ont signé ce devis. Le document est maintenant valide.
                  </p>
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
                    {quote.adminSignature ? (
                      <div className="h-20 border-b border-foreground/30 flex items-end pb-2">
                        <span className="text-sm text-green-600">Signé par {quote.adminSignedBy}</span>
                      </div>
                    ) : (
                      <div className="border-b border-foreground/30 h-12" />
                    )}
                    <p className="text-xs text-muted-foreground mt-1">Prestataire</p>
                  </div>
                  <div>
                    <p className="font-medium mb-2">{quote.clientName || quote.accountName}</p>
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
                    data-testid="button-sign-quote"
                  >
                    {signMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="mr-2 h-4 w-4" />
                    )}
                    Signer le devis
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  En signant ce devis, vous acceptez les conditions décrites dans le document.
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
