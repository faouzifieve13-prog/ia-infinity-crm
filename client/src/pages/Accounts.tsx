import { useQuery } from '@tanstack/react-query';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/DataTable';
import type { Account } from '@/lib/types';

export default function Accounts() {
  const { data: accounts = [], isLoading } = useQuery<Account[]>({
    queryKey: ['/api/accounts'],
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
          <h1 className="text-3xl font-semibold" data-testid="text-page-title">Accounts</h1>
          <p className="text-muted-foreground">Manage client accounts and organizations</p>
        </div>

        <Button data-testid="button-add-account">
          <Plus className="mr-2 h-4 w-4" />
          Add Account
        </Button>
      </div>

      {accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground mb-4">No accounts found</p>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Account
          </Button>
        </div>
      ) : (
        <DataTable accounts={accounts} />
      )}
    </div>
  );
}
