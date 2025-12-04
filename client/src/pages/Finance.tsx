import { useQuery } from '@tanstack/react-query';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Wallet, 
  PieChart,
  Receipt,
  CreditCard,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  Briefcase,
  Loader2,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import type { Invoice, Expense } from '@/lib/types';

interface DashboardStats {
  totalDeals: number;
  totalPipeline: number;
  wonDeals: number;
  wonValue: number;
  activeProjects: number;
  pendingTasks: number;
  pendingInvoices: number;
  pendingInvoicesValue: number;
}

export default function Finance() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats'],
  });

  const { data: invoices = [], isLoading: invoicesLoading } = useQuery<Invoice[]>({
    queryKey: ['/api/invoices'],
  });

  const { data: expenses = [], isLoading: expensesLoading } = useQuery<Expense[]>({
    queryKey: ['/api/expenses'],
  });

  const isLoading = statsLoading || invoicesLoading || expensesLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalRevenue = invoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + parseFloat(inv.amount || '0'), 0);

  const pendingRevenue = invoices
    .filter(inv => inv.status === 'sent' || inv.status === 'overdue')
    .reduce((sum, inv) => sum + parseFloat(inv.amount || '0'), 0);

  const totalExpenses = expenses
    .filter(exp => exp.status === 'paid')
    .reduce((sum, exp) => sum + parseFloat(exp.amount || '0'), 0);

  const pendingExpenses = expenses
    .filter(exp => exp.status === 'pending')
    .reduce((sum, exp) => sum + parseFloat(exp.amount || '0'), 0);

  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  const pendingClientInvoices = invoices.filter(inv => inv.status === 'sent' || inv.status === 'overdue');
  const overdueInvoices = invoices.filter(inv => inv.status === 'overdue');
  const pendingVendorExpenses = expenses.filter(exp => exp.status === 'pending');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold" data-testid="text-page-title">Finance</h1>
          <p className="text-muted-foreground">Vue d'ensemble financière et indicateurs clés</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full bg-emerald-500/10" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CA Total</CardTitle>
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-revenue">
              {formatCurrency(totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-amber-500">{formatCurrency(pendingRevenue)}</span> en attente
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full bg-red-500/10" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dépenses Sous-traitants</CardTitle>
            <div className="p-2 rounded-lg bg-red-500/10">
              <TrendingDown className="h-4 w-4 text-red-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-expenses">
              {formatCurrency(totalExpenses)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-amber-500">{formatCurrency(pendingExpenses)}</span> à payer
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full bg-primary/10" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Marge Nette</CardTitle>
            <div className="p-2 rounded-lg bg-primary/10">
              <PieChart className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`} data-testid="text-net-profit">
              {formatCurrency(netProfit)}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Progress value={Math.max(0, Math.min(100, profitMargin))} className="h-2 flex-1" />
              <span className="text-xs text-muted-foreground">{profitMargin.toFixed(1)}%</span>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full bg-amber-500/10" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Factures en retard</CardTitle>
            <div className="p-2 rounded-lg bg-amber-500/10">
              <AlertCircle className="h-4 w-4 text-amber-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-overdue-count">
              {overdueInvoices.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(overdueInvoices.reduce((sum, inv) => sum + parseFloat(inv.amount || '0'), 0))} total
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Factures en attente (Clients)
              </CardTitle>
              <CardDescription>Factures envoyées aux clients</CardDescription>
            </div>
            <Link href="/invoices">
              <Button variant="outline" size="sm">Voir tout</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {pendingClientInvoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-2" />
                <p className="text-muted-foreground">Aucune facture en attente</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingClientInvoices.slice(0, 5).map((invoice) => (
                  <div 
                    key={invoice.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    data-testid={`invoice-pending-${invoice.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Receipt className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{invoice.invoiceNumber}</p>
                        <p className="text-sm text-muted-foreground">
                          {invoice.dueDate 
                            ? new Date(invoice.dueDate).toLocaleDateString('fr-FR')
                            : 'Pas de date limite'
                          }
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(parseFloat(invoice.amount || '0'))}</p>
                      <Badge 
                        variant={invoice.status === 'overdue' ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        {invoice.status === 'overdue' ? 'En retard' : 'Envoyée'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-amber-500" />
                Factures à payer (Sous-traitants)
              </CardTitle>
              <CardDescription>Paiements dus aux prestataires</CardDescription>
            </div>
            <Link href="/expenses">
              <Button variant="outline" size="sm">Voir tout</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {pendingVendorExpenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-2" />
                <p className="text-muted-foreground">Aucune facture à payer</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingVendorExpenses.slice(0, 5).map((expense) => (
                  <div 
                    key={expense.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    data-testid={`expense-pending-${expense.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-amber-500/10">
                        <Wallet className="h-4 w-4 text-amber-500" />
                      </div>
                      <div>
                        <p className="font-medium">{expense.title}</p>
                        <p className="text-sm text-muted-foreground capitalize">
                          {expense.category}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(parseFloat(expense.amount || '0'))}</p>
                      <Badge variant="secondary" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        En attente
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Formule de calcul de la marge</CardTitle>
          <CardDescription>
            Marge Nette = Factures Clients (payées) - Dépenses Sous-traitants (payées)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10">
              <ArrowUpRight className="h-5 w-5 text-emerald-500" />
              <div>
                <p className="text-sm text-muted-foreground">Revenus</p>
                <p className="font-bold text-emerald-500">{formatCurrency(totalRevenue)}</p>
              </div>
            </div>
            <span className="text-2xl font-bold text-muted-foreground">-</span>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10">
              <ArrowDownRight className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Dépenses</p>
                <p className="font-bold text-red-500">{formatCurrency(totalExpenses)}</p>
              </div>
            </div>
            <span className="text-2xl font-bold text-muted-foreground">=</span>
            <div className={`flex items-center gap-2 p-3 rounded-lg ${netProfit >= 0 ? 'bg-primary/10' : 'bg-red-500/10'}`}>
              <PieChart className={`h-5 w-5 ${netProfit >= 0 ? 'text-primary' : 'text-red-500'}`} />
              <div>
                <p className="text-sm text-muted-foreground">Marge</p>
                <p className={`font-bold ${netProfit >= 0 ? 'text-primary' : 'text-red-500'}`}>
                  {formatCurrency(netProfit)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
