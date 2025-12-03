import { VendorCard } from '../vendor/VendorCard';
import { mockVendors } from '@/lib/mock-data';

export default function VendorCardExample() {
  return (
    <div className="grid grid-cols-3 gap-4">
      {mockVendors.map((vendor) => (
        <VendorCard
          key={vendor.id}
          vendor={vendor}
          onClick={() => console.log('Vendor clicked:', vendor.id)}
        />
      ))}
    </div>
  );
}
