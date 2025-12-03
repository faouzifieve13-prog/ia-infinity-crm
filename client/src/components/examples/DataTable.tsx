import { DataTable } from '../DataTable';
import { mockAccounts } from '@/lib/mock-data';

export default function DataTableExample() {
  return <DataTable accounts={mockAccounts} />;
}
