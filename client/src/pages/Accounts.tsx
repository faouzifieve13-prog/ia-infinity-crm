import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/DataTable';
import { mockAccounts } from '@/lib/mock-data';

export default function Accounts() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold" data-testid="text-page-title">Accounts</h1>
          <p className="text-muted-foreground">Manage client accounts and organizations</p>
        </div>

        <Button data-testid="button-add-account">
          <Plus className="mr-2 h-4 w-4" />
          Add Account
        </Button>
      </div>

      <DataTable accounts={mockAccounts} />
    </div>
  );
}
