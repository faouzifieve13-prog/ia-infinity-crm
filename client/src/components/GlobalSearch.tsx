import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Target, FolderKanban, Building2, Command, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Deal, Project, Account } from '@/lib/types';

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const { data: deals = [] } = useQuery<Deal[]>({
    queryKey: ['/api/deals'],
    enabled: open,
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
    enabled: open,
  });

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ['/api/accounts'],
    enabled: open,
  });

  const getAccountName = (accountId: string) => {
    return accounts.find((a) => a.id === accountId)?.name || 'Unknown';
  };

  const filteredDeals = deals.filter(d => {
    const accountName = getAccountName(d.accountId);
    const searchStr = d.nextAction || '';
    return accountName.toLowerCase().includes(query.toLowerCase()) ||
      searchStr.toLowerCase().includes(query.toLowerCase());
  }).slice(0, 3);

  const filteredProjects = projects.filter(p => {
    const accountName = getAccountName(p.accountId);
    return p.name.toLowerCase().includes(query.toLowerCase()) ||
      accountName.toLowerCase().includes(query.toLowerCase());
  }).slice(0, 3);

  const filteredAccounts = accounts.filter(a =>
    a.name.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 3);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <Button
        variant="outline"
        className="w-64 justify-start text-muted-foreground group border-border/50 hover:border-primary/50 hover:bg-muted/50 transition-all"
        onClick={() => setOpen(true)}
        data-testid="button-global-search"
      >
        <Search className="mr-2 h-4 w-4 group-hover:text-primary transition-colors" />
        <span className="group-hover:text-foreground transition-colors">Rechercher...</span>
        <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted/50 px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <Command className="h-3 w-3" />K
        </kbd>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
          <DialogHeader className="border-b p-4 bg-muted/30">
            <DialogTitle className="sr-only">Recherche</DialogTitle>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Search className="h-5 w-5 text-primary" />
              </div>
              <Input
                placeholder="Rechercher deals, projets, comptes..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="border-0 focus-visible:ring-0 text-base bg-transparent"
                autoFocus
                data-testid="input-search"
              />
              <AnimatePresence>
                {query && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                  >
                    <Button variant="ghost" size="icon" onClick={() => setQuery('')} className="shrink-0">
                      <X className="h-4 w-4" />
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </DialogHeader>

          <div className="max-h-96 overflow-y-auto p-2">
            <AnimatePresence mode="wait">
              {query.length > 0 ? (
                <motion.div
                  key="results"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {filteredDeals.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 px-2 py-1.5">
                        <Target className="h-4 w-4 text-primary" />
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Deals</p>
                        <Badge variant="secondary" className="text-xs ml-auto">{filteredDeals.length}</Badge>
                      </div>
                      {filteredDeals.map((deal, index) => (
                        <motion.div
                          key={deal.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-muted/50 cursor-pointer group/item transition-colors"
                          onClick={() => { console.log('Navigate to deal', deal.id); setOpen(false); }}
                          data-testid={`search-result-deal-${deal.id}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-1.5 rounded-md bg-amber-500/10">
                              <Target className="h-4 w-4 text-amber-500" />
                            </div>
                            <div>
                              <p className="font-medium group-hover/item:text-primary transition-colors">{getAccountName(deal.accountId)}</p>
                              <p className="text-sm text-muted-foreground">{deal.stage} - {deal.nextAction || 'Aucune action'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="font-bold bg-primary/10 text-primary border-0">
                              {parseFloat(deal.amount).toLocaleString('fr-FR')}€
                            </Badge>
                            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover/item:opacity-100 transition-opacity" />
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {filteredProjects.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 px-2 py-1.5">
                        <FolderKanban className="h-4 w-4 text-emerald-500" />
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Projets</p>
                        <Badge variant="secondary" className="text-xs ml-auto">{filteredProjects.length}</Badge>
                      </div>
                      {filteredProjects.map((project, index) => (
                        <motion.div
                          key={project.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-muted/50 cursor-pointer group/item transition-colors"
                          onClick={() => { console.log('Navigate to project', project.id); setOpen(false); }}
                          data-testid={`search-result-project-${project.id}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-1.5 rounded-md bg-emerald-500/10">
                              <FolderKanban className="h-4 w-4 text-emerald-500" />
                            </div>
                            <div>
                              <p className="font-medium group-hover/item:text-primary transition-colors">{project.name}</p>
                              <p className="text-sm text-muted-foreground">{getAccountName(project.accountId)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">{project.progress}%</Badge>
                            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover/item:opacity-100 transition-opacity" />
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {filteredAccounts.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 px-2 py-1.5">
                        <Building2 className="h-4 w-4 text-blue-500" />
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Comptes</p>
                        <Badge variant="secondary" className="text-xs ml-auto">{filteredAccounts.length}</Badge>
                      </div>
                      {filteredAccounts.map((account, index) => (
                        <motion.div
                          key={account.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-muted/50 cursor-pointer group/item transition-colors"
                          onClick={() => { console.log('Navigate to account', account.id); setOpen(false); }}
                          data-testid={`search-result-account-${account.id}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-1.5 rounded-md bg-blue-500/10">
                              <Building2 className="h-4 w-4 text-blue-500" />
                            </div>
                            <div>
                              <p className="font-medium group-hover/item:text-primary transition-colors">{account.name}</p>
                              <p className="text-sm text-muted-foreground">{account.domain}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">{account.plan}</Badge>
                            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover/item:opacity-100 transition-opacity" />
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {filteredDeals.length === 0 && filteredProjects.length === 0 && filteredAccounts.length === 0 && (
                    <div className="py-12 text-center">
                      <Search className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                      <p className="text-muted-foreground">Aucun résultat trouvé</p>
                      <p className="text-sm text-muted-foreground/70">Essayez avec d'autres termes</p>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-12 text-center"
                >
                  <div className="p-4 rounded-full bg-muted/50 w-fit mx-auto mb-4">
                    <Search className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <p className="text-muted-foreground">Commencez à taper pour rechercher...</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">Deals, projets, comptes</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
