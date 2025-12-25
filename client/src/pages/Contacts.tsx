import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Plus, 
  Search, 
  Mail, 
  Phone, 
  MoreHorizontal, 
  Loader2,
  Building2,
  Wrench,
  Handshake,
  UserPlus,
  Filter,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import type { Contact, Account, Vendor, ContactType } from '@/lib/types';

const contactTypeLabels: Partial<Record<ContactType, { label: string; icon: typeof Building2; color: string }>> = {
  vendor: { label: 'Sous-traitant', icon: Wrench, color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' },
  partner: { label: 'Partenaire', icon: Handshake, color: 'bg-amber-500/10 text-amber-500 border-amber-500/30' },
  prospect: { label: 'Prospect', icon: UserPlus, color: 'bg-purple-500/10 text-purple-500 border-purple-500/30' },
};

const contactFormSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  email: z.string().email('Email invalide'),
  contactType: z.enum(['vendor', 'partner', 'prospect']).default('vendor'),
  phone: z.string().optional(),
  calendarUrl: z.string().optional(),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

export default function Contacts() {
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<ContactType | 'all'>('all');
  const { toast } = useToast();

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: '',
      email: '',
      contactType: 'vendor',
      phone: '',
      calendarUrl: '',
    },
  });

  const selectedContactType = form.watch('contactType');

  const { data: contacts = [], isLoading } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
  });

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ['/api/accounts'],
  });

  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ['/api/vendors'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: ContactFormValues) => {
      const payload = {
        ...data,
        phone: data.phone || null,
        calendarUrl: data.calendarUrl || null,
      };
      return apiRequest('POST', '/api/contacts', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      setDialogOpen(false);
      form.reset();
      toast({
        title: 'Contact créé',
        description: 'Le contact a été ajouté avec succès.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de créer le contact.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: ContactFormValues) => {
    createMutation.mutate(data);
  };

  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch = 
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || contact.contactType === typeFilter;
    return matchesSearch && matchesType;
  });

  const getAccountName = (accountId: string) => {
    return accounts.find((a) => a.id === accountId)?.name || 'Non assigné';
  };

  const getVendorName = (vendorId: string | null | undefined) => {
    if (!vendorId) return null;
    return vendors.find((v) => v.id === vendorId)?.name || null;
  };

  const countByType = (type: ContactType) => {
    return contacts.filter(c => c.contactType === type).length;
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
          <h1 className="text-3xl font-semibold" data-testid="text-page-title">Contacts</h1>
          <p className="text-muted-foreground">Répertoire unifié de tous vos contacts professionnels</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-contact">
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un contact
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Nouveau contact</DialogTitle>
              <DialogDescription>
                Ajoutez un nouveau contact professionnel.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="contactType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type de contact *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-contact-type">
                            <SelectValue placeholder="Sélectionner le type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(contactTypeLabels).map(([value, { label, icon: Icon }]) => (
                            <SelectItem key={value} value={value}>
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4" />
                                {label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom complet *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Ex: Jean Dupont" 
                          {...field} 
                          data-testid="input-contact-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input 
                          type="email"
                          placeholder="Ex: jean.dupont@entreprise.com" 
                          {...field} 
                          data-testid="input-contact-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Téléphone</FormLabel>
                      <FormControl>
                        <Input 
                          type="tel"
                          placeholder="Ex: +33 6 12 34 56 78" 
                          {...field} 
                          data-testid="input-contact-phone"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="calendarUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lien Calendrier</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Ex: https://calendly.com/..." 
                          {...field} 
                          data-testid="input-contact-calendar"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-3 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setDialogOpen(false)}
                    data-testid="button-cancel"
                  >
                    Annuler
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending}
                    data-testid="button-submit-contact"
                  >
                    {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Ajouter le contact
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(contactTypeLabels).map(([type, { label, icon: Icon, color }]) => (
          <Card 
            key={type}
            className={`cursor-pointer transition-all ${typeFilter === type ? 'ring-2 ring-primary' : 'hover-elevate'}`}
            onClick={() => setTypeFilter(typeFilter === type ? 'all' : type as ContactType)}
            data-testid={`filter-${type}`}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${color.split(' ')[0]}`}>
                    <Icon className={`h-5 w-5 ${color.split(' ')[1]}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-2xl font-bold">{countByType(type as ContactType)}</p>
                  </div>
                </div>
                {typeFilter === type && (
                  <X className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher des contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
            data-testid="input-search-contacts"
          />
        </div>
        {typeFilter !== 'all' && (
          <Button 
            variant="outline" 
            onClick={() => setTypeFilter('all')}
            className="shrink-0"
          >
            <X className="h-4 w-4 mr-2" />
            Effacer le filtre
          </Button>
        )}
      </div>

      {filteredContacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground mb-4">
            {typeFilter !== 'all' 
              ? `Aucun contact de type "${contactTypeLabels[typeFilter]?.label || typeFilter}" trouvé`
              : 'Aucun contact trouvé'
            }
          </p>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Ajouter un contact
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContacts.map((contact) => {
            const initials = contact.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase();

            const typeInfo = contactTypeLabels[contact.contactType || 'vendor'];
            const TypeIcon = typeInfo?.icon || Wrench;

            return (
              <Card key={contact.id} className="hover-elevate" data-testid={`contact-card-${contact.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base">{contact.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{contact.role}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Modifier</DropdownMenuItem>
                        <DropdownMenuItem>Voir les détails</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className={`text-xs ${typeInfo?.color || ''}`}>
                        <TypeIcon className="h-3 w-3 mr-1" />
                        {typeInfo?.label || contact.contactType}
                      </Badge>
                      {contact.contactType === 'client' && contact.accountId && (
                        <Badge variant="outline" className="text-xs">
                          {getAccountName(contact.accountId)}
                        </Badge>
                      )}
                      {contact.contactType === 'vendor' && contact.vendorId && (
                        <Badge variant="outline" className="text-xs">
                          {getVendorName(contact.vendorId)}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span className="truncate">{contact.email}</span>
                    </div>

                    {contact.phone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span>{contact.phone}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
