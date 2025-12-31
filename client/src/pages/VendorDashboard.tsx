import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Briefcase,
  FileText,
  MessageSquare,
  CheckSquare,
  Clock,
  TrendingUp,
  Calendar
} from 'lucide-react';
import { Link } from 'wouter';
import type { Project, Task, Mission } from '@shared/schema';

interface DashboardStats {
  activeProjects: number;
  pendingTasks: number;
  completedTasks: number;
  unreadMessages: number;
}

export default function VendorDashboard() {
  const { data: projects, isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ['/api/vendor/projects'],
  });

  const { data: tasks, isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ['/api/vendor/tasks'],
  });

  const { data: missions, isLoading: missionsLoading } = useQuery<Mission[]>({
    queryKey: ['/api/vendor/missions'],
  });

  const isLoading = projectsLoading || tasksLoading || missionsLoading;

  // Calculate stats
  const activeProjects = projects?.filter(p => p.status === 'active' || p.status === 'in_progress').length || 0;
  const pendingTasks = tasks?.filter(t => t.status === 'pending' || t.status === 'in_progress').length || 0;
  const completedTasks = tasks?.filter(t => t.status === 'completed').length || 0;
  const totalMissions = missions?.length || 0;

  const stats = [
    {
      title: 'Projets Actifs',
      value: activeProjects,
      icon: Briefcase,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      link: '/vendor/projects',
    },
    {
      title: 'Tâches en Cours',
      value: pendingTasks,
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      link: '/vendor/tasks',
    },
    {
      title: 'Tâches Terminées',
      value: completedTasks,
      icon: CheckSquare,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      link: '/vendor/tasks',
    },
    {
      title: 'Missions',
      value: totalMissions,
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      link: '/vendor/missions',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Portail Sous-traitant</h1>
        <p className="text-muted-foreground">
          Bienvenue sur votre espace de travail
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.title} href={stat.link}>
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-full ${stat.bgColor}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">{stat.value}</div>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Mes Projets
            </CardTitle>
            <CardDescription>
              Consultez vos projets assignés
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/vendor/projects">
              <Button className="w-full">Voir les projets</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5" />
              Mes Tâches
            </CardTitle>
            <CardDescription>
              Gérez vos tâches et suivez votre progression
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/vendor/tasks">
              <Button className="w-full">Voir les tâches</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Messages
            </CardTitle>
            <CardDescription>
              Communiquez avec l'équipe
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/vendor/channels">
              <Button className="w-full">Voir les messages</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documents
            </CardTitle>
            <CardDescription>
              Accédez aux documents partagés
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/vendor/documents">
              <Button className="w-full">Voir les documents</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Mes Factures
            </CardTitle>
            <CardDescription>
              Soumettez et suivez vos factures
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/vendor/my-invoices">
              <Button className="w-full">Gérer les factures</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Contrats
            </CardTitle>
            <CardDescription>
              Consultez vos contrats
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/vendor/contracts">
              <Button className="w-full">Voir les contrats</Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recent Projects */}
      {projects && projects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Projets Récents</CardTitle>
            <CardDescription>Vos derniers projets assignés</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {projects.slice(0, 5).map((project) => (
                <Link key={project.id} href={`/vendor/projects/${project.id}`}>
                  <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors">
                    <div>
                      <div className="font-medium">{project.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {project.description?.substring(0, 60)}...
                      </div>
                    </div>
                    <Badge variant={
                      project.status === 'completed' ? 'default' :
                      project.status === 'active' || project.status === 'in_progress' ? 'secondary' :
                      'outline'
                    }>
                      {project.status === 'active' || project.status === 'in_progress' ? 'En cours' :
                       project.status === 'completed' ? 'Terminé' :
                       project.status === 'on_hold' ? 'En pause' : project.status}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
