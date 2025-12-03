import { Bell, CheckCircle2, AlertCircle, Clock, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SpaceSwitcher } from '@/components/SpaceSwitcher';
import { GlobalSearch } from '@/components/GlobalSearch';
import { ThemeToggle } from '@/components/ThemeToggle';
import { UserMenu } from '@/components/UserMenu';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

const mockNotifications = [
  { id: '1', title: 'Nouveau deal conclu', description: 'DigiSoft - 52 000€', time: 'Il y a 5 min', type: 'success' as const },
  { id: '2', title: 'Erreur workflow', description: 'Sync Notion a échoué', time: 'Il y a 1h', type: 'error' as const },
  { id: '3', title: 'Facture en retard', description: 'DataFlow Inc - 9 500€', time: 'Il y a 2h', type: 'warning' as const },
];

const notificationIcons = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: Clock,
};

const notificationColors = {
  success: 'text-emerald-500 bg-emerald-500/10',
  error: 'text-red-500 bg-red-500/10',
  warning: 'text-amber-500 bg-amber-500/10',
};

export function AppHeader() {
  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b border-border/50 px-4 bg-background/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <SidebarTrigger 
            data-testid="button-sidebar-toggle" 
            className="hover:bg-muted transition-colors"
          />
        </motion.div>
        <SpaceSwitcher />
      </div>

      <div className="flex items-center gap-2">
        <GlobalSearch />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="relative group" 
              data-testid="button-notifications"
            >
              <Bell className="h-5 w-5 group-hover:text-primary transition-colors" />
              <AnimatePresence>
                {mockNotifications.length > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -right-1 -top-1"
                  >
                    <Badge className="h-5 min-w-5 rounded-full p-0 text-xs flex items-center justify-center bg-primary shadow-lg shadow-primary/30">
                      {mockNotifications.length}
                    </Badge>
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-0">
            <div className="p-3 border-b bg-muted/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold text-sm">Notifications</h4>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {mockNotifications.length} nouvelles
                </Badge>
              </div>
            </div>
            <ScrollArea className="max-h-80">
              {mockNotifications.map((notification, index) => {
                const Icon = notificationIcons[notification.type];
                const colorClass = notificationColors[notification.type];
                return (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <DropdownMenuItem className="flex items-start gap-3 p-3 cursor-pointer focus:bg-muted/50">
                      <div className={`p-2 rounded-lg shrink-0 ${colorClass}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-sm block truncate">{notification.title}</span>
                        <span className="text-xs text-muted-foreground block truncate">{notification.description}</span>
                        <span className="text-xs text-muted-foreground/70 mt-1 block">{notification.time}</span>
                      </div>
                    </DropdownMenuItem>
                  </motion.div>
                );
              })}
            </ScrollArea>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Button variant="ghost" size="sm" className="w-full text-primary hover:text-primary">
                Voir toutes les notifications
              </Button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
