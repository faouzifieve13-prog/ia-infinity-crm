import { useQuery, useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExternalLink, FileText, Calendar, Euro, Building2, RefreshCw, Pen, CheckCircle, Clock, Link, Copy, Send } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { SignaturePad, SignatureDisplay } from '@/components/SignaturePad';

interface QontoQuote {
  id: string;
  number: string;
  status: string;
  quote_url?: string;
  total_amount?: {
    value: string;
    currency: string;
  };
  issue_date: string;
  expiry_date: string;
  client?: {
    name: string;
  };
}

interface LocalQuote {
  id: string;
  orgId: string;
  dealId: string;
  accountId: string | null;
  qontoQuoteId: string | null;
  number: string;
  title: string;
  amount: string;
  quoteUrl: string | null;
  pdfUrl: string | null;
  status: string;
  driveFileId: string | null;
  driveFileUrl: string | null;
  sentAt: string | null;
  adminSignature: string | null;
  adminSignedAt: string | null;
  adminSignedBy: string | null;
  clientSignature: string | null;
  clientSignedAt: string | null;
  clientSignedBy: string | null;
  signedPdfUrl: string | null;
  signedPdfDriveId: string | null;
  signatureToken: string | null;
  signatureTokenExpiresAt: string | null;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  sent: 'bg-blue-500/20 text-blue-600 border-blue-500/30',
  pending: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
  signed: 'bg-green-500/20 text-green-500 border-green-500/30',
  accepted: 'bg-green-500/20 text-green-500 border-green-500/30',
  declined: 'bg-red-500/20 text-red-500 border-red-500/30',
  rejected: 'bg-red-500/20 text-red-500 border-red-500/30',
  expired: 'bg-muted text-muted-foreground',
};

const statusLabels: Record<string, string> = {
  draft: 'Brouillon',
  sent: 'Envoyé',
  pending: 'En attente',
  signed: 'Signé',
  accepted: 'Accepté',
  declined: 'Refusé',
  rejected: 'Refusé',
  expired: 'Expiré',
};

function QuoteSignatureDialog({ quote, onClose }: { quote: LocalQuote; onClose: () => void }) {
  const { toast } = useToast();
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  const signMutation = useMutation({
    mutationFn: async (signatureData: string) => {
      return apiRequest("POST", `/api/quotes/${quote.id}/sign-admin`, { signature: signatureData });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/quotes/all'] });
      toast({
        title: "Signature enregistrée",
        description: "Votre signature a été ajoutée au devis.",
      });
      setShowSignaturePad(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de signer le devis",
        variant: "destructive",
      });
    },
  });

  const generateLinkMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/quotes/${quote.id}/generate-signature-token`, {});
      return response.json();
    },
    onSuccess: (data: any) => {
      const fullUrl = `${window.location.origin}${data.signatureUrl}`;
      setGeneratedLink(fullUrl);
      toast({
        title: "Lien généré",
        description: "Le lien de signature a été créé.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de générer le lien",
        variant: "destructive",
      });
    },
  });

  const copyLink = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      toast({
        title: "Copié",
        description: "Le lien a été copié dans le presse-papiers.",
      });
    }
  };

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Signature du devis {quote.number}</DialogTitle>
        <DialogDescription>{quote.title}</DialogDescription>
      </DialogHeader>

      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="p-4 rounded-lg bg-muted/50 space-y-2">
            <div className="flex items-center gap-2">
              {quote.adminSignature ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <Clock className="h-5 w-5 text-amber-500" />
              )}
              <span className="font-medium">Signature prestataire</span>
            </div>
            {quote.adminSignedBy && quote.adminSignedAt ? (
              <div className="text-sm text-muted-foreground">
                <p>Signé par {quote.adminSignedBy}</p>
                <p>Le {format(new Date(quote.adminSignedAt), 'dd/MM/yyyy HH:mm', { locale: fr })}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">En attente de signature</p>
            )}
          </div>

          <div className="p-4 rounded-lg bg-muted/50 space-y-2">
            <div className="flex items-center gap-2">
              {quote.clientSignature ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <Clock className="h-5 w-5 text-amber-500" />
              )}
              <span className="font-medium">Signature client</span>
            </div>
            {quote.clientSignedBy && quote.clientSignedAt ? (
              <div className="text-sm text-muted-foreground">
                <p>Signé par {quote.clientSignedBy}</p>
                <p>Le {format(new Date(quote.clientSignedAt), 'dd/MM/yyyy HH:mm', { locale: fr })}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">En attente de signature</p>
            )}
          </div>
        </div>

        {!quote.adminSignature && !showSignaturePad && (
          <Button onClick={() => setShowSignaturePad(true)} className="w-full" data-testid="button-open-admin-signature">
            <Pen className="mr-2 h-4 w-4" />
            Signer en tant que prestataire
          </Button>
        )}

        {showSignaturePad && (
          <SignaturePad
            title="Votre signature"
            description="Signez pour valider le devis en tant que prestataire"
            onSave={(data) => signMutation.mutate(data)}
            onCancel={() => setShowSignaturePad(false)}
          />
        )}

        {quote.adminSignature && (
          <div className="space-y-4">
            <h4 className="font-medium">Lien de signature client</h4>
            {generatedLink ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={generatedLink}
                  className="flex-1 px-3 py-2 text-sm border rounded-md bg-muted"
                />
                <Button size="icon" variant="outline" onClick={copyLink}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={() => generateLinkMutation.mutate()}
                disabled={generateLinkMutation.isPending}
                className="w-full"
                data-testid="button-generate-signature-link"
              >
                <Link className="mr-2 h-4 w-4" />
                Générer un lien de signature pour le client
              </Button>
            )}
            <p className="text-xs text-muted-foreground">
              Ce lien permet au client de signer le devis en ligne. Valide 30 jours.
            </p>
          </div>
        )}
      </div>
    </DialogContent>
  );
}

export default function Quotes() {
  const { toast } = useToast();
  const [selectedQuote, setSelectedQuote] = useState<LocalQuote | null>(null);

  const { data: qontoQuotes, isLoading: qontoLoading, refetch, isRefetching } = useQuery<QontoQuote[]>({
    queryKey: ['/api/qonto/quotes'],
  });

  const { data: localQuotes, isLoading: localLoading } = useQuery<LocalQuote[]>({
    queryKey: ['/api/quotes/all'],
  });

  const { data: qontoStatus } = useQuery<{ connected: boolean; organization?: string }>({
    queryKey: ['/api/qonto/status'],
  });

  const handleRefresh = () => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ['/api/quotes/all'] });
  };

  const quotesWithSignatures = localQuotes?.filter(q => q.adminSignature || q.clientSignature) || [];
  const pendingSignatures = localQuotes?.filter(q => !q.adminSignature || !q.clientSignature) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-3xl font-semibold">Devis</h1>
          <p className="text-muted-foreground">
            Gérez vos devis et signatures électroniques
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleRefresh}
          disabled={isRefetching}
          data-testid="button-refresh-quotes"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">Tous les devis</TabsTrigger>
          <TabsTrigger value="pending">
            En attente de signature
            {pendingSignatures.length > 0 && (
              <Badge variant="secondary" className="ml-2">{pendingSignatures.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="signed">Signés</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {qontoLoading || localLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-5 w-32" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-24" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {localQuotes?.map((quote) => (
                <Card key={quote.id} className="hover-elevate" data-testid={`card-quote-${quote.id}`}>
                  <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                    <div className="space-y-1">
                      <CardTitle className="text-base font-medium">
                        {quote.number}
                      </CardTitle>
                      <CardDescription className="line-clamp-1">{quote.title}</CardDescription>
                    </div>
                    <Badge variant="outline" className={statusColors[quote.status] || statusColors.draft}>
                      {statusLabels[quote.status] || quote.status}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-lg font-semibold">
                      <Euro className="h-4 w-4 text-muted-foreground" />
                      {parseFloat(quote.amount).toLocaleString('fr-FR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })} €
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(quote.createdAt), 'dd MMM yyyy', { locale: fr })}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {quote.adminSignature ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <Clock className="h-4 w-4 text-amber-500" />
                      )}
                      <span className="text-muted-foreground">Prestataire</span>
                      {quote.clientSignature ? (
                        <CheckCircle className="h-4 w-4 text-green-600 ml-2" />
                      ) : (
                        <Clock className="h-4 w-4 text-amber-500 ml-2" />
                      )}
                      <span className="text-muted-foreground">Client</span>
                    </div>
                  </CardContent>
                  <CardFooter className="flex gap-2">
                    {quote.quoteUrl && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={quote.quoteUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Qonto
                        </a>
                      </Button>
                    )}
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" onClick={() => setSelectedQuote(quote)} data-testid={`button-sign-quote-${quote.id}`}>
                          <Pen className="h-4 w-4 mr-1" />
                          Signer
                        </Button>
                      </DialogTrigger>
                      {selectedQuote?.id === quote.id && (
                        <QuoteSignatureDialog quote={quote} onClose={() => setSelectedQuote(null)} />
                      )}
                    </Dialog>
                  </CardFooter>
                </Card>
              ))}
              
              {(!localQuotes || localQuotes.length === 0) && (!qontoQuotes || qontoQuotes.length === 0) && (
                <Card className="col-span-full">
                  <CardContent className="py-12 text-center">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">Aucun devis</h3>
                    <p className="text-muted-foreground">
                      Créez votre premier devis depuis la page d'un deal.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pending" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pendingSignatures.map((quote) => (
              <Card key={quote.id} className="hover-elevate border-amber-500/30" data-testid={`card-pending-quote-${quote.id}`}>
                <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-medium">{quote.number}</CardTitle>
                    <CardDescription className="line-clamp-1">{quote.title}</CardDescription>
                  </div>
                  <Badge variant="outline" className="bg-amber-500/20 text-amber-600 border-amber-500/30">
                    En attente
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-lg font-semibold">
                    <Euro className="h-4 w-4 text-muted-foreground" />
                    {parseFloat(quote.amount).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                  </div>
                  <div className="space-y-1 text-sm">
                    {!quote.adminSignature && (
                      <div className="flex items-center gap-2 text-amber-600">
                        <Clock className="h-4 w-4" />
                        Signature prestataire requise
                      </div>
                    )}
                    {quote.adminSignature && !quote.clientSignature && (
                      <div className="flex items-center gap-2 text-amber-600">
                        <Clock className="h-4 w-4" />
                        Signature client requise
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="w-full" onClick={() => setSelectedQuote(quote)}>
                        <Pen className="h-4 w-4 mr-2" />
                        Gérer les signatures
                      </Button>
                    </DialogTrigger>
                    {selectedQuote?.id === quote.id && (
                      <QuoteSignatureDialog quote={quote} onClose={() => setSelectedQuote(null)} />
                    )}
                  </Dialog>
                </CardFooter>
              </Card>
            ))}
            {pendingSignatures.length === 0 && (
              <Card className="col-span-full">
                <CardContent className="py-12 text-center">
                  <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <h3 className="text-lg font-medium mb-2">Aucun devis en attente</h3>
                  <p className="text-muted-foreground">
                    Tous les devis ont été signés.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="signed" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {quotesWithSignatures.filter(q => q.adminSignature && q.clientSignature).map((quote) => (
              <Card key={quote.id} className="hover-elevate border-green-500/30" data-testid={`card-signed-quote-${quote.id}`}>
                <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-medium">{quote.number}</CardTitle>
                    <CardDescription className="line-clamp-1">{quote.title}</CardDescription>
                  </div>
                  <Badge variant="outline" className="bg-green-500/20 text-green-600 border-green-500/30">
                    Signé
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-lg font-semibold">
                    <Euro className="h-4 w-4 text-muted-foreground" />
                    {parseFloat(quote.amount).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                  </div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Prestataire: {quote.adminSignedBy}
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Client: {quote.clientSignedBy}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex gap-2">
                  {quote.quoteUrl && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={quote.quoteUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Voir
                      </a>
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
            {quotesWithSignatures.filter(q => q.adminSignature && q.clientSignature).length === 0 && (
              <Card className="col-span-full">
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Aucun devis entièrement signé</h3>
                  <p className="text-muted-foreground">
                    Les devis signés par les deux parties apparaîtront ici.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}