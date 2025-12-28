import { LogOut, Settings, User, Mail, Shield, ChevronDown, Camera, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

const roleLabels: Record<string, string> = {
  admin: 'Administrateur',
  sales: 'Commercial',
  delivery: 'Livraison',
  finance: 'Finance',
  client_admin: 'Admin Client',
  client_member: 'Membre Client',
  vendor: 'Sous-traitant',
};

const roleColors: Record<string, string> = {
  admin: 'bg-primary/20 text-primary border-primary/30',
  sales: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  delivery: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  finance: 'bg-green-500/20 text-green-400 border-green-500/30',
  client_admin: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  client_member: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  vendor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
};

export function UserMenu() {
  const { currentUser } = useSpace();
  const { logout, isLoggingOut } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Fetch available spaces
  const { data: spacesData } = useQuery<any>({
    queryKey: ['/api/auth/available-spaces'],
    enabled: !!currentUser,
  });

  const switchSpaceMutation = useMutation({
    mutationFn: async (membershipId: string) => {
      const response = await fetch('/api/auth/switch-space', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ membershipId }),
      });

      if (!response.ok) {
        throw new Error('Failed to switch space');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Espace changé",
        description: `Vous êtes maintenant dans l'espace ${data.space}`,
      });

      // Redirect based on new role
      if (data.role === "client_admin" || data.role === "client_member") {
        window.location.href = "/client";
      } else if (data.role === "vendor") {
        window.location.href = "/vendor";
      } else {
        window.location.href = "/";
      }
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de changer d'espace",
        variant: "destructive",
      });
    },
  });

  if (!currentUser) return null;

  const availableSpaces = spacesData?.availableSpaces || [];
  const hasMultipleSpaces = availableSpaces.length > 1;

  const initials = currentUser.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  const handleLogout = () => {
    logout();
  };

  const roleLabel = roleLabels[currentUser.role || 'admin'] || currentUser.role;
  const roleColor = roleColors[currentUser.role || 'admin'] || roleColors.admin;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-auto py-1.5 px-2 gap-2 rounded-full hover:bg-muted/80"
          data-testid="button-user-menu"
        >
          <Avatar className="h-8 w-8 border-2 border-primary/20">
            {currentUser.avatar && <AvatarImage src={currentUser.avatar} alt={currentUser.name} />}
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden md:flex flex-col items-start text-left">
            <span className="text-sm font-medium leading-tight">{currentUser.name}</span>
            <span className="text-xs text-muted-foreground leading-tight">{roleLabel}</span>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground hidden md:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 p-0">
        {/* Profile Header */}
        <div className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 border-b">
          <div className="flex items-center gap-3">
            <div className="relative group">
              <Avatar className="h-16 w-16 border-4 border-background shadow-lg">
                {currentUser.avatar && <AvatarImage src={currentUser.avatar} alt={currentUser.name} />}
                <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => navigate('/profile')}
                className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <Camera className="h-5 w-5 text-white" />
              </button>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base truncate">{currentUser.name}</h3>
              <div className="flex items-center gap-1 text-muted-foreground text-xs mt-0.5">
                <Mail className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{currentUser.email}</span>
              </div>
              <Badge variant="outline" className={`mt-2 text-xs ${roleColor}`}>
                <Shield className="h-3 w-3 mr-1" />
                {roleLabel}
              </Badge>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="p-2">
          <DropdownMenuItem
            onClick={() => navigate('/profile')}
            className="cursor-pointer rounded-md"
            data-testid="menu-item-profile"
          >
            <User className="mr-2 h-4 w-4" />
            <div className="flex flex-col">
              <span>Mon profil</span>
              <span className="text-xs text-muted-foreground">Modifier mes informations</span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => navigate('/settings')}
            className="cursor-pointer rounded-md"
            data-testid="menu-item-settings"
          >
            <Settings className="mr-2 h-4 w-4" />
            <div className="flex flex-col">
              <span>Parametres</span>
              <span className="text-xs text-muted-foreground">Preferences et securite</span>
            </div>
          </DropdownMenuItem>
        </div>

        {/* Space Switcher - only if user has multiple spaces */}
        {hasMultipleSpaces && (
          <>
            <DropdownMenuSeparator className="my-0" />
            <div className="p-2">
              <DropdownMenuLabel className="text-xs text-muted-foreground px-2">
                Changer d'espace
              </DropdownMenuLabel>
              {availableSpaces
                .filter((space: any) => !space.isCurrent)
                .map((space: any) => (
                  <DropdownMenuItem
                    key={space.membershipId}
                    onClick={() => switchSpaceMutation.mutate(space.membershipId)}
                    disabled={switchSpaceMutation.isPending}
                    className="cursor-pointer rounded-md"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    <div className="flex flex-col">
                      <span>
                        {space.space === 'client' ? 'Espace Client' :
                         space.space === 'vendor' ? 'Espace Sous-traitant' :
                         'Espace Interne'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {roleLabels[space.role] || space.role}
                      </span>
                    </div>
                  </DropdownMenuItem>
                ))}
            </div>
          </>
        )}

        <DropdownMenuSeparator className="my-0" />

        {/* Logout */}
        <div className="p-2">
          <DropdownMenuItem
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="cursor-pointer rounded-md text-destructive focus:text-destructive focus:bg-destructive/10"
            data-testid="menu-item-logout"
          >
            <LogOut className="mr-2 h-4 w-4" />
            {isLoggingOut ? 'Deconnexion...' : 'Deconnexion'}
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
