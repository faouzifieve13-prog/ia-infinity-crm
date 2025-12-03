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
} from 'lucide-react';
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
import { useSpace } from '@/hooks/use-space';
import type { Space } from '@/lib/types';

interface NavItem {
  title: string;
  url: string;
  icon: typeof LayoutDashboard;
  spaces: Space[];
}

const navItems: NavItem[] = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard, spaces: ['internal', 'client', 'vendor'] },
  { title: 'Pipeline', url: '/pipeline', icon: Target, spaces: ['internal'] },
  { title: 'Accounts', url: '/accounts', icon: Building2, spaces: ['internal'] },
  { title: 'Contacts', url: '/contacts', icon: Users, spaces: ['internal'] },
  { title: 'Projects', url: '/projects', icon: FolderKanban, spaces: ['internal', 'client'] },
  { title: 'Tasks', url: '/tasks', icon: ListTodo, spaces: ['internal', 'client', 'vendor'] },
  { title: 'Workflows', url: '/workflows', icon: Workflow, spaces: ['internal', 'client'] },
  { title: 'Documents', url: '/documents', icon: FileText, spaces: ['internal', 'client'] },
  { title: 'Invoices', url: '/invoices', icon: Receipt, spaces: ['internal', 'client'] },
  { title: 'Vendors', url: '/vendors', icon: Briefcase, spaces: ['internal'] },
  { title: 'Missions', url: '/missions', icon: UserCog, spaces: ['vendor'] },
];

const secondaryItems: NavItem[] = [
  { title: 'Settings', url: '/settings', icon: Settings, spaces: ['internal', 'client', 'vendor'] },
  { title: 'Help', url: '/help', icon: HelpCircle, spaces: ['internal', 'client', 'vendor'] },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { currentSpace } = useSpace();

  const filteredNavItems = navItems.filter((item) => item.spaces.includes(currentSpace));
  const filteredSecondaryItems = secondaryItems.filter((item) => item.spaces.includes(currentSpace));

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
            IA
          </div>
          <span className="font-semibold text-lg">IA Infinity</span>
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
