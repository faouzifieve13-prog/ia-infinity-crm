import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  DollarSign,
  TrendingUp,
  Target,
  CheckCircle2,
  Zap,
  Users,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { ActivityFeed } from '@/components/ActivityFeed';
import { WorkflowList } from '@/components/WorkflowList';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { InvoiceTable } from '@/components/finance/InvoiceTable';
import { useSpace } from '@/hooks/use-space';
import { MissionCard } from '@/components/vendor/MissionCard';
import type { DashboardStats, Project, Activity, WorkflowRun, Invoice, Mission, Account } from '@/lib/types';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

function InternalDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats'],
  });

  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  const { data: workflows = [] } = useQuery<WorkflowRun[]>({
    queryKey: ['/api/workflows'],
  });

  const { data: activities = [] } = useQuery<Activity[]>({
    queryKey: ['/api/activities'],
  });

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ['/api/accounts'],
  });

  const getAccountName = (accountId: string) => {
    const account = accounts.find(a => a.id === accountId);
    return account?.name || 'Unknown';
  };

  const projectsWithAccount = projects.map(p => ({
    ...p,
    accountName: getAccountName(p.accountId),
  }));

  const activeProjects = projectsWithAccount.filter(p => p.status === 'active');

  if (statsLoading || projectsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="h-8 w-8 text-primary" />
        </motion.div>
      </div>
    );
  }

  const totalPipeline = stats?.totalPipeline || 0;
  const wonValue = stats?.wonValue || 0;
  const winRate = stats?.totalDeals ? Math.round((stats.wonDeals / stats.totalDeals) * 100) : 0;

  return (
    <motion.div 
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 rounded-xl gradient-admin">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
            Tableau de bord
          </h1>
        </div>
        <p className="text-muted-foreground">Aperçu de vos performances commerciales</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Revenu gagné"
          value={wonValue}
          icon={DollarSign}
          format="currency"
          index={0}
          accentColor="success"
        />
        <MetricCard
          title="Pipeline"
          value={totalPipeline}
          icon={TrendingUp}
          format="currency"
          index={1}
          accentColor="primary"
        />
        <MetricCard
          title="Taux de conversion"
          value={winRate}
          icon={Target}
          format="percent"
          index={2}
          accentColor="warning"
        />
        <MetricCard
          title="Projets actifs"
          value={stats?.activeProjects || 0}
          icon={CheckCircle2}
          index={3}
          accentColor="info"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Active Projects</h2>
            {activeProjects.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No active projects yet. Create your first project to get started.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeProjects.slice(0, 4).map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onClick={() => console.log('View project', project.id)}
                  />
                ))}
              </div>
            )}
          </div>

          <WorkflowList workflows={workflows.slice(0, 4).map(w => ({
            id: w.id,
            name: w.workflowName,
            type: w.workflowType,
            status: w.status as 'active' | 'paused' | 'error',
            lastRun: w.finishedAt || undefined,
            successRate: w.successRate,
          }))} />
        </div>

        <div>
          <ActivityFeed activities={activities.slice(0, 10).map(a => ({
            id: a.id,
            type: a.type,
            description: a.description,
            createdAt: a.createdAt,
            user: a.user || { id: a.userId, name: 'User', email: '' },
            dealId: a.dealId || undefined,
            projectId: a.projectId || undefined,
          }))} />
        </div>
      </div>
    </div>
  );
}

function ClientDashboard() {
  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats'],
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  const { data: invoices = [] } = useQuery<Invoice[]>({
    queryKey: ['/api/invoices'],
  });

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ['/api/accounts'],
  });

  const getAccountName = (accountId: string) => {
    const account = accounts.find(a => a.id === accountId);
    return account?.name || 'Unknown';
  };

  const projectsWithAccount = projects.map(p => ({
    ...p,
    accountName: getAccountName(p.accountId),
  }));

  const invoicesWithAccount = invoices.map(i => ({
    ...i,
    accountName: getAccountName(i.accountId),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold" data-testid="text-page-title">Client Portal</h1>
        <p className="text-muted-foreground">Welcome back! Here's your project overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Active Projects"
          value={stats?.activeProjects || 0}
          icon={CheckCircle2}
        />
        <MetricCard
          title="Pending Invoices"
          value={stats?.pendingInvoices || 0}
          icon={DollarSign}
          format="number"
        />
        <MetricCard
          title="Pending Tasks"
          value={stats?.pendingTasks || 0}
          icon={Zap}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Your Projects</h2>
          {projectsWithAccount.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No projects yet.
            </div>
          ) : (
            projectsWithAccount.slice(0, 2).map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onClick={() => console.log('View project', project.id)}
              />
            ))
          )}
        </div>

        <InvoiceTable
          invoices={invoicesWithAccount.slice(0, 3)}
          title="Recent Invoices"
          showAccount={false}
        />
      </div>
    </div>
  );
}

function VendorDashboard() {
  const { data: missions = [] } = useQuery<Mission[]>({
    queryKey: ['/api/missions'],
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  const { data: vendors = [] } = useQuery<any[]>({
    queryKey: ['/api/vendors'],
  });

  const getProjectName = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    return project?.name || 'Unknown';
  };

  const missionsWithProject = missions.map(m => ({
    ...m,
    projectName: getProjectName(m.projectId),
  }));

  const activeMissions = missionsWithProject.filter(m => m.status !== 'completed');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold" data-testid="text-page-title">Vendor Portal</h1>
        <p className="text-muted-foreground">Your missions and time tracking</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Active Missions"
          value={activeMissions.length}
          icon={CheckCircle2}
        />
        <MetricCard
          title="Total Missions"
          value={missions.length}
          icon={Users}
        />
        <MetricCard
          title="Vendors"
          value={vendors.length}
          icon={DollarSign}
        />
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Your Missions</h2>
        {missionsWithProject.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No missions assigned yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {missionsWithProject.map((mission) => (
              <MissionCard
                key={mission.id}
                mission={mission}
                onClick={() => console.log('View mission', mission.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { currentSpace } = useSpace();

  if (currentSpace === 'client') return <ClientDashboard />;
  if (currentSpace === 'vendor') return <VendorDashboard />;
  return <InternalDashboard />;
}
