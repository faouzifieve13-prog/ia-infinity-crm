import { useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Building2, User, Mail, Phone, Save, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { DealStage, ProspectStatus } from '@/lib/types';

const contactFormSchema = z.object({
  companyName: z.string().min(1, 'Le nom de l\'entreprise est requis'),
  contactName: z.string().optional(),
  contactEmail: z.string().email('Email invalide').optional().or(z.literal('')),
  contactPhone: z.string().optional(),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

interface ProspectContactSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospect: {
    id: string;
    accountName: string;
    contactName: string;
    contactEmail?: string | null;
    contactPhone?: string | null;
    amount: string;
    auditAmount?: string | null;
    developmentAmount?: string | null;
    recurringAmount?: string | null;
    probability: number;
    stage: DealStage;
    score?: string | null;
    prospectStatus?: ProspectStatus | null;
    daysInStage: number;
  } | null;
}

const stageLabels: Record<DealStage, string> = {
  prospect: 'Prospect',
  meeting: 'Rendez-vous',
  proposal: 'Proposition',
  audit: 'Audit',
  negotiation: 'Négociation',
  won: 'Gagné',
  lost: 'Perdu',
};

const scoreConfig: Record<string, { label: string; className: string }> = {
  A: { label: 'Score A', className: 'bg-emerald-500 text-white' },
  B: { label: 'Score B', className: 'bg-amber-500 text-white' },
  C: { label: 'Score C', className: 'bg-slate-400 text-white' },
};

export function ProspectContactSheet({ open, onOpenChange, prospect }: ProspectContactSheetProps) {
  const { toast } = useToast();

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      companyName: '',
      contactName: '',
      contactEmail: '',
      contactPhone: '',
    },
  });

  // Reset form when prospect changes
  useEffect(() => {
    if (prospect && open) {
      form.reset({
        companyName: prospect.accountName || '',
        contactName: prospect.contactName || '',
        contactEmail: prospect.contactEmail || '',
        contactPhone: prospect.contactPhone || '',
      });
    }
  }, [prospect, open, form]);

  const updateProspectMutation = useMutation({
    mutationFn: async (data: ContactFormValues) => {
      if (!prospect) throw new Error('Pas de prospect sélectionné');

      // Récupérer le deal complet pour préserver les notes de compte rendu
      const dealResponse = await apiRequest('GET', `/api/deals/${prospect.id}`);
      const existingDeal = await dealResponse.json();

      // Parser les notes existantes pour préserver meetingNotes
      let existingMeetingNotes = '';
      if (existingDeal.notes) {
        try {
          const parsed = JSON.parse(existingDeal.notes);
          existingMeetingNotes = parsed.meetingNotes || '';
        } catch (e) {
          // Si ce n'est pas du JSON, c'est peut-être d'anciennes notes
          existingMeetingNotes = existingDeal.notes;
        }
      }

      const response = await apiRequest('PATCH', `/api/deals/${prospect.id}`, {
        contactEmail: data.contactEmail || null,
        contactPhone: data.contactPhone || null,
        notes: JSON.stringify({
          companyName: data.companyName,
          contactName: data.contactName || '',
          meetingNotes: existingMeetingNotes,
        }),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/deals'] });
      toast({
        title: 'Contact mis à jour',
        description: 'Les informations du prospect ont été sauvegardées.',
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de mettre à jour le prospect.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: ContactFormValues) => {
    updateProspectMutation.mutate(data);
  };

  if (!prospect) return null;

  const amountNum = typeof prospect.amount === 'string' ? parseFloat(prospect.amount) : prospect.amount;
  const auditAmountNum = prospect.auditAmount ? parseFloat(prospect.auditAmount) : 0;
  const developmentAmountNum = prospect.developmentAmount ? parseFloat(prospect.developmentAmount) : 0;
  const recurringAmountNum = prospect.recurringAmount ? parseFloat(prospect.recurringAmount) : 0;
  const hasDetailedAmounts = auditAmountNum > 0 || developmentAmountNum > 0 || recurringAmountNum > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[420px]">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <SheetTitle className="flex-1">Fiche Contact</SheetTitle>
            {prospect.score && scoreConfig[prospect.score] && (
              <Badge className={scoreConfig[prospect.score].className}>
                {scoreConfig[prospect.score].label}
              </Badge>
            )}
          </div>
          <SheetDescription>
            Modifiez les informations et cliquez sur Enregistrer
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Info badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{stageLabels[prospect.stage]}</Badge>
            {hasDetailedAmounts ? (
              <>
                {auditAmountNum > 0 && (
                  <Badge variant="secondary" className="bg-violet-500/15 text-violet-600 dark:text-violet-400">
                    Audit: {auditAmountNum.toLocaleString('fr-FR')}€
                  </Badge>
                )}
                {developmentAmountNum > 0 && (
                  <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    Dev: {developmentAmountNum.toLocaleString('fr-FR')}€
                  </Badge>
                )}
                {recurringAmountNum > 0 && (
                  <Badge variant="secondary" className="bg-blue-500/15 text-blue-600 dark:text-blue-400">
                    Recurring: {recurringAmountNum.toLocaleString('fr-FR')}€
                  </Badge>
                )}
              </>
            ) : (
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                {amountNum.toLocaleString('fr-FR')}€
              </Badge>
            )}
            <Badge variant="outline" className="text-muted-foreground">
              {prospect.daysInStage}j dans cette étape
            </Badge>
          </div>

          <Separator />

          {/* Contact Form - Always editable */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      Entreprise
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Nom de l'entreprise"
                        {...field}
                        data-testid="input-contact-company"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      Nom du contact
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Prénom Nom"
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
                name="contactEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      Email
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="email@exemple.com"
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
                name="contactPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      Téléphone
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="+33 6 12 34 56 78"
                        {...field}
                        data-testid="input-contact-phone"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    window.location.href = `/deals/${prospect.id}`;
                  }}
                  data-testid="button-view-details"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Voir détails
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={updateProspectMutation.isPending}
                  data-testid="button-save-contact"
                >
                  {updateProspectMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Enregistrer
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
