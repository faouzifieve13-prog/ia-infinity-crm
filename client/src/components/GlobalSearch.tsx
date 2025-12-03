import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { mockDeals, mockProjects, mockAccounts } from '@/lib/mock-data';

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  // todo: remove mock functionality
  const filteredDeals = mockDeals.filter(d => 
    d.accountName.toLowerCase().includes(query.toLowerCase()) ||
    d.contactName.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 3);

  const filteredProjects = mockProjects.filter(p =>
    p.name.toLowerCase().includes(query.toLowerCase()) ||
    p.accountName.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 3);

  const filteredAccounts = mockAccounts.filter(a =>
    a.name.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 3);

  return (
    <>
      <Button
        variant="outline"
        className="w-64 justify-start text-muted-foreground"
        onClick={() => setOpen(true)}
        data-testid="button-global-search"
      >
        <Search className="mr-2 h-4 w-4" />
        Search...
        <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">Ctrl</span>K
        </kbd>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl p-0">
          <DialogHeader className="border-b p-4">
            <DialogTitle className="sr-only">Search</DialogTitle>
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search deals, projects, accounts..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="border-0 focus-visible:ring-0 text-base"
                autoFocus
                data-testid="input-search"
              />
              {query && (
                <Button variant="ghost" size="icon" onClick={() => setQuery('')}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="max-h-96 overflow-y-auto p-2">
            {query.length > 0 ? (
              <>
                {filteredDeals.length > 0 && (
                  <div className="mb-4">
                    <p className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase">Deals</p>
                    {filteredDeals.map((deal) => (
                      <div
                        key={deal.id}
                        className="flex items-center justify-between rounded-md px-2 py-2 hover-elevate cursor-pointer"
                        onClick={() => { console.log('Navigate to deal', deal.id); setOpen(false); }}
                        data-testid={`search-result-deal-${deal.id}`}
                      >
                        <div>
                          <p className="font-medium">{deal.accountName}</p>
                          <p className="text-sm text-muted-foreground">{deal.contactName}</p>
                        </div>
                        <span className="text-sm font-semibold">{deal.amount.toLocaleString()}€</span>
                      </div>
                    ))}
                  </div>
                )}

                {filteredProjects.length > 0 && (
                  <div className="mb-4">
                    <p className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase">Projects</p>
                    {filteredProjects.map((project) => (
                      <div
                        key={project.id}
                        className="flex items-center justify-between rounded-md px-2 py-2 hover-elevate cursor-pointer"
                        onClick={() => { console.log('Navigate to project', project.id); setOpen(false); }}
                        data-testid={`search-result-project-${project.id}`}
                      >
                        <div>
                          <p className="font-medium">{project.name}</p>
                          <p className="text-sm text-muted-foreground">{project.accountName}</p>
                        </div>
                        <span className="text-sm">{project.progress}%</span>
                      </div>
                    ))}
                  </div>
                )}

                {filteredAccounts.length > 0 && (
                  <div>
                    <p className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase">Accounts</p>
                    {filteredAccounts.map((account) => (
                      <div
                        key={account.id}
                        className="flex items-center justify-between rounded-md px-2 py-2 hover-elevate cursor-pointer"
                        onClick={() => { console.log('Navigate to account', account.id); setOpen(false); }}
                        data-testid={`search-result-account-${account.id}`}
                      >
                        <div>
                          <p className="font-medium">{account.name}</p>
                          <p className="text-sm text-muted-foreground">{account.domain}</p>
                        </div>
                        <span className="text-sm">{account.plan}</span>
                      </div>
                    ))}
                  </div>
                )}

                {filteredDeals.length === 0 && filteredProjects.length === 0 && filteredAccounts.length === 0 && (
                  <p className="py-8 text-center text-muted-foreground">No results found</p>
                )}
              </>
            ) : (
              <p className="py-8 text-center text-muted-foreground">Start typing to search...</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
