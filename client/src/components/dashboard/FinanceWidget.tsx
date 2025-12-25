import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  CreditCard,
  RefreshCw,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { queryClient } from '@/lib/queryClient';

interface FinanceOverview {
  balance: number;
  authorizedBalance: number;
  currency: string;
  iban: string;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthName: string;
  organizationName: string;
  transactionCount: number;
}

const formatCurrency = (amount: number, currency: string = 'EUR') => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

const maskIban = (iban: string) => {
  if (!iban || iban.length < 8) return iban;
  return `${iban.slice(0, 4)} •••• ${iban.slice(-4)}`;
};

export function FinanceWidget() {
  const { data: finance, isLoading, isError, refetch, isFetching } = useQuery<FinanceOverview>({
    queryKey: ['/api/qonto/finance/overview'],
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/qonto/finance/overview'] });
    refetch();
  };

  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-40" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError || !finance) {
    return (
      <Card className="overflow-hidden border-destructive/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Finances Qonto
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-3">
              Impossible de charger les données Qonto
            </p>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Réessayer
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const netMonthly = finance.monthlyIncome - finance.monthlyExpenses;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-violet-100 dark:bg-violet-900/30">
                <Wallet className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              </div>
              Finances Qonto
            </CardTitle>
            <div className="flex items-center gap-2">
              <a 
                href="https://app.qonto.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={handleRefresh}
                disabled={isFetching}
                data-testid="button-refresh-finance"
              >
                <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Solde disponible</span>
              <span className="text-xs text-muted-foreground font-mono">{maskIban(finance.iban)}</span>
            </div>
            <div className="text-3xl font-bold tracking-tight" data-testid="text-balance">
              {formatCurrency(finance.balance, finance.currency)}
            </div>
            {finance.balance !== finance.authorizedBalance && (
              <p className="text-xs text-muted-foreground mt-1">
                Solde autorisé: {formatCurrency(finance.authorizedBalance, finance.currency)}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Revenus</span>
              </div>
              <div className="text-lg font-semibold text-emerald-700 dark:text-emerald-300" data-testid="text-monthly-income">
                +{formatCurrency(finance.monthlyIncome, finance.currency)}
              </div>
              <span className="text-xs text-emerald-600/70 dark:text-emerald-400/70">{finance.monthName}</span>
            </div>

            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                <span className="text-xs font-medium text-red-700 dark:text-red-300">Dépenses</span>
              </div>
              <div className="text-lg font-semibold text-red-700 dark:text-red-300" data-testid="text-monthly-expenses">
                -{formatCurrency(finance.monthlyExpenses, finance.currency)}
              </div>
              <span className="text-xs text-red-600/70 dark:text-red-400/70">{finance.monthName}</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {finance.transactionCount} transactions ce mois
              </span>
            </div>
            <div className={`text-sm font-medium ${netMonthly >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {netMonthly >= 0 ? '+' : ''}{formatCurrency(netMonthly, finance.currency)}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
