import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, parseISO, isWithinInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { VendorAvailabilityPeriod, Vendor, VendorAvailability } from '@/lib/types';

const cellColors: Record<VendorAvailability, string> = {
  available: 'bg-green-400 dark:bg-green-600',
  busy: 'bg-yellow-400 dark:bg-yellow-500',
  unavailable: 'bg-red-400 dark:bg-red-600',
};
const defaultCellColor = 'bg-gray-100 dark:bg-gray-800';

interface AvailabilityResponse {
  vendors: Vendor[];
  availabilities: VendorAvailabilityPeriod[];
}

function getStatusForDay(
  vendorId: string,
  day: Date,
  availabilities: VendorAvailabilityPeriod[],
): { status: VendorAvailability | null; period: VendorAvailabilityPeriod | null } {
  const vendorPeriods = availabilities.filter((a) => a.vendorId === vendorId);

  const covering = vendorPeriods.filter((period) => {
    const start = parseISO(period.startDate);
    const end = parseISO(period.endDate);
    return isWithinInterval(day, { start, end });
  });

  if (covering.length === 0) {
    return { status: null, period: null };
  }

  // Most recent by createdAt descending
  covering.sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return dateB - dateA;
  });

  return { status: covering[0].status, period: covering[0] };
}

function isWeekend(day: Date): boolean {
  const d = getDay(day);
  return d === 0 || d === 6;
}

function isToday(day: Date): boolean {
  const now = new Date();
  return (
    day.getFullYear() === now.getFullYear() &&
    day.getMonth() === now.getMonth() &&
    day.getDate() === now.getDate()
  );
}

const dayAbbreviations: Record<number, string> = {
  0: 'Dim',
  1: 'Lun',
  2: 'Mar',
  3: 'Mer',
  4: 'Jeu',
  5: 'Ven',
  6: 'Sam',
};

export default function VendorAvailabilityAdmin() {
  const [currentMonth, setCurrentMonth] = useState<Date>(startOfMonth(new Date()));
  const [searchQuery, setSearchQuery] = useState('');
  const [skillFilter, setSkillFilter] = useState('');

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const startParam = format(monthStart, 'yyyy-MM-dd');
  const endParam = format(monthEnd, 'yyyy-MM-dd');

  const { data, isLoading } = useQuery<AvailabilityResponse>({
    queryKey: ['/api/vendor-availabilities', startParam, endParam],
    queryFn: async () => {
      const res = await fetch(
        `/api/vendor-availabilities?start=${encodeURIComponent(startParam)}&end=${encodeURIComponent(endParam)}`,
      );
      if (!res.ok) {
        throw new Error('Failed to fetch vendor availabilities');
      }
      return res.json();
    },
  });

  const vendors = data?.vendors ?? [];
  const availabilities = data?.availabilities ?? [];

  const filteredVendors = useMemo(() => {
    let result = vendors;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          v.company.toLowerCase().includes(q),
      );
    }

    if (skillFilter.trim()) {
      const q = skillFilter.toLowerCase().trim();
      result = result.filter((v) =>
        v.skills.some((skill) => skill.toLowerCase().includes(q)),
      );
    }

    return result;
  }, [vendors, searchQuery, skillFilter]);

  const handlePrevMonth = () => {
    setCurrentMonth((prev) => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => addMonths(prev, 1));
  };

  const monthLabel = format(currentMonth, 'MMMM yyyy', { locale: fr });
  // Capitalize first letter
  const capitalizedMonthLabel = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Disponibilites Sous-traitants
        </h1>
        <p className="text-muted-foreground">
          Vue planning des disponibilites de vos sous-traitants sur le mois
        </p>
      </div>

      {/* Controls bar */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Month navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[180px] text-center">
            <span className="text-sm text-muted-foreground">Mois</span>
            <p className="font-semibold">{capitalizedMonthLabel}</p>
          </div>
          <Button variant="outline" size="icon" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Search input */}
        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom ou entreprise..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Skill filter input */}
        <div className="relative min-w-[200px] max-w-[250px]">
          <Input
            placeholder="Filtrer par competence..."
            value={skillFilter}
            onChange={(e) => setSkillFilter(e.target.value)}
          />
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span className="font-medium">Legende :</span>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-4 w-4 rounded bg-green-400 dark:bg-green-600" />
          <span>Vert = Disponible</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-4 w-4 rounded bg-yellow-400 dark:bg-yellow-500" />
          <span>Jaune = Occupe</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-4 w-4 rounded bg-red-400 dark:bg-red-600" />
          <span>Rouge = Indisponible</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-4 w-4 rounded bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600" />
          <span>Gris = Non renseigne</span>
        </div>
      </div>

      {/* Vendor count */}
      <div className="text-sm text-muted-foreground">
        <Badge variant="secondary">{filteredVendors.length} sous-traitants</Badge>
      </div>

      {/* Planning grid */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Planning mensuel</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              Chargement des disponibilites...
            </div>
          ) : filteredVendors.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
              <Info className="h-8 w-8" />
              <p>Aucun sous-traitant ne correspond aux filtres appliques.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    {/* Sticky vendor header cell */}
                    <th
                      className="sticky left-0 z-10 bg-background border-b border-r px-3 py-2 text-left font-medium min-w-[200px]"
                    >
                      Sous-traitant
                    </th>
                    {daysInMonth.map((day) => {
                      const dayNum = format(day, 'd');
                      const dayName = dayAbbreviations[getDay(day)];
                      const weekend = isWeekend(day);
                      const today = isToday(day);
                      return (
                        <th
                          key={day.toISOString()}
                          className={`border-b px-0 py-1 text-center font-normal min-w-[36px] ${
                            weekend ? 'bg-muted/50' : ''
                          } ${today ? 'ring-2 ring-inset ring-blue-500' : ''}`}
                        >
                          <div className="text-xs font-semibold">{dayNum}</div>
                          <div className="text-[10px] text-muted-foreground">{dayName}</div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {filteredVendors.map((vendor) => (
                    <tr key={vendor.id} className="hover:bg-muted/20">
                      {/* Sticky vendor name cell */}
                      <td
                        className="sticky left-0 z-10 bg-background border-b border-r px-3 py-2 min-w-[200px]"
                      >
                        <div className="font-medium truncate max-w-[180px]">{vendor.name}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[180px]">
                          {vendor.company}
                        </div>
                      </td>
                      {daysInMonth.map((day) => {
                        const { status, period } = getStatusForDay(
                          vendor.id,
                          day,
                          availabilities,
                        );
                        const weekend = isWeekend(day);
                        const today = isToday(day);
                        const colorClass = status
                          ? cellColors[status]
                          : defaultCellColor;

                        const cellContent = (
                          <td
                            key={day.toISOString()}
                            className={`border-b px-0 py-0 text-center ${
                              today ? 'ring-2 ring-inset ring-blue-500' : ''
                            }`}
                          >
                            <div
                              className={`h-10 w-full ${colorClass} ${
                                weekend ? 'opacity-70' : ''
                              } transition-colors`}
                            />
                          </td>
                        );

                        if (period && period.notes) {
                          return (
                            <Popover key={day.toISOString()}>
                              <PopoverTrigger asChild>
                                <td
                                  className={`border-b px-0 py-0 text-center cursor-pointer ${
                                    today ? 'ring-2 ring-inset ring-blue-500' : ''
                                  }`}
                                >
                                  <div
                                    className={`h-10 w-full ${colorClass} ${
                                      weekend ? 'opacity-70' : ''
                                    } transition-colors hover:brightness-110`}
                                  />
                                </td>
                              </PopoverTrigger>
                              <PopoverContent className="w-64 text-sm">
                                <div className="space-y-2">
                                  <div className="font-semibold">{vendor.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {format(day, 'd MMMM yyyy', { locale: fr })}
                                  </div>
                                  <Badge
                                    variant={
                                      status === 'available'
                                        ? 'default'
                                        : status === 'busy'
                                          ? 'secondary'
                                          : 'destructive'
                                    }
                                  >
                                    {status === 'available'
                                      ? 'Disponible'
                                      : status === 'busy'
                                        ? 'Occupe'
                                        : 'Indisponible'}
                                  </Badge>
                                  <div className="text-xs">
                                    <span className="font-medium">Periode : </span>
                                    {format(parseISO(period.startDate), 'd MMM', { locale: fr })}
                                    {' - '}
                                    {format(parseISO(period.endDate), 'd MMM yyyy', { locale: fr })}
                                  </div>
                                  {period.notes && (
                                    <div className="text-xs">
                                      <span className="font-medium">Notes : </span>
                                      {period.notes}
                                    </div>
                                  )}
                                </div>
                              </PopoverContent>
                            </Popover>
                          );
                        }

                        return cellContent;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
