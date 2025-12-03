import {
  DollarSign,
  TrendingUp,
  Target,
  CheckCircle2,
  Zap,
  Users,
} from 'lucide-react';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { ActivityFeed } from '@/components/ActivityFeed';
import { WorkflowList } from '@/components/WorkflowList';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { InvoiceTable } from '@/components/finance/InvoiceTable';
import { useSpace } from '@/hooks/use-space';
import {
  mockActivities,
  mockWorkflows,
  mockProjects,
  mockInvoices,
  mockMissions,
  kpiData,
} from '@/lib/mock-data';
import { MissionCard } from '@/components/vendor/MissionCard';

function InternalDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold" data-testid="text-page-title">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your business performance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Monthly Revenue"
          value={kpiData.mrr}
          change={kpiData.mrrGrowth}
          changeLabel="vs last month"
          icon={DollarSign}
          format="currency"
        />
        <MetricCard
          title="Pipeline Value"
          value={kpiData.pipelineValue}
          change={8}
          icon={TrendingUp}
          format="currency"
        />
        <MetricCard
          title="Win Rate"
          value={kpiData.winRate}
          change={-2}
          icon={Target}
          format="percent"
        />
        <MetricCard
          title="Active Projects"
          value={kpiData.activeProjects}
          change={3}
          icon={CheckCircle2}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Active Projects</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mockProjects.slice(0, 4).map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onClick={() => console.log('View project', project.id)}
                />
              ))}
            </div>
          </div>

          <WorkflowList workflows={mockWorkflows.slice(0, 4)} />
        </div>

        <div>
          <ActivityFeed activities={mockActivities} />
        </div>
      </div>
    </div>
  );
}

function ClientDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold" data-testid="text-page-title">Client Portal</h1>
        <p className="text-muted-foreground">Welcome back! Here's your project overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Active Projects"
          value={3}
          icon={CheckCircle2}
        />
        <MetricCard
          title="Pending Invoices"
          value={2}
          icon={DollarSign}
          format="number"
        />
        <MetricCard
          title="Active Workflows"
          value={5}
          icon={Zap}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Your Projects</h2>
          {mockProjects.slice(0, 2).map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={() => console.log('View project', project.id)}
            />
          ))}
        </div>

        <InvoiceTable
          invoices={mockInvoices.slice(0, 3)}
          title="Recent Invoices"
          showAccount={false}
        />
      </div>
    </div>
  );
}

function VendorDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold" data-testid="text-page-title">Vendor Portal</h1>
        <p className="text-muted-foreground">Your missions and time tracking</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Active Missions"
          value={2}
          icon={CheckCircle2}
        />
        <MetricCard
          title="Hours This Month"
          value={64}
          icon={Users}
        />
        <MetricCard
          title="Pending Payment"
          value={4160}
          icon={DollarSign}
          format="currency"
        />
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Your Missions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mockMissions.map((mission) => (
            <MissionCard
              key={mission.id}
              mission={mission}
              onClick={() => console.log('View mission', mission.id)}
            />
          ))}
        </div>
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
