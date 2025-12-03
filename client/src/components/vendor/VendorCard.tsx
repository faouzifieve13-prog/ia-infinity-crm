import { Star, Mail, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import type { Vendor } from '@/lib/types';

interface VendorCardProps {
  vendor: Vendor;
  onClick?: () => void;
}

const availabilityConfig = {
  available: { label: 'Available', color: 'bg-status-online' },
  busy: { label: 'Busy', color: 'bg-status-busy' },
  unavailable: { label: 'Unavailable', color: 'bg-status-offline' },
};

export function VendorCard({ vendor, onClick }: VendorCardProps) {
  const availability = availabilityConfig[vendor.availability];
  const initials = vendor.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <Card
      className="cursor-pointer hover-elevate"
      onClick={onClick}
      data-testid={`vendor-card-${vendor.id}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="relative">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card ${availability.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base">{vendor.name}</CardTitle>
            <p className="text-sm text-muted-foreground">{vendor.company}</p>
          </div>
          <span className="text-sm font-semibold">{vendor.dailyRate}€/j</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1">
            {vendor.skills.map((skill) => (
              <Badge key={skill} variant="secondary" className="text-xs">
                {skill}
              </Badge>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              <span className="text-sm font-medium">{vendor.performance}%</span>
            </div>
            <Progress value={vendor.performance} className="h-1.5 flex-1" />
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Mail className="h-3 w-3" />
            <span className="truncate">{vendor.email}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
