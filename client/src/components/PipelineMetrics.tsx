import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, Clock, AlertTriangle, Target, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface PipelineMetricsData {
  thisWeek: number;
  lastWeek: number;
  weekVariation: string;
  avgDaysPerStage: Record<string, number>;
  stagnantDeals: Array<{
    id: string;
    name: string;
    stage: string;
    daysStagnant: number;
  }>;
  stagnantCount: number;
  conversionRate: {
    prospect_to_meeting: string;
    meeting_to_won: string;
    overall: string;
  };
  pipelineValue: number;
  totalDeals: number;
  wonDeals: number;
  lostDeals: number;
}

export function PipelineMetrics() {
  const { data: metrics, isLoading } = useQuery<PipelineMetricsData>({
    queryKey: ['/api/deals/metrics'],
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!metrics) return null;

  const variation = parseFloat(metrics.weekVariation);
  const isPositive = variation >= 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
      {/* Deals cette semaine */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Deals cette semaine</CardTitle>
          {isPositive ? (
            <TrendingUp className="h-4 w-4 text-green-500" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-500" />
          )}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.thisWeek}</div>
          <p className={`text-xs ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
            {isPositive ? '+' : ''}{metrics.weekVariation}% vs semaine dernière
          </p>
        </CardContent>
      </Card>

      {/* Valeur du pipeline */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Valeur Pipeline</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {new Intl.NumberFormat('fr-FR', {
              style: 'currency',
              currency: 'EUR',
              maximumFractionDigits: 0,
            }).format(metrics.pipelineValue)}
          </div>
          <p className="text-xs text-muted-foreground">
            {metrics.totalDeals - metrics.wonDeals - metrics.lostDeals} deals actifs
          </p>
        </CardContent>
      </Card>

      {/* Taux de conversion */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Taux de conversion</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.conversionRate.overall}%</div>
          <p className="text-xs text-muted-foreground">
            {metrics.wonDeals} gagnés sur {metrics.totalDeals} deals
          </p>
        </CardContent>
      </Card>

      {/* Deals stagnants */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Deals stagnants</CardTitle>
          <AlertTriangle className={`h-4 w-4 ${metrics.stagnantCount > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${metrics.stagnantCount > 0 ? 'text-orange-500' : ''}`}>
            {metrics.stagnantCount}
          </div>
          <p className="text-xs text-muted-foreground">
            Sans activité depuis 15+ jours
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
