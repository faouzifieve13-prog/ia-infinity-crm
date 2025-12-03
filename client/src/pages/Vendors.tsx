import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { VendorCard } from '@/components/vendor/VendorCard';
import type { Vendor, VendorAvailability } from '@/lib/types';

export default function Vendors() {
  const [searchQuery, setSearchQuery] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | VendorAvailability>('all');

  const { data: vendors = [], isLoading } = useQuery<Vendor[]>({
    queryKey: ['/api/vendors'],
  });

  const filteredVendors = vendors.filter((vendor) => {
    const matchesSearch =
      vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vendor.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vendor.skills.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesAvailability = availabilityFilter === 'all' || vendor.availability === availabilityFilter;
    return matchesSearch && matchesAvailability;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold" data-testid="text-page-title">Vendors</h1>
          <p className="text-muted-foreground">Manage contractors and freelancers</p>
        </div>

        <Button data-testid="button-add-vendor">
          <Plus className="mr-2 h-4 w-4" />
          Add Vendor
        </Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search vendors or skills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
            data-testid="input-search-vendors"
          />
        </div>

        <Select value={availabilityFilter} onValueChange={(v) => setAvailabilityFilter(v as typeof availabilityFilter)}>
          <SelectTrigger className="w-40" data-testid="select-availability-filter">
            <SelectValue placeholder="Availability" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="busy">Busy</SelectItem>
            <SelectItem value="unavailable">Unavailable</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredVendors.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground mb-4">No vendors found</p>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Vendor
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVendors.map((vendor) => (
            <VendorCard
              key={vendor.id}
              vendor={vendor}
              onClick={() => console.log('View vendor', vendor.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
