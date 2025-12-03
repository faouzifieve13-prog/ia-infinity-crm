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
} from 'lucide-react';
import { SiNotion } from 'react-icons/si';
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
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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

const navItems: NavItem[] = [
  { title: 'Tableau de bord', url: '/', icon: LayoutDashboard, spaces: ['internal', 'client', 'vendor'] },
  { title: 'Pipeline', url: '/pipeline', icon: Target, spaces: ['internal'] },
  { title: 'Comptes', url: '/accounts', icon: Building2, spaces: ['internal'] },
  { title: 'Contacts', url: '/contacts', icon: Users, spaces: ['internal'] },
  { title: 'Projets', url: '/projects', icon: FolderKanban, spaces: ['internal', 'client', 'vendor'] },
  { title: 'Tâches', url: '/tasks', icon: ListTodo, spaces: ['internal', 'client', 'vendor'] },
  { title: 'Contrats', url: '/contracts', icon: FileSignature, spaces: ['internal', 'client'] },
  { title: 'Workflows', url: '/workflows', icon: Workflow, spaces: ['internal'] },
  { title: 'Documents', url: '/documents', icon: FileText, spaces: ['internal', 'client', 'vendor'] },
  { title: 'Factures', url: '/invoices', icon: Receipt, spaces: ['internal', 'client'] },
  { title: 'Dépenses', url: '/expenses', icon: Wallet, spaces: ['internal'] },
  { title: 'Prestataires', url: '/vendors', icon: Briefcase, spaces: ['internal'] },
  { title: 'Mes Missions', url: '/missions', icon: UserCog, spaces: ['vendor'] },
];

const secondaryItems: NavItem[] = [
  { title: 'Sync Notion', url: '/notion-sync', icon: RefreshCw, spaces: ['internal'] },
  { title: 'Invitations', url: '/invitations', icon: UserPlus, spaces: ['internal'] },
  { title: 'Paramètres', url: '/settings', icon: Settings, spaces: ['internal', 'client', 'vendor'] },
  { title: 'Aide', url: '/help', icon: HelpCircle, spaces: ['internal', 'client', 'vendor'] },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { currentSpace } = useSpace();

  const filteredNavItems = navItems.filter((item) => item.spaces.includes(currentSpace));
  const filteredSecondaryItems = secondaryItems.filter((item) => item.spaces.includes(currentSpace));
  
  const portal = portalConfig[currentSpace];
  const PortalIcon = portal.icon;

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
          <SidebarGroupLabel className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider px-2">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredNavItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className={`relative group/item transition-all duration-200 ${isActive ? 'bg-sidebar-accent' : ''}`}
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
        </SidebarGroup>
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
