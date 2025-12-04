import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { 
  Sparkles, 
  Rocket, 
  Users, 
  TrendingUp, 
  Clock, 
  CheckCircle2,
  ArrowRight,
  Building2,
  Briefcase,
  GraduationCap,
  Wallet,
  Megaphone,
  HeartHandshake,
  Star,
  Play,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const stats = [
  { value: '15+', label: 'Entreprises accompagnées', icon: Building2 },
  { value: '187+', label: 'Professionnels formés', icon: Users },
  { value: '95%', label: 'Taux de satisfaction', icon: Star },
  { value: '3h', label: 'Gagnées par jour', icon: Clock },
];

const steps = [
  {
    number: '01',
    title: 'Audit de votre structure',
    description: 'Nous analysons vos besoins, vos outils actuels et vos enjeux pour concevoir une feuille de route claire et pragmatique.',
    icon: CheckCircle2,
  },
  {
    number: '02',
    title: 'Développement',
    description: 'Nous créons et déployons vos solutions IA en adoptant une méthodologie agile. Objectif : flexibilité et efficacité maximale.',
    icon: Rocket,
  },
  {
    number: '03',
    title: 'Formation de vos équipes',
    description: "Parce qu'un outil n'a de valeur que s'il est bien utilisé, nous formons vos collaborateurs pour qu'ils deviennent autonomes.",
    icon: GraduationCap,
  },
  {
    number: '04',
    title: "Suivi de l'intégration",
    description: 'Nous restons présents à vos côtés. Des points réguliers permettent d\'ajuster les solutions et optimiser vos résultats.',
    icon: TrendingUp,
  },
];

const sectors = [
  { name: 'Commerce', description: 'Automatisation des ventes, gestion des leads, relation client augmentée.', icon: Briefcase },
  { name: 'Administratif', description: 'Suppression des tâches répétitives (comptabilité, facturation, reporting).', icon: Building2 },
  { name: 'Marketing', description: 'Génération de contenus, planification automatisée et analyse de performance.', icon: Megaphone },
  { name: 'Ressources Humaines', description: 'Gestion des candidatures, onboarding, suivi des équipes.', icon: HeartHandshake },
  { name: 'Finance', description: 'Relances automatiques, tableaux de bord intelligents, prévisions.', icon: Wallet },
  { name: 'Éducation', description: 'Outils pédagogiques IA, soutien personnalisé et suivi apprenants.', icon: GraduationCap },
];

const testimonials = [
  {
    quote: "J'ai particulièrement apprécié la découverte de N8N, un outil très complet pour l'automatisation, ainsi que la bienveillance et l'adaptabilité d'Ismael.",
    author: 'Marina Royer',
    role: 'Chef de projet - The Artist Academy',
  },
  {
    quote: "Ismael est professionnel, à l'écoute, de bon conseil et en capacité de s'adapter à son client, ses attentes et spécificités.",
    author: 'Nathalie Joulié-Morand',
    role: 'PDG - NJM Conseil',
  },
  {
    quote: "Une prestation claire, simple et efficace. J'ai enfin compris des notions qui me semblaient compliquées.",
    author: 'Ahuura Teriitaumatatetin',
    role: 'Responsable - ADIE',
  },
];

const projects = [
  {
    title: 'CRM Automatisé',
    category: 'Commerce',
    description: 'Gestion intelligente des leads avec automatisation complète du suivi commercial.',
    duration: '3 mois',
    result: '+45% de conversion',
  },
  {
    title: 'Agent IA Client',
    category: 'Service Client',
    description: "Agent IA pour répondre automatiquement aux e-mails clients 24/7.",
    duration: '2 mois',
    result: '90% de satisfaction',
  },
  {
    title: 'Facturation Intelligente',
    category: 'Finance',
    description: 'Automatisation du suivi des factures et des relances de paiements.',
    duration: '1.5 mois',
    result: '-80% délais paiement',
  },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-neon text-white shadow-lg neon-glow-subtle">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="font-bold text-xl tracking-tight">IA Infinity</span>
          </Link>
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <a href="https://i-a-infinity.com" target="_blank" rel="noopener noreferrer">
                Site officiel
              </a>
            </Button>
            <Button asChild className="gradient-neon border-0 neon-glow-subtle">
              <Link href="/">
                Accéder à la plateforme
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 gradient-hero overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        </div>
        
        <div className="container mx-auto px-6 relative z-10">
          <motion.div 
            className="max-w-4xl mx-auto text-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge className="mb-6 gradient-neon text-white border-0 px-4 py-1.5">
              <Sparkles className="h-3.5 w-3.5 mr-2" />
              Depuis 2025
            </Badge>
            
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Intégrez l'IA dans votre entreprise,{' '}
              <span className="neon-text-violet">plus vite que vous ne l'imaginez</span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              IA Infinity accompagne les entreprises dans la mise en place de solutions d'intelligence artificielle simples, concrètes et adaptées à leur activité.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="gradient-neon border-0 text-lg px-8 neon-glow" asChild>
                <a href="https://i-a-infinity.com" target="_blank" rel="noopener noreferrer">
                  Prendre rendez-vous
                  <ChevronRight className="ml-2 h-5 w-5" />
                </a>
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 neon-border" asChild>
                <Link href="/">
                  <Play className="mr-2 h-5 w-5" />
                  Voir la plateforme
                </Link>
              </Button>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div 
            className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            {stats.map((stat, index) => (
              <Card key={stat.label} className="glass-neon stat-card border-0">
                <CardContent className="p-6 text-center">
                  <stat.icon className="h-8 w-8 mx-auto mb-3 text-violet-400" />
                  <div className="text-3xl md:text-4xl font-bold neon-text-violet mb-2">
                    {stat.value}
                  </div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </CardContent>
              </Card>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-6">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Un processus en <span className="neon-text-violet">4 étapes</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Notre méthode éprouvée pour transformer votre entreprise grâce à l'IA
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="glass-neon h-full group">
                  <CardContent className="p-6">
                    <div className="step-indicator mb-4">{step.number}</div>
                    <h3 className="text-xl font-semibold mb-3 group-hover:text-violet-400 transition-colors">
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground text-sm">{step.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center">
                Pourquoi choisir <span className="neon-text-violet">IA Infinity</span> ?
              </h2>
              
              <Card className="glass-neon mb-8">
                <CardContent className="p-8">
                  <blockquote className="text-xl italic text-center mb-6 text-muted-foreground">
                    "L'intelligence artificielle doit être simple, utile et accessible à toutes les entreprises, quelle que soit leur taille."
                  </blockquote>
                  <p className="text-center text-sm text-muted-foreground">
                    — Notre conviction depuis février 2024
                  </p>
                </CardContent>
              </Card>

              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center p-6">
                  <div className="w-12 h-12 rounded-full gradient-neon flex items-center justify-center mx-auto mb-4 neon-glow-subtle">
                    <HeartHandshake className="h-6 w-6 text-white" />
                  </div>
                  <h4 className="font-semibold mb-2">Approche humaine</h4>
                  <p className="text-sm text-muted-foreground">Sur-mesure et adaptée à votre contexte</p>
                </div>
                <div className="text-center p-6">
                  <div className="w-12 h-12 rounded-full gradient-neon flex items-center justify-center mx-auto mb-4 neon-glow-subtle">
                    <Rocket className="h-6 w-6 text-white" />
                  </div>
                  <h4 className="font-semibold mb-2">Intégration rapide</h4>
                  <p className="text-sm text-muted-foreground">Déploiement durable de l'IA</p>
                </div>
                <div className="text-center p-6">
                  <div className="w-12 h-12 rounded-full gradient-neon flex items-center justify-center mx-auto mb-4 neon-glow-subtle">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                  <h4 className="font-semibold mb-2">Résultats concrets</h4>
                  <p className="text-sm text-muted-foreground">Mesurables dès les premières semaines</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Sectors Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-6">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Nos secteurs d'<span className="neon-text-violet">activité</span>
            </h2>
            <p className="text-muted-foreground">
              Nous aidons des entreprises de tous horizons à intégrer l'IA
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sectors.map((sector, index) => (
              <motion.div
                key={sector.name}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="glass-neon h-full group cursor-pointer">
                  <CardContent className="p-6 flex items-start gap-4">
                    <div className="p-3 rounded-xl gradient-neon-subtle shrink-0 group-hover:gradient-neon transition-all">
                      <sector.icon className="h-6 w-6 text-violet-400 group-hover:text-white transition-colors" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2 group-hover:text-violet-400 transition-colors">
                        {sector.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">{sector.description}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Projects Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Nos derniers <span className="neon-text-violet">projets</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {projects.map((project, index) => (
              <motion.div
                key={project.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="glass-neon h-full group overflow-hidden">
                  <div className="h-2 gradient-neon" />
                  <CardContent className="p-6">
                    <Badge variant="outline" className="mb-4 neon-border">
                      {project.category}
                    </Badge>
                    <h3 className="text-xl font-semibold mb-3 group-hover:text-violet-400 transition-colors">
                      {project.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">{project.description}</p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{project.duration}</span>
                      <Badge className="gradient-neon text-white border-0">{project.result}</Badge>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-6">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Témoignages <span className="neon-text-violet">clients</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.author}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="glass-neon h-full">
                  <CardContent className="p-6">
                    <div className="flex mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                      ))}
                    </div>
                    <blockquote className="text-muted-foreground mb-6 italic">
                      "{testimonial.quote}"
                    </blockquote>
                    <div>
                      <div className="font-semibold">{testimonial.author}</div>
                      <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 gradient-hero relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-violet-500/20 rounded-full blur-3xl" />
        </div>
        
        <div className="container mx-auto px-6 relative z-10">
          <motion.div 
            className="text-center max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              IA Infinity vous accompagne dans votre{' '}
              <span className="neon-text-violet">transition à l'IA</span>
            </h2>
            <p className="text-muted-foreground mb-8">
              Rejoignez les entreprises qui ont déjà franchi le pas vers l'automatisation intelligente
            </p>
            <Button size="lg" className="gradient-neon border-0 text-lg px-10 neon-glow" asChild>
              <a href="https://i-a-infinity.com" target="_blank" rel="noopener noreferrer">
                Prendre rendez-vous
                <ArrowRight className="ml-2 h-5 w-5" />
              </a>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border/50">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-neon text-white">
                <Sparkles className="h-5 w-5" />
              </div>
              <span className="font-bold text-lg">IA Infinity</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="https://i-a-infinity.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                Site officiel
              </a>
              <span>|</span>
              <span>© 2025 IA Infinity. Tous droits réservés.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
