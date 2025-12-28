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
  FileSignature,
  MessageSquare,
  Hash,
  Sparkles,
  Brain,
  Zap,
  Target,
  TrendingUp,
  Users,
  Rocket,
  Shield,
  BarChart3,
  Bot,
  Cpu,
  Workflow,
  GraduationCap,
  Headphones,
  ChevronRight
} from "lucide-react";
import { useState } from "react";
import { ChannelList } from "@/components/channels/ChannelList";
import { ChannelView } from "@/components/channels/ChannelView";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useSpace } from "@/hooks/use-space";
import logoIaInfinity from "@assets/logo_iA_Infinity_1766693283199.png";

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

interface Channel {
  id: string;
  name: string;
  description?: string;
  type: 'client' | 'vendor';
  scope: 'global' | 'project';
  projectId?: string;
  accountId?: string;
  isActive: boolean;
  createdAt: string;
}

function getStatusBadge(status: string) {
  switch (status) {
    case "active":
      return <Badge variant="default" className="bg-emerald-500">Actif</Badge>;
    case "completed":
      return <Badge variant="default" className="bg-blue-500">Terminé</Badge>;
    case "on_hold":
      return <Badge variant="secondary">En pause</Badge>;
    case "cancelled":
      return <Badge variant="destructive">Annulé</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
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

// Services IA Infinity
const services = [
  {
    icon: Bot,
    title: "Automatisation IA",
    description: "Automatisez vos processus répétitifs avec des solutions d'IA sur mesure",
    color: "from-violet-500 to-purple-600"
  },
  {
    icon: Brain,
    title: "Conseil Stratégique",
    description: "Accompagnement personnalisé pour intégrer l'IA dans votre stratégie d'entreprise",
    color: "from-blue-500 to-cyan-600"
  },
  {
    icon: GraduationCap,
    title: "Formation",
    description: "Formez vos équipes aux outils et méthodologies de l'intelligence artificielle",
    color: "from-emerald-500 to-teal-600"
  },
  {
    icon: Headphones,
    title: "Support 24/7",
    description: "Bénéficiez d'un accompagnement continu et d'un support technique réactif",
    color: "from-orange-500 to-amber-600"
  }
];

export default function ClientPortal() {
  const [, setLocation] = useLocation();
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const { currentUser } = useSpace();

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

  const firstName = currentUser?.name?.split(' ')[0] || account?.contactName?.split(' ')[0] || 'Client';

  return (
    <div className="space-y-8">
      {/* Hero Section with IA Infinity Branding */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-8 text-white">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,black)]" />
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-violet-500/30 blur-3xl" />

        <div className="relative flex items-start justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm shadow-lg">
                <img src={logoIaInfinity} alt="IA Infinity" className="h-10 w-10 object-contain" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  Bienvenue, {firstName}
                </h1>
                <p className="text-violet-200">
                  Portail Client IA Infinity
                </p>
              </div>
            </div>

            <p className="max-w-xl text-lg text-violet-100">
              Intégrez l'intelligence artificielle dans votre entreprise.
              Suivez vos projets, signez vos devis et communiquez avec notre équipe en temps réel.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                variant="secondary"
                className="bg-white/20 hover:bg-white/30 text-white border-0"
                onClick={() => setLocation('/client/services')}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Découvrir nos services
              </Button>
              <Button
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10"
                onClick={() => setLocation('/client/projects')}
              >
                <FolderKanban className="mr-2 h-4 w-4" />
                Voir mes projets
              </Button>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-4">
            <div className="flex flex-col items-center p-4 bg-white/10 rounded-xl backdrop-blur-sm">
              <Zap className="h-8 w-8 mb-2" />
              <span className="text-2xl font-bold">{activeProjects.length}</span>
              <span className="text-xs text-violet-200">Projets actifs</span>
            </div>
            <div className="flex flex-col items-center p-4 bg-white/10 rounded-xl backdrop-blur-sm">
              <Target className="h-8 w-8 mb-2" />
              <span className="text-2xl font-bold">{completedProjects.length}</span>
              <span className="text-xs text-violet-200">Terminés</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-violet-200 dark:border-violet-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Projets actifs</p>
                <p className="text-3xl font-bold text-violet-600">{activeProjects.length}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                <FolderKanban className="h-6 w-6 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 dark:border-emerald-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Projets terminés</p>
                <p className="text-3xl font-bold text-emerald-600">{completedProjects.length}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 dark:border-amber-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Devis à signer</p>
                <p className="text-3xl font-bold text-amber-600">{pendingQuotes.length}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <FileSignature className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 dark:border-blue-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Votre plan</p>
                <p className="text-3xl font-bold text-blue-600 capitalize">{account?.plan || "—"}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Shield className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Quotes Alert */}
      {pendingQuotes.length > 0 && (
        <Card className="border-amber-300 dark:border-amber-700 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertCircle className="h-5 w-5" />
              Action requise : Devis en attente de signature
            </CardTitle>
            <CardDescription className="text-amber-600 dark:text-amber-500">
              {pendingQuotes.length} devis nécessite{pendingQuotes.length > 1 ? "nt" : ""} votre signature pour continuer
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingQuotes.map((quote) => (
                <div
                  key={quote.id}
                  className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border shadow-sm"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                      <FileSignature className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-medium">{quote.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {quote.amount.toLocaleString("fr-FR")} € HT
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => setLocation(`/sign-quote?token=${quote.signatureToken}`)}
                    className="bg-amber-600 hover:bg-amber-700"
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

      {/* Video & Services Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Video Presentation */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-600" />
              Découvrez IA Infinity
            </CardTitle>
            <CardDescription>
              Notre vidéo de présentation
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="aspect-video">
              <iframe
                src="https://player.vimeo.com/video/1123798289?badge=0&autopause=0&player_id=0&app_id=58479"
                className="w-full h-full"
                frameBorder="0"
                allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
                allowFullScreen
                title="Présentation IA Infinity"
              />
            </div>
          </CardContent>
        </Card>

        {/* Services Overview */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold">Nos Services</h2>
              <p className="text-sm text-muted-foreground">Solutions IA pour votre entreprise</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setLocation('/client/services')}>
              Voir tout
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {services.map((service, index) => (
              <Card
                key={index}
                className="group hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden"
                onClick={() => setLocation('/client/services')}
              >
                <CardContent className="p-4">
                  <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${service.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                    <service.icon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{service.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">{service.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Projects and Quotes Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Projects */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FolderKanban className="h-5 w-5 text-violet-600" />
                  Vos projets
                </CardTitle>
                <CardDescription>
                  Suivez l'avancement de vos projets en temps réel
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setLocation('/client/projects')}>
                Voir tout
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
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
                <p className="text-sm mt-1">Vos projets apparaîtront ici</p>
              </div>
            ) : (
              <div className="space-y-4">
                {projects?.slice(0, 3).map((project) => (
                  <div
                    key={project.id}
                    className="p-4 border rounded-lg hover:shadow-md hover:border-violet-300 dark:hover:border-violet-700 cursor-pointer transition-all"
                    onClick={() => setLocation(`/client/projects/${project.id}`)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold">{project.name}</h3>
                        {project.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                            {project.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(project.status)}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Progression</span>
                        <span className="font-medium">{project.progress}%</span>
                      </div>
                      <Progress value={project.progress} className="h-2" />
                    </div>
                    {project.endDate && (
                      <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
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

        {/* Quotes */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-violet-600" />
                  Vos devis
                </CardTitle>
                <CardDescription>
                  Historique de vos devis et contrats
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setLocation('/client/quotes')}>
                Voir tout
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
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
                <p className="text-sm mt-1">Vos devis apparaîtront ici</p>
              </div>
            ) : (
              <div className="space-y-3">
                {quotes?.slice(0, 4).map((quote) => (
                  <div
                    key={quote.id}
                    className="p-4 border rounded-lg hover:shadow-md hover:border-violet-300 dark:hover:border-violet-700 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                          quote.clientSignature
                            ? 'bg-emerald-100 dark:bg-emerald-900/30'
                            : quote.adminSignature
                              ? 'bg-amber-100 dark:bg-amber-900/30'
                              : 'bg-gray-100 dark:bg-gray-800'
                        }`}>
                          <FileSignature className={`h-5 w-5 ${
                            quote.clientSignature
                              ? 'text-emerald-600'
                              : quote.adminSignature
                                ? 'text-amber-600'
                                : 'text-gray-500'
                          }`} />
                        </div>
                        <div>
                          <h3 className="font-medium">{quote.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {quote.amount.toLocaleString("fr-FR")} € HT
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {getQuoteStatusBadge(quote.status, !!quote.adminSignature, !!quote.clientSignature)}
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(quote.createdAt), "d MMM yyyy", { locale: fr })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Communication Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-violet-600" />
            Espace d'échange
          </CardTitle>
          <CardDescription>
            Communiquez directement avec l'équipe IA Infinity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <ChannelList
                selectedChannelId={selectedChannel?.id}
                onSelectChannel={setSelectedChannel}
                endpoint="/api/client/channels"
              />
            </div>
            <div className="lg:col-span-2 min-h-[400px]">
              {selectedChannel ? (
                <ChannelView channel={selectedChannel} />
              ) : (
                <div className="h-full flex items-center justify-center border rounded-lg bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20">
                  <div className="text-center text-muted-foreground p-8">
                    <div className="h-16 w-16 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mx-auto mb-4">
                      <MessageSquare className="h-8 w-8 text-violet-600" />
                    </div>
                    <p className="font-medium">Sélectionnez une conversation</p>
                    <p className="text-sm mt-1">Échangez avec notre équipe en temps réel</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer with Company Info */}
      <div className="border-t pt-8 mt-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-3">
            <img src={logoIaInfinity} alt="IA Infinity" className="h-8 w-8 object-contain" />
            <div>
              <p className="font-medium text-foreground">IA Infinity</p>
              <p>Intégrez l'IA dans votre entreprise</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <a href="https://i-a-infinity.com" target="_blank" rel="noopener noreferrer" className="hover:text-violet-600 transition-colors">
              Site web
            </a>
            <span>•</span>
            <span>Paris, France</span>
            <span>•</span>
            <a href="mailto:contact@i-a-infinity.com" className="hover:text-violet-600 transition-colors">
              Contact
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
