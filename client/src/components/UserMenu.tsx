import { LogOut, Settings, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useSpace } from '@/hooks/use-space';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';

export function UserMenu() {
  const { currentUser } = useSpace();
  const { logout, isLoggingOut } = useAuth();
  const [, navigate] = useLocation();

  if (!currentUser) return null;

  const initials = currentUser.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  const handleLogout = () => {
    logout();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full" data-testid="button-user-menu">
          <Avatar className="h-9 w-9">
            {currentUser.avatar && <AvatarImage src={currentUser.avatar} alt={currentUser.name} />}
            <AvatarFallback className="bg-primary text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span className="font-medium">{currentUser.name}</span>
            <span className="text-xs text-muted-foreground">{currentUser.email}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate('/profile')} data-testid="menu-item-profile">
          <User className="mr-2 h-4 w-4" />
          Mon profil
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/settings')} data-testid="menu-item-settings">
          <Settings className="mr-2 h-4 w-4" />
          Paramètres
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} disabled={isLoggingOut} data-testid="menu-item-logout">
          <LogOut className="mr-2 h-4 w-4" />
          {isLoggingOut ? 'Déconnexion...' : 'Déconnexion'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
