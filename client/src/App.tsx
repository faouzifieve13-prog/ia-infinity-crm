import { useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FolderKanban, TrendingUp, CheckCircle, Briefcase } from "lucide-react";
import { ThemeProvider } from "@/hooks/use-theme";
import { SpaceProvider } from "@/hooks/use-space";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/use-auth";
import Dashboard from "@/pages/Dashboard";
import Pipeline from "@/pages/Pipeline";
import DealDetail from "@/pages/DealDetail";
import Projects from "@/pages/Projects";
import ProjectDetail from "@/pages/ProjectDetail";
import Tasks from "@/pages/Tasks";
import Accounts from "@/pages/Accounts";
import AccountDetail from "@/pages/AccountDetail";
import Contacts from "@/pages/Contacts";
import Workflows from "@/pages/Workflows";
import Invoices from "@/pages/Invoices";
import Vendors from "@/pages/Vendors";
import Missions from "@/pages/Missions";
import Documents from "@/pages/Documents";
import Contracts from "@/pages/Contracts";
import Quotes from "@/pages/Quotes";
import Expenses from "@/pages/Expenses";
import Finance from "@/pages/Finance";
import Calendar from "@/pages/Calendar";
import NotionSync from "@/pages/NotionSync";
import Invitations from "@/pages/Invitations";
import AcceptInvite from "@/pages/AcceptInvite";
import VendorAcceptInvite from "@/pages/VendorAcceptInvite";
import ContractSign from "@/pages/ContractSign";
import ContractPreview from "@/pages/ContractPreview";
import SignQuote from "@/pages/SignQuote";
import ClientQuotes from "@/pages/ClientQuotes";
import Settings from "@/pages/Settings";
import { LandingPage } from "@/pages/LandingPage";
import Login from "@/pages/Login";
import SetupPassword from "@/pages/SetupPassword";
import ClientPortal from "@/pages/ClientPortal";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/pipeline" component={Pipeline} />
      <Route path="/deals" component={Pipeline} />
      <Route path="/deals/:id" component={DealDetail} />
      <Route path="/projects" component={Projects} />
      <Route path="/projects/:id" component={ProjectDetail} />
      <Route path="/tasks" component={Tasks} />
      <Route path="/accounts" component={Accounts} />
      <Route path="/accounts/:id" component={AccountDetail} />
      <Route path="/contacts" component={Contacts} />
      <Route path="/workflows" component={Workflows} />
      <Route path="/invoices" component={Invoices} />
      <Route path="/vendors" component={Vendors} />
      <Route path="/missions" component={Missions} />
      <Route path="/documents" component={Documents} />
      <Route path="/contracts" component={Contracts} />
      <Route path="/quotes" component={Quotes} />
      <Route path="/contracts/:id/preview" component={ContractPreview} />
      <Route path="/expenses" component={Expenses} />
      <Route path="/finance" component={Finance} />
      <Route path="/calendar" component={Calendar} />
      <Route path="/notion-sync" component={NotionSync} />
      <Route path="/invitations" component={Invitations} />
      <Route path="/settings" component={Settings} />
      <Route path="/help" component={() => (
        <div className="space-y-4">
          <h1 className="text-3xl font-semibold">Help Center</h1>
          <p className="text-muted-foreground">Documentation and support resources coming soon.</p>
        </div>
      )} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const [location, setLocation] = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  // Public routes that don't require authentication
  const isPublicRoute = 
    location === "/landing" ||
    location === "/welcome" ||
    location === "/login" ||
    location === "/setup-password" ||
    location.startsWith("/auth/") ||
    (location.startsWith("/contracts/") && location.includes("/sign")) ||
    location.startsWith("/sign-quote/");
  
  // Check for vendor invite return after login - must run synchronously before render
  useEffect(() => {
    const storedUrl = sessionStorage.getItem("vendor_invite_return");
    if (storedUrl) {
      sessionStorage.removeItem("vendor_invite_return");
      try {
        const url = new URL(storedUrl);
        setLocation(url.pathname + url.search);
      } catch (e) {
        console.error("Invalid stored URL:", storedUrl);
      }
    }
  }, []);
  
  // Redirect to login if not authenticated on protected routes
  useEffect(() => {
    if (!authLoading && !isAuthenticated && !isPublicRoute) {
      setLocation("/login");
    }
  }, [authLoading, isAuthenticated, isPublicRoute, location]);
  
  // Public landing page route
  if (location === "/landing" || location === "/welcome") {
    return <LandingPage />;
  }
  
  // Login page
  if (location === "/login") {
    return <Login />;
  }
  
  // Setup password page (for accepting invitations)
  if (location === "/setup-password") {
    return <SetupPassword />;
  }
  
  // Show loading while checking auth
  if (authLoading && !isPublicRoute) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  // Don't render protected content if not authenticated
  if (!isAuthenticated && !isPublicRoute) {
    return null;
  }
  
  // Auth routes are rendered outside the main layout
  if (location.startsWith("/auth/")) {
    return (
      <Switch>
        <Route path="/auth/accept-invite" component={AcceptInvite} />
        <Route path="/auth/vendor-invite" component={VendorAcceptInvite} />
        <Route component={NotFound} />
      </Switch>
    );
  }
  
  // Public contract signing page
  if (location.startsWith("/contracts/") && location.includes("/sign")) {
    return (
      <Switch>
        <Route path="/contracts/:id/sign" component={ContractSign} />
        <Route component={NotFound} />
      </Switch>
    );
  }
  
  // Public quote signing page
  if (location.startsWith("/sign-quote/")) {
    return (
      <Switch>
        <Route path="/sign-quote/:id" component={SignQuote} />
        <Route component={NotFound} />
      </Switch>
    );
  }
  
  // Client portal routes
  if (location === "/client" || location.startsWith("/client/")) {
    return <ClientPortal />;
  }

  // Vendor portal routes
  if (location.startsWith("/vendor/")) {
    return (
      <SpaceProvider defaultSpace="vendor">
        <AppLayout>
          <Switch>
            <Route path="/vendor" component={() => <VendorDashboard />} />
            <Route path="/vendor/missions" component={Missions} />
            <Route path="/vendor/projects" component={Projects} />
            <Route path="/vendor/projects/:id" component={ProjectDetail} />
            <Route path="/vendor/documents" component={Documents} />
            <Route component={NotFound} />
          </Switch>
        </AppLayout>
      </SpaceProvider>
    );
  }
  
  return (
    <SpaceProvider>
      <AppLayout>
        <Router />
      </AppLayout>
    </SpaceProvider>
  );
}

// Client Dashboard Component
function ClientDashboard() {
  const { data: dashboard, isLoading } = useQuery<{
    projects: { total: number; active: number; completed: number };
    tasks: { total: number; completed: number; progress: number };
    averageProgress: number;
  }>({ queryKey: ['/api/client/dashboard'] });

  const { data: projects } = useQuery<any[]>({ queryKey: ['/api/client/projects'] });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="client-dashboard">
      <div>
        <h1 className="text-2xl font-semibold">Votre Espace Client</h1>
        <p className="text-muted-foreground">Bienvenue sur votre portail de suivi de projets</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projets Actifs</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.projects.active || 0}</div>
            <p className="text-xs text-muted-foreground">
              sur {dashboard?.projects.total || 0} projets au total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progression Moyenne</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.averageProgress || 0}%</div>
            <Progress value={dashboard?.averageProgress || 0} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tâches Complétées</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.tasks.completed || 0}</div>
            <p className="text-xs text-muted-foreground">
              sur {dashboard?.tasks.total || 0} tâches au total
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vos Projets</CardTitle>
        </CardHeader>
        <CardContent>
          {projects && projects.length > 0 ? (
            <div className="space-y-4">
              {projects.map((project: any) => (
                <div key={project.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">{project.name}</h3>
                    <p className="text-sm text-muted-foreground">{project.description || 'Pas de description'}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm font-medium">{project.progress || 0}%</div>
                      <Progress value={project.progress || 0} className="h-2 w-24" />
                    </div>
                    <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                      {project.status === 'active' ? 'En cours' : project.status === 'completed' ? 'Terminé' : project.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">Aucun projet pour le moment</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Vendor Dashboard Component
function VendorDashboard() {
  const { data: dashboard, isLoading } = useQuery<{
    projects: { total: number; active: number; completed: number };
    missions: { total: number; active: number; pending: number };
    tasks: { total: number; completed: number; progress: number };
  }>({ queryKey: ['/api/vendor/dashboard'] });

  const { data: projects } = useQuery<any[]>({ queryKey: ['/api/vendor/projects'] });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="vendor-dashboard">
      <div>
        <h1 className="text-2xl font-semibold">Espace Sous-traitant</h1>
        <p className="text-muted-foreground">Gérez vos projets et missions assignés</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projets Assignés</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.projects.active || 0}</div>
            <p className="text-xs text-muted-foreground">
              {dashboard?.projects.completed || 0} terminés
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Missions</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.missions.active || 0}</div>
            <p className="text-xs text-muted-foreground">
              {dashboard?.missions.pending || 0} en attente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tâches</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.tasks.completed || 0}/{dashboard?.tasks.total || 0}</div>
            <Progress value={dashboard?.tasks.progress || 0} className="h-2 mt-2" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Projets Assignés</CardTitle>
        </CardHeader>
        <CardContent>
          {projects && projects.length > 0 ? (
            <div className="space-y-4">
              {projects.map((project: any) => (
                <div key={project.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">{project.name}</h3>
                    <p className="text-sm text-muted-foreground">{project.description || 'Pas de description'}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm font-medium">{project.progress || 0}%</div>
                      <Progress value={project.progress || 0} className="h-2 w-24" />
                    </div>
                    <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                      {project.status === 'active' ? 'En cours' : project.status === 'completed' ? 'Terminé' : project.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">Aucun projet assigné pour le moment</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AppContent />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
