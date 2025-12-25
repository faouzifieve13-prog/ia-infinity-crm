import { Building2, Users, Briefcase, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useSpace } from '@/hooks/use-space';
import type { Space } from '@/lib/types';

const spaceConfig: Record<Space, { label: string; icon: typeof Building2 }> = {
  internal: { label: 'Admin', icon: Building2 },
  client: { label: 'Espace Client', icon: Users },
  vendor: { label: 'Espace Sous-traitant', icon: Briefcase },
};

export function SpaceSwitcher() {
  const { currentSpace, setSpace, currentUser, canAccessSpace } = useSpace();
  const config = spaceConfig[currentSpace];
  const Icon = config.icon;

  const availableSpaces = (Object.keys(spaceConfig) as Space[]).filter(canAccessSpace);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2" data-testid="button-space-switcher">
          <Icon className="h-4 w-4" />
          <span className="font-medium">{config.label}</span>
          <Badge variant="secondary" className="ml-1 text-xs">
            {currentUser?.role.replace('_', ' ')}
          </Badge>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {availableSpaces.map((space) => {
          const SpaceIcon = spaceConfig[space].icon;
          return (
            <DropdownMenuItem
              key={space}
              onClick={() => setSpace(space)}
              className={currentSpace === space ? 'bg-accent' : ''}
              data-testid={`menu-item-space-${space}`}
            >
              <SpaceIcon className="mr-2 h-4 w-4" />
              {spaceConfig[space].label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
