import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useSearch } from "wouter";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SignaturePad, SignatureDisplay } from "@/components/SignaturePad";
import { FileText, CheckCircle, Clock, AlertCircle, ExternalLink, Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PublicQuote {
  id: string;
  number: string;
  title: string;
  amount: string;
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
  createdAt: string;
}

export default function SignQuote() {
  const { id } = useParams<{ id: string }>();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const token = searchParams.get("token");
  const { toast } = useToast();
  
  const [clientName, setClientName] = useState("");
  const [showSignature, setShowSignature] = useState(false);

  const { data: quote, isLoading, error } = useQuery<PublicQuote>({
    queryKey: ["/api/quotes", id, "public"],
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
    enabled: !!id,
  });

  const signMutation = useMutation({
    mutationFn: async (signatureData: string) => {
      return apiRequest("POST", `/api/quotes/${id}/sign-client`, {
        signature: signatureData,
        clientName,
        token
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes", id, "public"] });
      toast({
        title: "Signature enregistrée",
        description: "Votre signature a bien été enregistrée sur le devis.",
      });
      setShowSignature(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'enregistrer la signature",
        variant: "destructive",
      });
    },
  });

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
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Erreur d'accès
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {(error as Error)?.message || "Ce devis n'existe pas ou le lien a expiré."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isFullySigned = quote.adminSignature && quote.clientSignature;
  const formatAmount = (amount: string) => {
    return parseFloat(amount).toLocaleString('fr-FR', { 
      style: 'currency', 
      currency: 'EUR' 
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">IA Infinity</h1>
          <p className="text-muted-foreground">Signature électronique de devis</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Devis {quote.number}
                </CardTitle>
                <CardDescription>{quote.title}</CardDescription>
              </div>
              <Badge 
                variant={
                  quote.status === 'signed' ? 'default' :
                  quote.status === 'sent' ? 'secondary' :
                  'outline'
                }
              >
                {quote.status === 'signed' ? 'Signé' :
                 quote.status === 'sent' ? 'En attente' :
                 quote.status === 'draft' ? 'Brouillon' :
                 quote.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4">
              <div className="flex justify-between items-center py-3 border-b">
                <span className="text-muted-foreground">Client</span>
                <span className="font-medium">{quote.accountName || "Non spécifié"}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b">
                <span className="text-muted-foreground">Montant HT</span>
                <span className="font-bold text-lg">{formatAmount(quote.amount)}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b">
                <span className="text-muted-foreground">Date d'émission</span>
                <span>{new Date(quote.createdAt).toLocaleDateString('fr-FR')}</span>
              </div>
            </div>

            {(quote.quoteUrl || quote.driveFileUrl || quote.pdfUrl) && (
              <div className="flex flex-wrap gap-2">
                {quote.quoteUrl && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={quote.quoteUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Voir sur Qonto
                    </a>
                  </Button>
                )}
                {quote.driveFileUrl && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={quote.driveFileUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Voir le PDF
                    </a>
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>État des signatures</CardTitle>
            <CardDescription>
              Ce devis nécessite la signature du prestataire et du client
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
                      {new Date(quote.adminSignedAt).toLocaleDateString('fr-FR')}
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
                      {new Date(quote.clientSignedAt).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                </div>
              </div>
              <Badge variant={quote.clientSignature ? "default" : "secondary"}>
                {quote.clientSignature ? "Signé" : "En attente"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {!quote.clientSignature && !showSignature && (
          <Card>
            <CardHeader>
              <CardTitle>Signer le devis</CardTitle>
              <CardDescription>
                Entrez votre nom complet pour procéder à la signature
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="clientName">Votre nom complet</Label>
                <Input
                  id="clientName"
                  placeholder="Jean Dupont"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  data-testid="input-client-name"
                />
              </div>
              <Button 
                className="w-full" 
                onClick={() => setShowSignature(true)}
                disabled={!clientName.trim()}
                data-testid="button-start-signature"
              >
                Procéder à la signature
              </Button>
            </CardContent>
          </Card>
        )}

        {showSignature && !quote.clientSignature && (
          <SignaturePad
            title="Votre signature"
            description="Signez dans le cadre ci-dessous pour valider le devis"
            signerName={clientName}
            onSave={(signatureData) => signMutation.mutate(signatureData)}
            onCancel={() => setShowSignature(false)}
          />
        )}

        {isFullySigned && (
          <Card className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-green-700 dark:text-green-400">
                <CheckCircle className="h-6 w-6" />
                <div>
                  <p className="font-medium">Devis entièrement signé</p>
                  <p className="text-sm opacity-80">
                    Les deux parties ont signé ce devis. Le contrat est maintenant en vigueur.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}