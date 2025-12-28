import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import {
  Bot,
  Brain,
  GraduationCap,
  Headphones,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Zap,
  Target,
  Users,
  TrendingUp,
  Shield,
  Clock,
  BarChart3,
  Workflow,
  MessageSquare,
  Play,
  ExternalLink
} from "lucide-react";
import logoIaInfinity from "@assets/logo_iA_Infinity_1766693283199.png";

// Services détaillés IA Infinity
const services = [
  {
    icon: Bot,
    title: "Automatisation IA",
    description: "Automatisez vos processus répétitifs avec des solutions d'IA sur mesure",
    color: "from-violet-500 to-purple-600",
    features: [
      "Automatisation de la facturation et comptabilité",
      "Gestion automatisée de la prospection",
      "Marketing automation intelligent",
      "Traitement automatique des documents"
    ],
    benefit: "Gagnez plusieurs heures par semaine"
  },
  {
    icon: Brain,
    title: "Conseil Stratégique",
    description: "Accompagnement personnalisé pour intégrer l'IA dans votre stratégie d'entreprise",
    color: "from-blue-500 to-cyan-600",
    features: [
      "Audit de maturité IA",
      "Définition de la roadmap IA",
      "Identification des cas d'usage prioritaires",
      "ROI et indicateurs de performance"
    ],
    benefit: "Stratégie IA sur mesure"
  },
  {
    icon: MessageSquare,
    title: "Chatbots Intelligents",
    description: "Déployez des assistants virtuels pour améliorer votre expérience client",
    color: "from-emerald-500 to-teal-600",
    features: [
      "Support client 24/7 automatisé",
      "Qualification des leads",
      "Réponses personnalisées",
      "Intégration multi-canal"
    ],
    benefit: "Amélioration du taux de conversion"
  },
  {
    icon: GraduationCap,
    title: "Formation IA",
    description: "Formez vos équipes aux outils et méthodologies de l'intelligence artificielle",
    color: "from-orange-500 to-amber-600",
    features: [
      "Formation aux outils IA (ChatGPT, Claude, etc.)",
      "Ateliers pratiques personnalisés",
      "Certification et suivi des compétences",
      "Accompagnement au changement"
    ],
    benefit: "Montée en compétences rapide"
  },
  {
    icon: Workflow,
    title: "Intégration & API",
    description: "Connectez vos outils existants avec des solutions IA performantes",
    color: "from-pink-500 to-rose-600",
    features: [
      "Intégration avec vos CRM et ERP",
      "Développement d'API sur mesure",
      "Connexion aux LLMs (GPT, Claude, Mistral)",
      "Architecture scalable"
    ],
    benefit: "Écosystème unifié"
  },
  {
    icon: Headphones,
    title: "Support Premium",
    description: "Bénéficiez d'un accompagnement continu et d'un support technique réactif",
    color: "from-indigo-500 to-violet-600",
    features: [
      "Support technique prioritaire",
      "Hotline dédiée",
      "Maintenance proactive",
      "Évolutions continues"
    ],
    benefit: "Tranquillité d'esprit"
  }
];

// Avantages clés
const advantages = [
  { icon: Clock, title: "Gain de temps", value: "+10h", subtitle: "par semaine en moyenne" },
  { icon: TrendingUp, title: "Productivité", value: "+40%", subtitle: "d'efficacité opérationnelle" },
  { icon: Target, title: "Précision", value: "99%", subtitle: "de taux de fiabilité" },
  { icon: Shield, title: "Sécurité", value: "100%", subtitle: "données protégées" },
];

// Étapes du processus
const process = [
  { step: 1, title: "Diagnostic", description: "Analyse de vos besoins et de votre maturité IA" },
  { step: 2, title: "Stratégie", description: "Définition du plan d'action et des priorités" },
  { step: 3, title: "Implémentation", description: "Déploiement des solutions sur mesure" },
  { step: 4, title: "Suivi", description: "Accompagnement continu et optimisation" },
];

export default function ClientServices() {
  const [, setLocation] = useLocation();

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-8 lg:p-12 text-white">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,black)]" />
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-violet-500/30 blur-3xl" />

        <div className="relative grid lg:grid-cols-2 gap-8 items-center">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm shadow-lg">
                <img src={logoIaInfinity} alt="IA Infinity" className="h-12 w-12 object-contain" />
              </div>
              <Badge className="bg-white/20 text-white border-0">
                Solutions IA
              </Badge>
            </div>

            <h1 className="text-4xl lg:text-5xl font-bold tracking-tight">
              Intégrez l'IA dans votre entreprise
            </h1>

            <p className="text-xl text-violet-100 max-w-xl">
              Depuis 2024, IA Infinity accompagne les entreprises dans la mise en place de solutions d'intelligence artificielle simples, concrètes et adaptées à leur activité.
            </p>

            <div className="flex flex-wrap gap-4 pt-4">
              <Button
                size="lg"
                className="bg-white text-violet-700 hover:bg-violet-50"
                onClick={() => setLocation('/client/messages')}
              >
                <MessageSquare className="mr-2 h-5 w-5" />
                Nous contacter
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10"
                onClick={() => window.open('https://i-a-infinity.com', '_blank')}
              >
                <ExternalLink className="mr-2 h-5 w-5" />
                Visiter le site
              </Button>
            </div>
          </div>

          {/* Video Section */}
          <div className="relative">
            <div className="aspect-video rounded-xl overflow-hidden bg-black/20 backdrop-blur-sm border border-white/20 shadow-2xl">
              <iframe
                src="https://player.vimeo.com/video/1123798289?badge=0&autopause=0&player_id=0&app_id=58479&transparent=0"
                className="w-full h-full"
                frameBorder="0"
                allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
                allowFullScreen
                title="Présentation IA Infinity"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {advantages.map((item, index) => (
          <Card key={index} className="text-center hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="h-12 w-12 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mx-auto mb-4">
                <item.icon className="h-6 w-6 text-violet-600" />
              </div>
              <p className="text-3xl font-bold text-violet-600">{item.value}</p>
              <p className="font-medium">{item.title}</p>
              <p className="text-sm text-muted-foreground">{item.subtitle}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Services Grid */}
      <div>
        <div className="text-center mb-8">
          <Badge className="mb-4">Nos expertises</Badge>
          <h2 className="text-3xl font-bold mb-4">Des solutions IA complètes</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Nous vous accompagnons à chaque étape de votre transformation digitale avec des solutions adaptées à vos besoins.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, index) => (
            <Card key={index} className="group hover:shadow-xl transition-all duration-300 overflow-hidden">
              <CardHeader>
                <div className={`h-14 w-14 rounded-xl bg-gradient-to-br ${service.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <service.icon className="h-7 w-7 text-white" />
                </div>
                <CardTitle className="text-xl">{service.title}</CardTitle>
                <CardDescription className="text-base">{service.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 mb-4">
                  {service.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className="pt-4 border-t">
                  <Badge variant="secondary" className="bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300">
                    <Zap className="h-3 w-3 mr-1" />
                    {service.benefit}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Process Section */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30">
          <div className="text-center">
            <Badge className="mb-4">Notre méthode</Badge>
            <CardTitle className="text-2xl">Un accompagnement en 4 étapes</CardTitle>
            <CardDescription className="text-base">
              Une approche structurée pour garantir le succès de votre projet IA
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          <div className="grid md:grid-cols-4 gap-6">
            {process.map((item, index) => (
              <div key={index} className="relative">
                {index < process.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-violet-300 to-transparent" />
                )}
                <div className="text-center">
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto mb-4 text-white text-xl font-bold shadow-lg">
                    {item.step}
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* CTA Section */}
      <Card className="bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 text-white border-0">
        <CardContent className="p-8 lg:p-12">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-4">
                Prêt à transformer votre entreprise avec l'IA ?
              </h2>
              <p className="text-violet-100 text-lg mb-6">
                Contactez notre équipe pour discuter de votre projet et découvrir comment l'IA peut accélérer votre croissance.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button
                  size="lg"
                  className="bg-white text-violet-700 hover:bg-violet-50"
                  onClick={() => setLocation('/client/messages')}
                >
                  <MessageSquare className="mr-2 h-5 w-5" />
                  Discuter avec nous
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10"
                  onClick={() => setLocation('/client')}
                >
                  Retour au tableau de bord
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>
            <div className="hidden lg:flex justify-center">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="p-4 bg-white/10 rounded-xl backdrop-blur-sm">
                    <Users className="h-8 w-8 mb-2" />
                    <p className="font-semibold">+50 clients</p>
                    <p className="text-sm text-violet-200">accompagnés</p>
                  </div>
                  <div className="p-4 bg-white/10 rounded-xl backdrop-blur-sm">
                    <BarChart3 className="h-8 w-8 mb-2" />
                    <p className="font-semibold">+100 projets</p>
                    <p className="text-sm text-violet-200">réalisés</p>
                  </div>
                </div>
                <div className="space-y-4 mt-8">
                  <div className="p-4 bg-white/10 rounded-xl backdrop-blur-sm">
                    <Target className="h-8 w-8 mb-2" />
                    <p className="font-semibold">98%</p>
                    <p className="text-sm text-violet-200">satisfaction</p>
                  </div>
                  <div className="p-4 bg-white/10 rounded-xl backdrop-blur-sm">
                    <Sparkles className="h-8 w-8 mb-2" />
                    <p className="font-semibold">Paris</p>
                    <p className="text-sm text-violet-200">France</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="border-t pt-8">
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
