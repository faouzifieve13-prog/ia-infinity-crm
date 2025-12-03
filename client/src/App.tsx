import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/hooks/use-theme";
import { SpaceProvider } from "@/hooks/use-space";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "@/pages/Dashboard";
import Pipeline from "@/pages/Pipeline";
import Projects from "@/pages/Projects";
import Tasks from "@/pages/Tasks";
import Accounts from "@/pages/Accounts";
import Contacts from "@/pages/Contacts";
import Workflows from "@/pages/Workflows";
import Invoices from "@/pages/Invoices";
import Vendors from "@/pages/Vendors";
import Missions from "@/pages/Missions";
import Documents from "@/pages/Documents";
import Contracts from "@/pages/Contracts";
import Expenses from "@/pages/Expenses";
import NotionSync from "@/pages/NotionSync";
import Invitations from "@/pages/Invitations";
import AcceptInvite from "@/pages/AcceptInvite";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/pipeline" component={Pipeline} />
      <Route path="/projects" component={Projects} />
      <Route path="/tasks" component={Tasks} />
      <Route path="/accounts" component={Accounts} />
      <Route path="/contacts" component={Contacts} />
      <Route path="/workflows" component={Workflows} />
      <Route path="/invoices" component={Invoices} />
      <Route path="/vendors" component={Vendors} />
      <Route path="/missions" component={Missions} />
      <Route path="/documents" component={Documents} />
      <Route path="/contracts" component={Contracts} />
      <Route path="/expenses" component={Expenses} />
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
  const [location] = useLocation();
  
  // Auth routes are rendered outside the main layout
  if (location.startsWith("/auth/")) {
    return (
      <Switch>
        <Route path="/auth/accept-invite" component={AcceptInvite} />
        <Route component={NotFound} />
      </Switch>
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
