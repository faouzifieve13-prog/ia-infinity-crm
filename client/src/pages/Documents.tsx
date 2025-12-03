import { useState } from 'react';
import { Plus, Search, FileText, File, Download, Eye, MoreHorizontal, Upload, FolderOpen } from 'lucide-react';
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

// todo: remove mock functionality
const mockDocuments = [
  { id: '1', name: 'Proposal - TechCorp Solutions', type: 'proposal', status: 'sent', accountName: 'TechCorp Solutions', createdAt: '2024-01-10', size: '2.4 MB' },
  { id: '2', name: 'Audit Report - DataFlow', type: 'audit', status: 'draft', accountName: 'DataFlow Inc', createdAt: '2024-01-08', size: '1.8 MB' },
  { id: '3', name: 'Contract - DigiSoft', type: 'contract', status: 'signed', accountName: 'DigiSoft', createdAt: '2024-01-05', size: '890 KB' },
  { id: '4', name: 'NDA - CloudNine', type: 'nda', status: 'pending', accountName: 'CloudNine Systems', createdAt: '2024-01-02', size: '245 KB' },
];

const typeConfig = {
  proposal: { label: 'Proposal', color: 'bg-pipeline-proposal' },
  audit: { label: 'Audit', color: 'bg-pipeline-audit' },
  contract: { label: 'Contract', color: 'bg-pipeline-won' },
  nda: { label: 'NDA', color: 'bg-pipeline-meeting' },
};

const statusConfig = {
  draft: { label: 'Draft', variant: 'outline' as const },
  sent: { label: 'Sent', variant: 'secondary' as const },
  pending: { label: 'Pending', variant: 'secondary' as const },
  signed: { label: 'Signed', variant: 'default' as const },
};

export default function Documents() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'proposal' | 'audit' | 'contract' | 'nda'>('all');

  const filteredDocuments = mockDocuments.filter((doc) => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.accountName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || doc.type === typeFilter;
    return matchesSearch && matchesType;
  });

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
            <SelectItem value="nda">NDAs</SelectItem>
          </SelectContent>
        </Select>
      </div>

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
              const status = statusConfig[doc.status as keyof typeof statusConfig];

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
                      <Badge variant={status.variant} className="text-xs">{status.label}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{doc.accountName}</span>
                      <span>{new Date(doc.createdAt).toLocaleDateString('fr-FR')}</span>
                      <span>{doc.size}</span>
                    </div>
                  </div>

                  <Button variant="ghost" size="icon" onClick={() => console.log('Preview', doc.id)}>
                    <Eye className="h-4 w-4" />
                  </Button>

                  <Button variant="ghost" size="icon" onClick={() => console.log('Download', doc.id)}>
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

      {filteredDocuments.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <File className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">No documents found</p>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Document
          </Button>
        </div>
      )}
    </div>
  );
}
