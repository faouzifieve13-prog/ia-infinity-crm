import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Euro, Calendar, CheckCircle, Clock, ExternalLink, Pen } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Link } from "wouter";

interface ClientQuote {
  id: string;
  number: string;
  title: string;
  amount: string;
  status: string;
  quoteUrl: string | null;
  driveFileUrl: string | null;
  adminSignature: string | null;
  adminSignedAt: string | null;
  adminSignedBy: string | null;
  clientSignature: string | null;
  clientSignedAt: string | null;
  clientSignedBy: string | null;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-500/20 text-blue-600 border-blue-500/30",
  signed: "bg-green-500/20 text-green-600 border-green-500/30",
  rejected: "bg-red-500/20 text-red-600 border-red-500/30",
  expired: "bg-muted text-muted-foreground",
};

const statusLabels: Record<string, string> = {
  draft: "Brouillon",
  sent: "En attente de signature",
  signed: "Signé",
  rejected: "Refusé",
  expired: "Expiré",
};

export default function ClientQuotes() {
  const { data: quotes, isLoading } = useQuery<ClientQuote[]>({
    queryKey: ["/api/client/quotes"],
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">Mes devis</h1>
          <p className="text-muted-foreground">Consultez et signez vos devis</p>
        </div>
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
      </div>
    );
  }

  const pendingQuotes = quotes?.filter(q => q.adminSignature && !q.clientSignature) || [];
  const signedQuotes = quotes?.filter(q => q.adminSignature && q.clientSignature) || [];
  const otherQuotes = quotes?.filter(q => !q.adminSignature) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Mes devis</h1>
        <p className="text-muted-foreground">Consultez et signez vos devis</p>
      </div>

      {pendingQuotes.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-medium flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            En attente de votre signature
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pendingQuotes.map((quote) => (
              <Card key={quote.id} className="border-amber-500/50 hover-elevate" data-testid={`card-pending-quote-${quote.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{quote.number}</CardTitle>
                      <CardDescription className="line-clamp-1">{quote.title}</CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-amber-500/20 text-amber-600 border-amber-500/30">
                      À signer
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-xl font-bold">
                    <Euro className="h-5 w-5 text-muted-foreground" />
                    {parseFloat(quote.amount).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(quote.createdAt), "dd MMMM yyyy", { locale: fr })}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    Signé par {quote.adminSignedBy}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button className="w-full" asChild>
                    <Link href={`/sign-quote/${quote.id}`}>
                      <Pen className="h-4 w-4 mr-2" />
                      Signer le devis
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      )}

      {signedQuotes.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-medium flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Devis signés
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {signedQuotes.map((quote) => (
              <Card key={quote.id} className="border-green-500/30 hover-elevate" data-testid={`card-signed-quote-${quote.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{quote.number}</CardTitle>
                      <CardDescription className="line-clamp-1">{quote.title}</CardDescription>
                    </div>
                    <Badge variant="outline" className={statusColors.signed}>
                      Signé
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-lg font-semibold">
                    <Euro className="h-4 w-4 text-muted-foreground" />
                    {parseFloat(quote.amount).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €
                  </div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Prestataire: {quote.adminSignedBy}
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Vous: {quote.clientSignedBy}
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
                  {quote.driveFileUrl && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={quote.driveFileUrl} target="_blank" rel="noopener noreferrer">
                        <FileText className="h-4 w-4 mr-1" />
                        PDF
                      </a>
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      )}

      {otherQuotes.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-medium">Autres devis</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {otherQuotes.map((quote) => (
              <Card key={quote.id} className="hover-elevate" data-testid={`card-quote-${quote.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{quote.number}</CardTitle>
                      <CardDescription className="line-clamp-1">{quote.title}</CardDescription>
                    </div>
                    <Badge variant="outline" className={statusColors[quote.status] || statusColors.draft}>
                      {statusLabels[quote.status] || quote.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-lg font-semibold">
                    <Euro className="h-4 w-4 text-muted-foreground" />
                    {parseFloat(quote.amount).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(quote.createdAt), "dd MMMM yyyy", { locale: fr })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {(!quotes || quotes.length === 0) && (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Aucun devis</h3>
            <p className="text-muted-foreground">
              Vous n'avez pas encore de devis.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}