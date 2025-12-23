import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ExternalLink, FileText, Calendar, Euro, Building2, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { queryClient } from '@/lib/queryClient';

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

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  pending: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
  accepted: 'bg-green-500/20 text-green-500 border-green-500/30',
  declined: 'bg-red-500/20 text-red-500 border-red-500/30',
  expired: 'bg-muted text-muted-foreground',
};

const statusLabels: Record<string, string> = {
  draft: 'Brouillon',
  pending: 'En attente',
  accepted: 'Accepté',
  declined: 'Refusé',
  expired: 'Expiré',
};

export default function Quotes() {
  const { data: quotes, isLoading, refetch, isRefetching } = useQuery<QontoQuote[]>({
    queryKey: ['/api/qonto/quotes'],
  });

  const { data: qontoStatus } = useQuery<{ connected: boolean; organization?: string }>({
    queryKey: ['/api/qonto/status'],
  });

  const handleRefresh = () => {
    refetch();
  };

  if (!qontoStatus?.connected) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Devis Qonto</h1>
            <p className="text-muted-foreground">Gérez vos devis générés via Qonto</p>
          </div>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Qonto non connecté</h3>
            <p className="text-muted-foreground">
              Configurez vos identifiants API Qonto pour accéder à vos devis.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Devis Qonto</h1>
          <p className="text-muted-foreground">
            Devis générés via {qontoStatus.organization || 'Qonto'}
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

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : quotes && quotes.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {quotes.map((quote) => (
            <Card key={quote.id} className="hover-elevate" data-testid={`card-quote-${quote.id}`}>
              <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-base font-medium">
                    {quote.number || `Devis #${quote.id.slice(0, 8)}`}
                  </CardTitle>
                  {quote.client?.name && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Building2 className="h-3 w-3" />
                      {quote.client.name}
                    </div>
                  )}
                </div>
                <Badge 
                  variant="outline" 
                  className={statusColors[quote.status] || statusColors.draft}
                >
                  {statusLabels[quote.status] || quote.status}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {quote.total_amount && (
                  <div className="flex items-center gap-2 text-lg font-semibold">
                    <Euro className="h-4 w-4 text-muted-foreground" />
                    {parseFloat(quote.total_amount.value).toLocaleString('fr-FR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })} €
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {format(new Date(quote.issue_date), 'dd MMM yyyy', { locale: fr })}
                    {quote.expiry_date && (
                      <> → {format(new Date(quote.expiry_date), 'dd MMM yyyy', { locale: fr })}</>
                    )}
                  </span>
                </div>
                {quote.quote_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    asChild
                    data-testid={`button-view-quote-${quote.id}`}
                  >
                    <a href={quote.quote_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Voir sur Qonto
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
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
  );
}
