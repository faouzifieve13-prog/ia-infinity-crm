import { useState } from 'react';
import { Check, ChevronsUpDown, X, Star, UserCheck, Eye, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Vendor, ProjectVendorRole } from '@/lib/types';

export interface VendorAssignment {
  vendorId: string;
  role: ProjectVendorRole;
}

interface VendorMultiSelectProps {
  vendors: Vendor[];
  value: VendorAssignment[];
  onChange: (value: VendorAssignment[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

const ROLE_CONFIG: Record<ProjectVendorRole, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  lead: { label: 'Responsable', icon: Star, color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300' },
  contributor: { label: 'Contributeur', icon: UserCheck, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
  reviewer: { label: 'Relecteur', icon: Eye, color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' },
  specialist: { label: 'Spécialiste', icon: Wrench, color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300' },
};

export function VendorMultiSelect({
  vendors,
  value,
  onChange,
  placeholder = 'Sélectionner des sous-traitants...',
  disabled = false,
}: VendorMultiSelectProps) {
  const [open, setOpen] = useState(false);

  const selectedVendorIds = new Set(value.map(v => v.vendorId));

  const toggleVendor = (vendorId: string) => {
    if (selectedVendorIds.has(vendorId)) {
      onChange(value.filter(v => v.vendorId !== vendorId));
    } else {
      onChange([...value, { vendorId, role: 'contributor' }]);
    }
  };

  const updateRole = (vendorId: string, role: ProjectVendorRole) => {
    onChange(value.map(v => v.vendorId === vendorId ? { ...v, role } : v));
  };

  const removeVendor = (vendorId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter(v => v.vendorId !== vendorId));
  };

  const getVendorById = (id: string) => vendors.find(v => v.id === id);

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-auto min-h-10"
            disabled={disabled}
            data-testid="vendor-multi-select-trigger"
          >
            {value.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {value.slice(0, 3).map((assignment) => {
                  const vendor = getVendorById(assignment.vendorId);
                  const roleConfig = ROLE_CONFIG[assignment.role];
                  return (
                    <Badge
                      key={assignment.vendorId}
                      variant="secondary"
                      className={cn("text-xs", roleConfig.color)}
                    >
                      {vendor?.name || 'Inconnu'}
                      <button
                        type="button"
                        className="ml-1 rounded-full outline-none hover:bg-black/20 dark:hover:bg-white/20"
                        onClick={(e) => removeVendor(assignment.vendorId, e)}
                        aria-label={`Retirer ${vendor?.name}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })}
                {value.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{value.length - 3}
                  </Badge>
                )}
              </div>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Rechercher un sous-traitant..." />
            <CommandList>
              <CommandEmpty>Aucun sous-traitant trouvé.</CommandEmpty>
              <CommandGroup>
                {vendors.map((vendor) => {
                  const isSelected = selectedVendorIds.has(vendor.id);
                  return (
                    <CommandItem
                      key={vendor.id}
                      value={vendor.name}
                      onSelect={() => toggleVendor(vendor.id)}
                      className="cursor-pointer"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          isSelected ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex-1">
                        <div className="font-medium">{vendor.name}</div>
                        {vendor.company && (
                          <div className="text-xs text-muted-foreground">{vendor.company}</div>
                        )}
                      </div>
                      {vendor.skills && vendor.skills.length > 0 && (
                        <div className="flex gap-1">
                          {vendor.skills.slice(0, 2).map((skill) => (
                            <Badge key={skill} variant="outline" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Role assignment for each selected vendor */}
      {value.length > 0 && (
        <div className="space-y-2 mt-3">
          <p className="text-sm font-medium text-muted-foreground">Rôles des sous-traitants</p>
          {value.map((assignment) => {
            const vendor = getVendorById(assignment.vendorId);
            const roleConfig = ROLE_CONFIG[assignment.role];
            const RoleIcon = roleConfig.icon;
            return (
              <div
                key={assignment.vendorId}
                className="flex items-center gap-2 p-2 border rounded-lg bg-muted/30"
              >
                <div className="flex-1 flex items-center gap-2">
                  <RoleIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">{vendor?.name || 'Inconnu'}</span>
                </div>
                <Select
                  value={assignment.role}
                  onValueChange={(role: ProjectVendorRole) => updateRole(assignment.vendorId, role)}
                >
                  <SelectTrigger className="w-[160px] h-8" data-testid={`role-select-${assignment.vendorId}`}>
                    <SelectValue placeholder="Sélectionner un rôle" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLE_CONFIG).map(([roleKey, config]) => {
                      const Icon = config.icon;
                      return (
                        <SelectItem key={roleKey} value={roleKey}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-3 w-3" />
                            {config.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => removeVendor(assignment.vendorId, e)}
                  aria-label={`Retirer ${vendor?.name}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Display component for showing assigned vendors (used in cards and lists)
export function VendorBadges({
  vendors,
  maxVisible = 2,
}: {
  vendors: Array<{ vendor: Vendor; role: ProjectVendorRole }>;
  maxVisible?: number;
}) {
  if (!vendors || vendors.length === 0) return null;

  const visibleVendors = vendors.slice(0, maxVisible);
  const remaining = vendors.length - maxVisible;

  return (
    <div className="flex flex-wrap gap-1 items-center">
      {visibleVendors.map(({ vendor, role }) => {
        const roleConfig = ROLE_CONFIG[role];
        const Icon = roleConfig.icon;
        return (
          <Badge
            key={vendor.id}
            variant="secondary"
            className={cn("text-xs gap-1", roleConfig.color)}
            title={`${vendor.name} - ${roleConfig.label}`}
          >
            <Icon className="h-3 w-3" />
            {vendor.name}
          </Badge>
        );
      })}
      {remaining > 0 && (
        <Badge variant="outline" className="text-xs">
          +{remaining}
        </Badge>
      )}
    </div>
  );
}

export { ROLE_CONFIG };
