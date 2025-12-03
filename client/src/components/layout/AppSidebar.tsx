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
import { useSpace } from '@/hooks/use-space';
import type { Space } from '@/lib/types';

const portalConfig: Record<Space, { label: string; icon: typeof Shield; color: string }> = {
  internal: { label: 'Admin', icon: Shield, color: 'bg-primary' },
  client: { label: 'Client', icon: Building, color: 'bg-blue-600' },
  vendor: { label: 'Prestataire', icon: Wrench, color: 'bg-emerald-600' },
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
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/" className="flex items-center gap-2">
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${portal.color} text-white font-bold`}>
            <PortalIcon className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-lg leading-tight">IA Infinity</span>
            <Badge variant="outline" className="text-xs w-fit" data-testid="badge-current-portal">
              {portal.label}
            </Badge>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  data-testid="nav-website"
                >
                  <a href="https://i-a-infinity.com" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    <span>Site IA Infinity</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {filteredSecondaryItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`nav-${item.title.toLowerCase()}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarFooter>
    </Sidebar>
  );
}
