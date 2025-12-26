import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import { 
  FolderKanban, 
  FileText, 
  Building2, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  ArrowRight,
  FileSignature
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  progress: number;
  startDate: string | null;
  endDate: string | null;
  pricingTier: string | null;
}

interface Account {
  id: string;
  name: string;
  contactName: string | null;
  contactEmail: string | null;
  plan: string | null;
  status: string;
}

interface Quote {
  id: string;
  title: string;
  type: string;
  amount: number;
  status: string;
  createdAt: string;
  signatureToken: string | null;
  adminSignature: string | null;
  clientSignature: string | null;
}

function getStatusBadge(status: string) {
  switch (status) {
    case "active":
      return <Badge variant="default" className="bg-emerald-500" data-testid={`badge-status-${status}`}>Actif</Badge>;
    case "completed":
      return <Badge variant="default" className="bg-blue-500" data-testid={`badge-status-${status}`}>Terminé</Badge>;
    case "on_hold":
      return <Badge variant="secondary" data-testid={`badge-status-${status}`}>En pause</Badge>;
    case "cancelled":
      return <Badge variant="destructive" data-testid={`badge-status-${status}`}>Annulé</Badge>;
    default:
      return <Badge variant="outline" data-testid={`badge-status-${status}`}>{status}</Badge>;
  }
}

function getQuoteStatusBadge(status: string, adminSigned: boolean, clientSigned: boolean) {
  if (clientSigned) {
    return <Badge variant="default" className="bg-emerald-500">Signé</Badge>;
  }
  if (adminSigned && !clientSigned) {
    return <Badge variant="default" className="bg-amber-500">En attente de signature</Badge>;
  }
  return <Badge variant="secondary">Brouillon</Badge>;
}

export default function ClientPortal() {
  const [, setLocation] = useLocation();
  
  const { data: account, isLoading: accountLoading } = useQuery<Account>({
    queryKey: ["/api/client/account"],
  });
  
  const { data: projects, isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/client/projects"],
  });
  
  const { data: quotes, isLoading: quotesLoading } = useQuery<Quote[]>({
    queryKey: ["/api/client/quotes"],
  });

  const pendingQuotes = quotes?.filter(q => q.adminSignature && !q.clientSignature) || [];
  const activeProjects = projects?.filter(p => p.status === "active") || [];
  const completedProjects = projects?.filter(p => p.status === "completed") || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-violet-950">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent" data-testid="text-portal-title">
              Portail Client
            </h1>
            {accountLoading ? (
              <Skeleton className="h-5 w-48 mt-2" />
            ) : (
              <p className="text-muted-foreground mt-1" data-testid="text-account-name">
                {account?.name || "Bienvenue"}
              </p>
            )}
          </div>
          <Button 
            variant="outline"
            onClick={() => {
              fetch("/api/auth/logout", { method: "POST" }).then(() => {
                setLocation("/login");
              });
            }}
            data-testid="button-logout"
          >
            Déconnexion
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-violet-200 dark:border-violet-800" data-testid="card-stats-projects">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
              <CardTitle className="text-sm font-medium">Projets actifs</CardTitle>
              <FolderKanban className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeProjects.length}</div>
              <p className="text-xs text-muted-foreground">
                {completedProjects.length} terminé{completedProjects.length > 1 ? "s" : ""}
              </p>
            </CardContent>
          </Card>

          <Card className="border-violet-200 dark:border-violet-800" data-testid="card-stats-quotes">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
              <CardTitle className="text-sm font-medium">Devis à signer</CardTitle>
              <FileSignature className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingQuotes.length}</div>
              <p className="text-xs text-muted-foreground">
                {quotes?.filter(q => q.clientSignature).length || 0} signé{(quotes?.filter(q => q.clientSignature).length || 0) > 1 ? "s" : ""}
              </p>
            </CardContent>
          </Card>

          <Card className="border-violet-200 dark:border-violet-800" data-testid="card-stats-account">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
              <CardTitle className="text-sm font-medium">Votre plan</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize">{account?.plan || "—"}</div>
              <p className="text-xs text-muted-foreground">
                Statut: {account?.status === "active" ? "Actif" : account?.status || "—"}
              </p>
            </CardContent>
          </Card>
        </div>

        {pendingQuotes.length > 0 && (
          <Card className="border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30" data-testid="card-pending-quotes">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <AlertCircle className="h-5 w-5" />
                Devis en attente de signature
              </CardTitle>
              <CardDescription>
                {pendingQuotes.length} devis nécessite{pendingQuotes.length > 1 ? "nt" : ""} votre signature
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingQuotes.map((quote) => (
                  <div 
                    key={quote.id} 
                    className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border"
                    data-testid={`card-quote-${quote.id}`}
                  >
                    <div>
                      <p className="font-medium">{quote.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {quote.amount.toLocaleString("fr-FR")} € • {quote.type}
                      </p>
                    </div>
                    <Button 
                      onClick={() => setLocation(`/sign-quote?token=${quote.signatureToken}`)}
                      data-testid={`button-sign-quote-${quote.id}`}
                    >
                      Signer le devis
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card data-testid="card-projects-list">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderKanban className="h-5 w-5 text-violet-600" />
                Vos projets
              </CardTitle>
              <CardDescription>
                Suivez l'avancement de vos projets
              </CardDescription>
            </CardHeader>
            <CardContent>
              {projectsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : projects?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FolderKanban className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucun projet pour le moment</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {projects?.map((project) => (
                    <div 
                      key={project.id} 
                      className="p-4 border rounded-lg hover-elevate cursor-pointer"
                      data-testid={`card-project-${project.id}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold">{project.name}</h3>
                          {project.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {project.description}
                            </p>
                          )}
                        </div>
                        {getStatusBadge(project.status)}
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Progression</span>
                          <span className="font-medium">{project.progress}%</span>
                        </div>
                        <Progress value={project.progress} className="h-2" />
                      </div>
                      {project.endDate && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          Échéance: {format(new Date(project.endDate), "d MMMM yyyy", { locale: fr })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-quotes-list">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-violet-600" />
                Vos devis
              </CardTitle>
              <CardDescription>
                Historique de vos devis et contrats
              </CardDescription>
            </CardHeader>
            <CardContent>
              {quotesLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : quotes?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucun devis pour le moment</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {quotes?.map((quote) => (
                    <div 
                      key={quote.id} 
                      className="p-4 border rounded-lg"
                      data-testid={`card-quote-item-${quote.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium">{quote.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {quote.amount.toLocaleString("fr-FR")} € • {quote.type}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(quote.createdAt), "d MMMM yyyy", { locale: fr })}
                          </p>
                        </div>
                        {getQuoteStatusBadge(quote.status, !!quote.adminSignature, !!quote.clientSignature)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
