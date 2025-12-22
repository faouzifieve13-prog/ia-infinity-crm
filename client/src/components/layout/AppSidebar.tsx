import { useLocation, Link } from 'wouter';
import {
  LayoutDashboard,
  Target,
  Building2,
  Users,
  FolderKanban,
  ListTodo,
  Workflow,
  FileText,
  Receipt,
  Briefcase,
  UserCog,
  Settings,
  HelpCircle,
  FileSignature,
  ExternalLink,
  RefreshCw,
  Wallet,
  UserPlus,
  Shield,
  Building,
  Wrench,
  Sparkles,
  Calendar,
  TrendingUp,
  UserCheck,
  Handshake,
  ChevronDown,
  ChevronRight,
  PieChart,
  CreditCard,
  FolderOpen,
} from 'lucide-react';
import { useState } from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useSpace } from '@/hooks/use-space';
import type { Space } from '@/lib/types';

const portalConfig: Record<Space, { label: string; icon: typeof Shield; gradient: string; badge: string }> = {
  internal: { 
    label: 'Admin', 
    icon: Shield, 
    gradient: 'gradient-admin',
    badge: 'bg-primary/20 text-primary border-primary/30'
  },
  client: { 
    label: 'Client', 
    icon: Building, 
    gradient: 'gradient-client',
    badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
  },
  vendor: { 
    label: 'Prestataire', 
    icon: Wrench, 
    gradient: 'gradient-vendor',
    badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
  },
};

interface NavItem {
  title: string;
  url: string;
  icon: typeof LayoutDashboard;
  spaces: Space[];
}

interface NavCategory {
  title: string;
  icon: typeof LayoutDashboard;
  items: NavItem[];
  spaces: Space[];
}

const navCategories: NavCategory[] = [
  {
    title: 'Commercial',
    icon: TrendingUp,
    spaces: ['internal'],
    items: [
      { title: 'Pipeline', url: '/pipeline', icon: Target, spaces: ['internal'] },
      { title: 'Base Clients', url: '/accounts', icon: Building2, spaces: ['internal'] },
    ],
  },
  {
    title: 'Contacts',
    icon: Users,
    spaces: ['internal'],
    items: [
      { title: 'Tous les contacts', url: '/contacts', icon: Users, spaces: ['internal'] },
    ],
  },
  {
    title: 'Projets',
    icon: FolderKanban,
    spaces: ['internal', 'client', 'vendor'],
    items: [
      { title: 'Vue Projets', url: '/projects', icon: FolderKanban, spaces: ['internal', 'client', 'vendor'] },
      { title: 'Mes Missions', url: '/missions', icon: UserCog, spaces: ['vendor'] },
    ],
  },
  {
    title: 'Finance',
    icon: PieChart,
    spaces: ['internal', 'client'],
    items: [
      { title: 'Finance globale', url: '/finance', icon: PieChart, spaces: ['internal'] },
      { title: 'Factures Clients', url: '/invoices', icon: Receipt, spaces: ['internal', 'client'] },
      { title: 'Dépenses', url: '/expenses', icon: Wallet, spaces: ['internal'] },
      { title: 'Prestataires', url: '/vendors', icon: Briefcase, spaces: ['internal'] },
    ],
  },
  {
    title: 'Tâches',
    icon: ListTodo,
    spaces: ['internal', 'client', 'vendor'],
    items: [
      { title: 'Toutes les tâches', url: '/tasks', icon: ListTodo, spaces: ['internal', 'client', 'vendor'] },
    ],
  },
  {
    title: 'RDV',
    icon: Calendar,
    spaces: ['internal'],
    items: [
      { title: 'Calendrier', url: '/calendar', icon: Calendar, spaces: ['internal'] },
    ],
  },
  {
    title: 'Documents',
    icon: FolderOpen,
    spaces: ['internal', 'client', 'vendor'],
    items: [
      { title: 'Tous les documents', url: '/documents', icon: FileText, spaces: ['internal', 'client', 'vendor'] },
      { title: 'Contrats', url: '/contracts', icon: FileSignature, spaces: ['internal', 'client'] },
    ],
  },
  {
    title: 'Administration',
    icon: Shield,
    spaces: ['internal'],
    items: [
      { title: 'Gestion des accès', url: '/invitations', icon: UserPlus, spaces: ['internal'] },
      { title: 'Sync Notion', url: '/notion-sync', icon: RefreshCw, spaces: ['internal'] },
    ],
  },
];

const secondaryItems: NavItem[] = [
  { title: 'Paramètres', url: '/settings', icon: Settings, spaces: ['internal', 'client', 'vendor'] },
  { title: 'Aide', url: '/help', icon: HelpCircle, spaces: ['internal', 'client', 'vendor'] },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { currentSpace } = useSpace();
  const [openCategories, setOpenCategories] = useState<string[]>(['Commercial', 'Projets', 'Finance', 'Tâches', 'RDV', 'Documents', 'Administration']);

  const toggleCategory = (category: string) => {
    setOpenCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const filteredCategories = navCategories
    .filter(cat => cat.spaces.includes(currentSpace))
    .map(cat => ({
      ...cat,
      items: cat.items.filter(item => item.spaces.includes(currentSpace))
    }))
    .filter(cat => cat.items.length > 0);
  
  const filteredSecondaryItems = secondaryItems.filter(item => item.spaces.includes(currentSpace));
  
  const portal = portalConfig[currentSpace];
  const PortalIcon = portal.icon;

  const isItemActive = (url: string) => location === url;
  const isCategoryActive = (items: NavItem[]) => items.some(item => isItemActive(item.url));

  return (
    <Sidebar className="border-r-0">
      <SidebarHeader className="p-4 border-b border-sidebar-border/50">
        <Link href="/" className="flex items-center gap-3 group">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${portal.gradient} text-white shadow-lg transition-transform hover:scale-105 active:scale-95`}>
            <PortalIcon className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg tracking-tight text-sidebar-foreground group-hover:text-sidebar-primary transition-colors">
              IA Infinity
            </span>
            <Badge 
              variant="outline" 
              className={`text-xs w-fit border ${portal.badge}`}
              data-testid="badge-current-portal"
            >
              <Sparkles className="h-3 w-3 mr-1" />
              {portal.label}
            </Badge>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location === '/'}
                  className={`relative group/item transition-all duration-200 ${location === '/' ? 'bg-sidebar-accent' : ''}`}
                  data-testid="nav-tableau-de-bord"
                >
                  <Link href="/">
                    {location === '/' && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-sidebar-primary" />
                    )}
                    <LayoutDashboard className={`h-4 w-4 transition-all duration-200 ${location === '/' ? 'text-sidebar-primary' : ''} group-hover/item:scale-110`} />
                    <span className={location === '/' ? 'font-medium' : ''}>Tableau de bord</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {filteredCategories.map((category) => (
          <SidebarGroup key={category.title}>
            <Collapsible
              open={openCategories.includes(category.title)}
              onOpenChange={() => toggleCategory(category.title)}
            >
              <CollapsibleTrigger asChild>
                <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover:bg-sidebar-accent/50 rounded-md px-2 py-1.5 text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <category.icon className={`h-4 w-4 ${isCategoryActive(category.items) ? 'text-sidebar-primary' : ''}`} />
                    <span>{category.title}</span>
                  </div>
                  {openCategories.includes(category.title) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </SidebarGroupLabel>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {category.items.map((item) => {
                      const isActive = isItemActive(item.url);
                      return (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton
                            asChild
                            isActive={isActive}
                            className={`relative group/item transition-all duration-200 ml-2 ${isActive ? 'bg-sidebar-accent' : ''}`}
                            data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                          >
                            <Link href={item.url}>
                              {isActive && (
                                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-sidebar-primary" />
                              )}
                              <item.icon className={`h-4 w-4 transition-all duration-200 ${isActive ? 'text-sidebar-primary' : ''} group-hover/item:scale-110`} />
                              <span className={isActive ? 'font-medium' : ''}>{item.title}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/50 px-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  className="group/link"
                  data-testid="nav-website"
                >
                  <a href="https://i-a-infinity.com" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 transition-transform group-hover/link:rotate-12" />
                    <span>Site IA Infinity</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {filteredSecondaryItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className={`relative transition-all duration-200 ${isActive ? 'bg-sidebar-accent' : ''}`}
                      data-testid={`nav-${item.title.toLowerCase()}`}
                    >
                      <Link href={item.url}>
                        {isActive && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-sidebar-primary" />
                        )}
                        <item.icon className={`h-4 w-4 ${isActive ? 'text-sidebar-primary' : ''}`} />
                        <span className={isActive ? 'font-medium' : ''}>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarFooter>
    </Sidebar>
  );
}
