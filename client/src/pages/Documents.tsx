import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, FileText, File, Download, Eye, MoreHorizontal, Upload, FolderOpen, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Document, Account } from '@/lib/types';

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return 'Unknown';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Documents() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'proposal' | 'audit' | 'contract' | 'other'>('all');

  const { data: documents = [], isLoading } = useQuery<Document[]>({
    queryKey: ['/api/documents'],
  });

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ['/api/accounts'],
  });

  const getAccountName = (accountId: string | null | undefined) => {
    if (!accountId) return 'No Account';
    return accounts.find((a) => a.id === accountId)?.name || 'Unknown';
  };

  const getDocType = (mimeType: string | null | undefined, name: string): string => {
    if (!mimeType) return 'other';
    if (name.toLowerCase().includes('proposal')) return 'proposal';
    if (name.toLowerCase().includes('audit')) return 'audit';
    if (name.toLowerCase().includes('contract')) return 'contract';
    return 'other';
  };

  const documentsWithType = documents.map(doc => ({
    ...doc,
    type: getDocType(doc.mimeType, doc.name),
    accountName: getAccountName(doc.accountId),
  }));

  const filteredDocuments = documentsWithType.filter((doc) => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.accountName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || doc.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const typeConfig = {
    proposal: { label: 'Proposal', color: 'bg-pipeline-proposal' },
    audit: { label: 'Audit', color: 'bg-pipeline-audit' },
    contract: { label: 'Contract', color: 'bg-pipeline-won' },
    other: { label: 'Other', color: 'bg-muted' },
  };

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
          <h1 className="text-3xl font-semibold" data-testid="text-page-title">Documents</h1>
          <p className="text-muted-foreground">Manage proposals, contracts, and audit reports</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" data-testid="button-upload">
            <Upload className="mr-2 h-4 w-4" />
            Upload
          </Button>
          <Button data-testid="button-create-document">
            <Plus className="mr-2 h-4 w-4" />
            Create Document
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
            data-testid="input-search-documents"
          />
        </div>

        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
          <SelectTrigger className="w-40" data-testid="select-type-filter">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="proposal">Proposals</SelectItem>
            <SelectItem value="audit">Audit Reports</SelectItem>
            <SelectItem value="contract">Contracts</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredDocuments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <File className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">No documents found</p>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Document
          </Button>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              All Documents
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {filteredDocuments.map((doc) => {
                const type = typeConfig[doc.type as keyof typeof typeConfig];

                return (
                  <div
                    key={doc.id}
                    className="flex items-center gap-4 p-4 hover-elevate"
                    data-testid={`document-item-${doc.id}`}
                  >
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${type.color} bg-opacity-10`}>
                      <FileText className={`h-5 w-5 ${type.color.replace('bg-', 'text-')}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium text-sm truncate">{doc.name}</span>
                        <Badge variant="outline" className="text-xs">{type.label}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{doc.accountName}</span>
                        <span>{doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('fr-FR') : 'N/A'}</span>
                        <span>{formatFileSize(doc.size)}</span>
                      </div>
                    </div>

                    <Button variant="ghost" size="icon" onClick={() => console.log('Preview', doc.id)}>
                      <Eye className="h-4 w-4" />
                    </Button>

                    <Button variant="ghost" size="icon" onClick={() => window.open(doc.url, '_blank')}>
                      <Download className="h-4 w-4" />
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuItem>Share</DropdownMenuItem>
                        <DropdownMenuItem>Duplicate</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
