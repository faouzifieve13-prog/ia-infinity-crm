import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRoute, Link, useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  ArrowLeft, 
  Building2, 
  User, 
  Users,
  DollarSign,
  TrendingUp,
  Clock,
  Calendar,
  FileText,
  Video,
  Save,
  Loader2,
  Phone,
  Mail,
  ExternalLink,
  CheckCircle2,
  UserCheck,
  Download,
  FileSignature,
  Send,
  HardDrive,
  Eye,
  Trash2,
  ChevronDown,
  FileEdit,
  PhoneCall,
  XCircle,
  AlertTriangle,
  MessageSquare,
  Sparkles,
  RefreshCw,
  History,
  Briefcase,
  ListChecks,
  Wand2,
  AlignLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import type { Deal, Account, Document, ProspectStatus, Project } from '@/lib/types';

interface Quote {
  id: string;
  orgId: string;
  dealId: string;
  qontoQuoteId: string | null;
  number: string;
  title: string;
  amount: string;
  quoteUrl: string | null;
  status: 'draft' | 'sent' | 'signed' | 'rejected' | 'expired';
  driveFileId: string | null;
  driveFileUrl: string | null;
  sentAt: string | null;
  signedAt: string | null;
  createdAt: string;
}

const stageConfig = {
  prospect: { label: 'Prospect', color: 'bg-slate-500' },
  meeting: { label: 'RDV', color: 'bg-blue-500' },
  proposal: { label: 'Proposition', color: 'bg-purple-500' },
  audit: { label: 'Audit', color: 'bg-violet-500' },
  negotiation: { label: 'Négociation', color: 'bg-orange-500' },
  pending_validation: { label: 'En attente de validation', color: 'bg-amber-500' },
  won: { label: 'Gagné', color: 'bg-emerald-500' },
  lost: { label: 'Perdu', color: 'bg-red-500' },
};

const prospectStatusConfig: Record<ProspectStatus, { label: string; color: string; bgColor: string; icon: typeof TrendingUp }> = {
  active: { label: 'Actif', color: 'text-emerald-500', bgColor: 'bg-emerald-500/20', icon: TrendingUp },
  draft: { label: 'Brouillon', color: 'text-slate-400', bgColor: 'bg-slate-500/20', icon: FileEdit },
  follow_up: { label: 'À relancer', color: 'text-amber-500', bgColor: 'bg-amber-500/20', icon: PhoneCall },
  abandoned: { label: 'Abandonné', color: 'text-red-400', bgColor: 'bg-red-500/20', icon: XCircle },
};

const dealFormSchema = z.object({
  notes: z.string().optional(),
  loomVideoUrl: z.string().url('URL invalide').optional().or(z.literal('')),
  nextAction: z.string().optional(),
  probability: z.string().optional(),
  amount: z.string().optional(),
  auditAmount: z.string().optional(),
  developmentAmount: z.string().optional(),
  recurringAmount: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email('Email invalide').optional().or(z.literal('')),
});

type DealFormValues = z.infer<typeof dealFormSchema>;

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Non définie';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'Non définie';
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  webContentLink?: string;
  createdTime?: string;
  modifiedTime?: string;
}

export default function DealDetail() {
  const [, params] = useRoute('/deals/:id');
  const [, navigate] = useLocation();
  const dealId = params?.id;
  const { toast } = useToast();
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [selectedContractType, setSelectedContractType] = useState<'audit' | 'prestation'>('audit');
  const [driveQuotesDialogOpen, setDriveQuotesDialogOpen] = useState(false);
  const [qontoQuoteDialogOpen, setQontoQuoteDialogOpen] = useState(false);
  const [sendingQuoteId, setSendingQuoteId] = useState<string | null>(null);
  const [selectedQontoQuoteType, setSelectedQontoQuoteType] = useState<'audit' | 'prestation'>('audit');
  const [statusFollowUpDate, setStatusFollowUpDate] = useState<string>('');
  const [statusFollowUpNotes, setStatusFollowUpNotes] = useState<string>('');
  const [followUpEmail, setFollowUpEmail] = useState({ to: '', subject: '', body: '' });
  const [followUpWhatsapp, setFollowUpWhatsapp] = useState({ message: '', phone: '', url: '' });
  const [showFollowUpPanel, setShowFollowUpPanel] = useState(false);
  const [showFollowUpForm, setShowFollowUpForm] = useState(false);
  const [qontoFormData, setQontoFormData] = useState({
    title: '',
    description: '',
    quantity: 1,
    unitPrice: 0,
    vatRate: 20,
  });
  const [aiNotesLoading, setAiNotesLoading] = useState(false);

  const { data: deal, isLoading: dealLoading } = useQuery<Deal>({
    queryKey: ['/api/deals', dealId],
    enabled: !!dealId,
  });

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ['/api/accounts'],
  });

  // Helper pour extraire les infos prospect depuis les notes (compatibilité avec anciens prospects)
  const getProspectInfo = (deal: Deal | undefined): { companyName?: string; contactName?: string; contactEmail?: string; meetingNotes?: string } => {
    if (!deal?.notes) return {};
    try {
      return JSON.parse(deal.notes);
    } catch (e) {
      // Si ce n'est pas du JSON, c'est probablement d'anciennes notes textuelles
      return { meetingNotes: deal.notes };
    }
  };

  const prospectInfo = getProspectInfo(deal);

  // Extraire les notes de compte rendu depuis le JSON
  const getMeetingNotes = (deal: Deal | undefined): string => {
    const info = getProspectInfo(deal);
    return info.meetingNotes || '';
  };

  const { data: allDocuments = [] } = useQuery<Document[]>({
    queryKey: ['/api/documents'],
  });

  const { data: allProjects = [] } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  // Fetch quotes for this deal
  const { data: dealQuotes = [], refetch: refetchQuotes } = useQuery<Quote[]>({
    queryKey: ['/api/deals', dealId, 'quotes'],
    enabled: !!dealId,
  });

  // Fetch follow-up history for this deal
  interface FollowUpHistoryEntry {
    id: string;
    orgId: string;
    dealId: string;
    type: 'email' | 'whatsapp' | 'call' | 'meeting' | 'visio' | 'sms';
    subject?: string | null;
    content: string;
    recipientEmail?: string | null;
    recipientPhone?: string | null;
    sentAt: string;
    response?: string | null;
    responseAt?: string | null;
    notes?: string | null;
  }
  
  const { data: followUpHistory = [] } = useQuery<FollowUpHistoryEntry[]>({
    queryKey: ['/api/deals', dealId, 'follow-up', 'history'],
    enabled: !!dealId,
  });

  const form = useForm<DealFormValues>({
    resolver: zodResolver(dealFormSchema),
    defaultValues: {
      notes: '',
      loomVideoUrl: '',
      nextAction: '',
      probability: '10',
      amount: '0',
      auditAmount: '0',
      developmentAmount: '0',
      recurringAmount: '0',
      contactPhone: '',
      contactEmail: '',
    },
  });

  // Update form when deal loads - must be in useEffect to avoid setState during render
  useEffect(() => {
    if (deal && !form.formState.isDirty) {
      const meetingNotes = getMeetingNotes(deal);
      const currentValues = form.getValues();
      if (currentValues.notes !== meetingNotes ||
          currentValues.loomVideoUrl !== (deal.loomVideoUrl || '') ||
          currentValues.nextAction !== (deal.nextAction || '') ||
          currentValues.probability !== String(deal.probability) ||
          currentValues.amount !== (deal.amount || '0') ||
          currentValues.auditAmount !== (deal.auditAmount || '0') ||
          currentValues.developmentAmount !== (deal.developmentAmount || '0') ||
          currentValues.recurringAmount !== (deal.recurringAmount || '0') ||
          currentValues.contactPhone !== (deal.contactPhone || '') ||
          currentValues.contactEmail !== (deal.contactEmail || '')) {
        form.reset({
          notes: meetingNotes,
          loomVideoUrl: deal.loomVideoUrl || '',
          nextAction: deal.nextAction || '',
          probability: String(deal.probability),
          amount: deal.amount || '0',
          auditAmount: deal.auditAmount || '0',
          developmentAmount: deal.developmentAmount || '0',
          recurringAmount: deal.recurringAmount || '0',
          contactPhone: deal.contactPhone || '',
          contactEmail: deal.contactEmail || '',
        });
      }
    }
  }, [deal, form]);

  const updateDealMutation = useMutation({
    mutationFn: async (data: DealFormValues) => {
      // Préserver les infos du prospect et ajouter les notes de compte rendu
      const existingProspectInfo = getProspectInfo(deal);
      const updatedNotes = JSON.stringify({
        companyName: existingProspectInfo.companyName || '',
        contactName: existingProspectInfo.contactName || '',
        contactEmail: existingProspectInfo.contactEmail || '',
        meetingNotes: data.notes || '',
      });

      const payload: Record<string, unknown> = {
        notes: updatedNotes,
        loomVideoUrl: data.loomVideoUrl || null,
        nextAction: data.nextAction || null,
        contactPhone: data.contactPhone || null,
        contactEmail: data.contactEmail || null,
        // Always include numeric fields with safe defaults
        probability: data.probability ? parseInt(data.probability, 10) : deal?.probability ?? 10,
        amount: data.amount || deal?.amount || '0',
        auditAmount: String(data.auditAmount || '0'),
        developmentAmount: String(data.developmentAmount || '0'),
        recurringAmount: String(data.recurringAmount || '0'),
      };
      return apiRequest('PATCH', `/api/deals/${dealId}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/deals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/deals', dealId] });
      toast({
        title: 'Modifications enregistrées',
        description: 'Le prospect a été mis à jour avec succès.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de mettre à jour le prospect.',
        variant: 'destructive',
      });
    },
  });

  const convertToClientMutation = useMutation({
    mutationFn: async () => {
      // First update the deal stage to 'won'
      await apiRequest('PATCH', `/api/deals/${dealId}/stage`, { 
        stage: 'won',
        position: -1  // Use -1 to indicate "add to end of won column"
      });
      // The account is already linked to the deal, just need to ensure it's active
      if (deal?.accountId) {
        await apiRequest('PATCH', `/api/accounts/${deal.accountId}`, {
          status: 'active',
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/deals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/deals', dealId] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      setConvertDialogOpen(false);
      toast({
        title: 'Prospect converti en client',
        description: 'L\'opportunité a été marquée comme gagnée et le compte est maintenant actif.',
      });
      // Stay on deal page to show updated status
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de convertir le prospect.',
        variant: 'destructive',
      });
    },
  });

  const generateAndSendContractMutation = useMutation({
    mutationFn: async (contractType: 'audit' | 'prestation') => {
      const account = accounts.find(a => a.id === deal?.accountId);

      // Priorité: 1) contactEmail du deal, 2) contactEmail depuis notes, 3) contactEmail de l'account
      const clientEmail = deal?.contactEmail || prospectInfo.contactEmail || account?.contactEmail;
      const clientName = prospectInfo.contactName || account?.contactName || account?.name;
      const clientCompany = prospectInfo.companyName || account?.name;

      if (!clientEmail) {
        throw new Error('Aucun email client n\'est défini. Veuillez ajouter un email de contact dans l\'opportunité ou le compte client.');
      }

      const contractResponse = await apiRequest('POST', '/api/contracts/generate', {
        type: contractType,
        dealId: dealId,
        accountId: deal?.accountId,
        clientName: clientName || 'Client',
        clientEmail: clientEmail,
        clientCompany: clientCompany || '',
        amount: deal?.amount || '0',
      });

      const contract = await contractResponse.json();

      await apiRequest('POST', `/api/contracts/${contract.id}/send`);

      return contract;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
      setContractDialogOpen(false);
      toast({
        title: 'Contrat généré et envoyé',
        description: 'Le contrat a été créé et envoyé par email au client.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de générer ou envoyer le contrat.',
        variant: 'destructive',
      });
    },
  });

  // Drive integration
  const { data: driveStatus } = useQuery<{ connected: boolean; email?: string; error?: string }>({
    queryKey: ['/api/drive/status'],
  });

  // Qonto integration
  const { data: qontoStatus } = useQuery<{ connected: boolean; organization?: string; error?: string }>({
    queryKey: ['/api/qonto/status'],
  });

  const { data: driveQuotes = [], refetch: refetchDriveQuotes } = useQuery<DriveFile[]>({
    queryKey: ['/api/drive/quotes'],
    enabled: driveQuotesDialogOpen,
  });

  const saveQuoteToDriveMutation = useMutation({
    mutationFn: async () => {
      const account = accounts.find(a => a.id === deal?.accountId);
      
      const response = await apiRequest('POST', '/api/drive/quotes', {
        dealName: deal?.name || 'Nouveau devis',
        accountName: account?.name || 'Client',
        contactEmail: account?.contactEmail || '',
        amount: deal?.amount || '0',
        probability: deal?.probability || 0,
        missionTypes: ['prestation'],
        nextAction: deal?.nextAction || null
      });
      
      return response.json();
    },
    onSuccess: (driveFile: DriveFile) => {
      toast({
        title: 'Devis enregistré sur Drive',
        description: `Le fichier "${driveFile.name}" a été créé dans Google Drive.`,
      });
      refetchDriveQuotes();
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible d\'enregistrer le devis sur Drive.',
        variant: 'destructive',
      });
    },
  });

  const deleteQuoteFromDriveMutation = useMutation({
    mutationFn: async (fileId: string) => {
      await apiRequest('DELETE', `/api/drive/quotes/${fileId}`);
    },
    onSuccess: () => {
      toast({
        title: 'Devis supprimé',
        description: 'Le fichier a été supprimé de Google Drive.',
      });
      refetchDriveQuotes();
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de supprimer le devis.',
        variant: 'destructive',
      });
    },
  });

  // Qonto quote mutation
  const createQontoQuoteMutation = useMutation({
    mutationFn: async (formData: { title: string; description: string; quantity: number; unitPrice: number; vatRate: number }) => {
      const account = accounts.find(a => a.id === deal?.accountId);
      const today = new Date();
      const expiryDate = new Date(today);
      expiryDate.setMonth(expiryDate.getMonth() + 1);
      
      const quoteItems = [
        {
          title: formData.title,
          description: formData.description,
          quantity: formData.quantity,
          unit: "forfait",
          unitPrice: formData.unitPrice,
          vatRate: formData.vatRate
        }
      ];
      
      // Priorité: 1) contactEmail du deal, 2) contactEmail depuis notes, 3) contactEmail de l'account
      const clientEmail = deal?.contactEmail || prospectInfo.contactEmail || account?.contactEmail;
      const clientName = prospectInfo.companyName || account?.name;

      if (!clientEmail) {
        throw new Error('Aucun email client n\'est défini. Veuillez ajouter un email de contact dans l\'opportunité ou le compte client.');
      }

      const response = await apiRequest('POST', '/api/qonto/quotes', {
        clientName: clientName || 'Client',
        clientEmail: clientEmail,
        issueDate: today.toISOString().split('T')[0],
        expiryDate: expiryDate.toISOString().split('T')[0],
        items: quoteItems,
        header: `Devis pour ${clientName || 'Client'}`,
        footer: "Merci pour votre confiance. Ce devis est valable 30 jours."
      });
      
      return response.json();
    },
    onSuccess: async (result: { quote: { id: string; number: string; quote_url?: string } }) => {
      const quote = result.quote;
      setQontoQuoteDialogOpen(false);
      
      // Save quote to database for tracking
      try {
        await apiRequest('POST', `/api/deals/${dealId}/quotes`, {
          qontoQuoteId: quote.id,
          number: quote.number,
          title: qontoFormData.title,
          amount: (qontoFormData.quantity * qontoFormData.unitPrice).toString(),
          quoteUrl: quote.quote_url,
          status: 'draft',
        });
      } catch (err) {
        console.error('Erreur sauvegarde devis en base:', err);
      }
      
      // Refresh quotes list
      queryClient.invalidateQueries({ queryKey: ['/api/deals', dealId, 'quotes'] });
      
      toast({
        title: `Devis ${quote.number} créé`,
        description: 'Vous pouvez maintenant le voir et l\'envoyer au client.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur Qonto',
        description: error.message || 'Impossible de créer le devis sur Qonto.',
        variant: 'destructive',
      });
    },
  });

  // Send quote to client mutation
  const sendQuoteMutation = useMutation({
    mutationFn: async (quoteId: string) => {
      setSendingQuoteId(quoteId);
      return apiRequest('POST', `/api/quotes/${quoteId}/send`);
    },
    onSuccess: () => {
      setSendingQuoteId(null);
      queryClient.invalidateQueries({ queryKey: ['/api/deals', dealId, 'quotes'] });
      toast({
        title: 'Devis envoyé',
        description: 'Le devis a été envoyé au client par email.',
      });
    },
    onError: (error: Error) => {
      setSendingQuoteId(null);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible d\'envoyer le devis.',
        variant: 'destructive',
      });
    },
  });

  const updateProspectStatusMutation = useMutation({
    mutationFn: async ({ status, followUpDate, followUpNotes }: { status: ProspectStatus; followUpDate?: string | null; followUpNotes?: string | null }) => {
      return apiRequest('PATCH', `/api/deals/${dealId}`, {
        prospectStatus: status,
        prospectStatusUpdatedAt: new Date().toISOString(),
        followUpDate: followUpDate || null,
        followUpNotes: followUpNotes || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/deals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/deals', dealId] });
      toast({
        title: 'Statut mis à jour',
        description: 'Le statut du prospect a été modifié.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de mettre à jour le statut.',
        variant: 'destructive',
      });
    },
  });

  const enhanceNotesMutation = useMutation({
    mutationFn: async ({ action }: { action: 'structure' | 'summarize' | 'actions' | 'improve' }) => {
      const currentNotes = form.getValues('notes');
      if (!currentNotes?.trim()) {
        throw new Error('Veuillez d\'abord ajouter des notes à améliorer');
      }
      const response = await apiRequest('POST', `/api/deals/${dealId}/enhance-notes`, {
        notes: currentNotes,
        action,
        context: {
          companyName: prospectInfo.companyName || account?.name,
          contactName: prospectInfo.contactName || account?.contactName,
          dealName: deal?.name,
        },
      });
      return response.json();
    },
    onSuccess: (data: { content: string; action: string }) => {
      form.setValue('notes', data.content, { shouldDirty: true });
      const actionLabels: Record<string, string> = {
        structure: 'Notes structurées',
        summarize: 'Notes résumées',
        actions: 'Actions extraites',
        improve: 'Notes améliorées',
      };
      toast({
        title: actionLabels[data.action] || 'Notes améliorées',
        description: 'L\'IA a amélioré vos notes avec succès.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible d\'améliorer les notes.',
        variant: 'destructive',
      });
    },
  });

  const generateFollowUpMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/deals/${dealId}/follow-up/generate`);
      return response.json();
    },
    onSuccess: (data: { email: { to: string; subject: string; body: string }; whatsapp: { message: string; phone: string; url: string | null } }) => {
      // Clean markdown formatting from generated content
      const cleanMarkdown = (text: string) => text
        .replace(/\*\*([^*]+)\*\*/g, '$1')  // Remove **bold**
        .replace(/\*([^*]+)\*/g, '$1')      // Remove *italic*
        .replace(/_{2}([^_]+)_{2}/g, '$1')  // Remove __bold__
        .replace(/_([^_]+)_/g, '$1');       // Remove _italic_
      
      // Ensure proper spacing before signature (Cordialement, Bien à vous, etc.)
      const ensureSignatureSpacing = (text: string) => {
        return text
          .replace(/([.!?])\n(Cordialement|Bien à vous|Bien cordialement|Sincèrement)/g, '$1\n\n$2')
          .replace(/([.!?])\r\n(Cordialement|Bien à vous|Bien cordialement|Sincèrement)/g, '$1\r\n\r\n$2');
      };
      
      setFollowUpEmail({
        to: data.email.to,
        subject: cleanMarkdown(data.email.subject),
        body: ensureSignatureSpacing(cleanMarkdown(data.email.body)),
      });
      setFollowUpWhatsapp({ 
        message: cleanMarkdown(data.whatsapp.message), 
        phone: data.whatsapp.phone, 
        url: data.whatsapp.url || '' 
      });
      setShowFollowUpPanel(true);
      toast({
        title: 'Messages générés',
        description: 'Les messages de relance ont été générés par l\'IA.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de générer les messages.',
        variant: 'destructive',
      });
    },
  });

  const sendFollowUpEmailMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/deals/${dealId}/follow-up/send-email`, {
        to: followUpEmail.to,
        subject: followUpEmail.subject,
        body: followUpEmail.body,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/deals', dealId] });
      queryClient.invalidateQueries({ queryKey: ['/api/deals', dealId, 'follow-up', 'history'] });
      setShowFollowUpPanel(false);
      toast({
        title: 'Email envoyé',
        description: 'L\'email de relance a été envoyé avec succès.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible d\'envoyer l\'email.',
        variant: 'destructive',
      });
    },
  });

  const recordWhatsAppMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/deals/${dealId}/follow-up/history`, {
        type: 'whatsapp',
        content: followUpWhatsapp.message,
        recipientPhone: followUpWhatsapp.phone,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/deals', dealId, 'follow-up', 'history'] });
      toast({
        title: 'WhatsApp enregistré',
        description: 'Le message WhatsApp a été enregistré dans l\'historique.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible d\'enregistrer le message.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: DealFormValues) => {
    updateDealMutation.mutate(data);
  };

  if (dealLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-muted-foreground mb-4">Prospect non trouvé</p>
        <Link href="/pipeline">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour au pipeline
          </Button>
        </Link>
      </div>
    );
  }

  const account = accounts.find(a => a.id === deal.accountId);
  const dealDocuments = allDocuments.filter(d => d.dealId === dealId);
  const dealProjects = allProjects.filter(p => p.dealId === dealId || p.accountId === deal.accountId);
  const stage = stageConfig[deal.stage];
  const amountNum = parseFloat(deal.amount || '0');
  const auditAmountNum = parseFloat(deal.auditAmount || '0');
  const developmentAmountNum = parseFloat(deal.developmentAmount || '0');
  const recurringAmountNum = parseFloat(deal.recurringAmount || '0');
  const totalAmount = auditAmountNum + developmentAmountNum + recurringAmountNum;
  const isWonOrLost = deal.stage === 'won' || deal.stage === 'lost';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/pipeline">
          <Button variant="ghost" size="icon" data-testid="button-back-pipeline">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold" data-testid="text-deal-title">
              {account?.name || prospectInfo.companyName || 'Prospect'}
            </h1>
            <Badge className={`${stage.color} text-white`}>{stage.label}</Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            {deal.name}
          </p>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" data-testid="button-quote-menu">
                <FileText className="mr-2 h-4 w-4" />
                Devis
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                onClick={() => {
                  setSelectedQontoQuoteType('audit');
                  setQontoFormData({
                    title: "Audit IA - Analyse des processus",
                    description: "Étude complète des processus métiers et identification des opportunités d'automatisation",
                    quantity: 1,
                    unitPrice: parseFloat(deal?.amount || '1500'),
                    vatRate: 20,
                  });
                  setQontoQuoteDialogOpen(true);
                }}
                disabled={!qontoStatus?.connected}
                data-testid="menu-qonto-audit"
              >
                <FileText className="mr-2 h-4 w-4" />
                Devis Audit
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => {
                  setSelectedQontoQuoteType('prestation');
                  setQontoFormData({
                    title: "Prestation IA",
                    description: "Développement et mise en place de solutions d'automatisation personnalisées",
                    quantity: 1,
                    unitPrice: parseFloat(deal?.amount || '3000'),
                    vatRate: 20,
                  });
                  setQontoQuoteDialogOpen(true);
                }}
                disabled={!qontoStatus?.connected}
                data-testid="menu-qonto-prestation"
              >
                <FileText className="mr-2 h-4 w-4" />
                Devis Prestation
              </DropdownMenuItem>
              {!qontoStatus?.connected && (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">
                  Qonto non connecté
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button 
            variant="outline"
            onClick={() => setContractDialogOpen(true)}
            data-testid="button-generate-contract"
          >
            <FileSignature className="mr-2 h-4 w-4" />
            Générer contrat
          </Button>
          {!isWonOrLost && (
            <Button 
              onClick={() => setConvertDialogOpen(true)}
              data-testid="button-convert-client"
            >
              <UserCheck className="mr-2 h-4 w-4" />
              Convertir en client
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total estimé</p>
                <p className="text-2xl font-bold" data-testid="text-deal-amount">
                  {(totalAmount > 0 ? totalAmount : amountNum).toLocaleString('fr-FR')}€
                </p>
              </div>
            </div>
            <div className="space-y-1.5 border-t pt-3">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-violet-500" />
                  Audit
                </span>
                <span className="font-medium text-violet-600 dark:text-violet-400">
                  {auditAmountNum.toLocaleString('fr-FR')}€
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Développement
                </span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  {developmentAmountNum.toLocaleString('fr-FR')}€
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  Recurring
                </span>
                <span className="font-medium text-blue-600 dark:text-blue-400">
                  {recurringAmountNum.toLocaleString('fr-FR')}€
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Probabilité</p>
                <p className="text-2xl font-bold" data-testid="text-deal-probability">
                  {deal.probability}%
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Jours dans l'étape</p>
                <p className="text-2xl font-bold" data-testid="text-deal-days">
                  {deal.daysInStage}j
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <FileText className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Documents</p>
                <p className="text-2xl font-bold" data-testid="text-deal-docs">
                  {dealDocuments.length}
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Briefcase className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Projets</p>
                <p className="text-2xl font-bold">
                  {dealProjects.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quotes Section */}
      {dealQuotes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Devis ({dealQuotes.length})
            </CardTitle>
            <CardDescription>Devis créés pour ce prospect</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dealQuotes.map((quote) => (
                <div key={quote.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{quote.number}</span>
                      <Badge variant={
                        quote.status === 'signed' ? 'default' :
                        quote.status === 'sent' ? 'secondary' :
                        quote.status === 'rejected' ? 'destructive' :
                        'outline'
                      }>
                        {quote.status === 'draft' ? 'Brouillon' :
                         quote.status === 'sent' ? 'Envoyé' :
                         quote.status === 'signed' ? 'Signé' :
                         quote.status === 'rejected' ? 'Refusé' :
                         'Expiré'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{quote.title}</p>
                    <p className="text-sm font-medium mt-1">{parseFloat(quote.amount).toLocaleString('fr-FR')} € HT</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {quote.quoteUrl && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.open(quote.quoteUrl!, '_blank')}
                        data-testid={`button-view-quote-${quote.id}`}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Voir
                      </Button>
                    )}
                    {quote.status === 'draft' && quote.quoteUrl && (
                      <Button 
                        size="sm"
                        onClick={() => sendQuoteMutation.mutate(quote.id)}
                        disabled={sendingQuoteId !== null}
                        data-testid={`button-send-quote-${quote.id}`}
                      >
                        {sendingQuoteId === quote.id ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4 mr-1" />
                        )}
                        Envoyer
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informations du prospect</CardTitle>
              <CardDescription>Modifier les détails et ajouter des notes</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="auditAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-violet-500" />
                            Audit (€)
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <DollarSign className="absolute left-3 top-3 h-4 w-4 text-violet-500" />
                              <Input
                                className="pl-9"
                                type="number"
                                placeholder="0"
                                {...field}
                                data-testid="input-deal-audit-amount"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="developmentAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            Développement (€)
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <DollarSign className="absolute left-3 top-3 h-4 w-4 text-emerald-500" />
                              <Input
                                className="pl-9"
                                type="number"
                                placeholder="0"
                                {...field}
                                data-testid="input-deal-dev-amount"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="recurringAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                            Recurring (€)
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <DollarSign className="absolute left-3 top-3 h-4 w-4 text-blue-500" />
                              <Input
                                className="pl-9"
                                type="number"
                                placeholder="0"
                                {...field}
                                data-testid="input-deal-recurring-amount"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="probability"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Probabilité (%)</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger data-testid="select-deal-probability">
                              <SelectValue placeholder="Probabilité" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="10">10%</SelectItem>
                              <SelectItem value="25">25%</SelectItem>
                              <SelectItem value="50">50%</SelectItem>
                              <SelectItem value="75">75%</SelectItem>
                              <SelectItem value="90">90%</SelectItem>
                              <SelectItem value="100">100%</SelectItem>
                            </SelectContent>
                          </Select>
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
                        <FormLabel>Téléphone du contact</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              className="pl-9"
                              type="tel"
                              placeholder="+33 6 12 34 56 78"
                              {...field}
                              data-testid="input-deal-phone"
                            />
                          </div>
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
                        <FormLabel>Email du contact</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              className="pl-9"
                              type="email"
                              placeholder="contact@exemple.com"
                              {...field}
                              data-testid="input-deal-email"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="nextAction"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prochaine action</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Ex: Relancer par email la semaine prochaine"
                            {...field} 
                            data-testid="input-deal-next-action"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Separator />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel>Compte rendu / Notes</FormLabel>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={enhanceNotesMutation.isPending || !field.value?.trim()}
                                data-testid="button-ai-notes"
                              >
                                {enhanceNotesMutation.isPending ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <Sparkles className="mr-2 h-4 w-4" />
                                )}
                                IA
                                <ChevronDown className="ml-1 h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => enhanceNotesMutation.mutate({ action: 'structure' })}
                                data-testid="menu-ai-structure"
                              >
                                <AlignLeft className="mr-2 h-4 w-4" />
                                Structurer les notes
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => enhanceNotesMutation.mutate({ action: 'improve' })}
                                data-testid="menu-ai-improve"
                              >
                                <Wand2 className="mr-2 h-4 w-4" />
                                Améliorer la rédaction
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => enhanceNotesMutation.mutate({ action: 'summarize' })}
                                data-testid="menu-ai-summarize"
                              >
                                <FileText className="mr-2 h-4 w-4" />
                                Résumer
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => enhanceNotesMutation.mutate({ action: 'actions' })}
                                data-testid="menu-ai-actions"
                              >
                                <ListChecks className="mr-2 h-4 w-4" />
                                Extraire les actions
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <FormControl>
                          <Textarea
                            placeholder="Ajoutez vos notes de réunion, observations, points importants..."
                            className="min-h-[150px]"
                            {...field}
                            data-testid="input-deal-notes"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="loomVideoUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lien vidéo Loom</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Video className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input 
                              className="pl-9" 
                              type="url" 
                              placeholder="https://www.loom.com/share/..." 
                              {...field} 
                              data-testid="input-deal-loom"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {deal.loomVideoUrl && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
                      <Video className="h-5 w-5 text-primary" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Vidéo Loom disponible</p>
                        <p className="text-xs text-muted-foreground truncate">{deal.loomVideoUrl}</p>
                      </div>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.open(deal.loomVideoUrl!, '_blank')}
                        data-testid="button-view-loom"
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Voir
                      </Button>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button 
                      type="submit" 
                      disabled={updateDealMutation.isPending}
                      data-testid="button-save-deal"
                    >
                      {updateDealMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Enregistrer
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Compte associé
              </CardTitle>
            </CardHeader>
            <CardContent>
              {account ? (
                <div className="space-y-3">
                  <div>
                    <p className="font-semibold" data-testid="text-account-name">{account.name}</p>
                    <Badge variant="outline" className="mt-1">{account.plan}</Badge>
                  </div>
                  <Separator />
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span>{account.contactName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span>{deal.contactEmail || prospectInfo.contactEmail || account.contactEmail || 'Non défini'}</span>
                      {(deal.contactEmail || prospectInfo.contactEmail) && (deal.contactEmail || prospectInfo.contactEmail) !== account.contactEmail && (
                        <Badge variant="secondary" className="text-xs">Email du prospect</Badge>
                      )}
                    </div>
                    {deal.contactPhone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span>{deal.contactPhone}</span>
                      </div>
                    )}
                  </div>
                  <Link href={`/accounts`}>
                    <Button variant="outline" size="sm" className="w-full mt-2">
                      Voir le compte
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-muted-foreground text-sm">Aucun compte associé (prospect)</p>
                  <Separator />
                  <div className="space-y-2 text-sm">
                    {prospectInfo.contactName && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span>{prospectInfo.contactName}</span>
                      </div>
                    )}
                    {(deal.contactEmail || prospectInfo.contactEmail) && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span>{deal.contactEmail || prospectInfo.contactEmail}</span>
                      </div>
                    )}
                    {deal.contactPhone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span>{deal.contactPhone}</span>
                      </div>
                    )}
                    {!(deal.contactEmail || prospectInfo.contactEmail) && !deal.contactPhone && (
                      <p className="text-muted-foreground text-xs">Aucune information de contact</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Statut du prospect
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Statut actuel</span>
                {(() => {
                  const status = deal.prospectStatus || 'active';
                  const config = prospectStatusConfig[status as ProspectStatus];
                  const StatusIcon = config.icon;
                  return (
                    <Badge variant="outline" className={`${config.bgColor} ${config.color} border-0`}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {config.label}
                    </Badge>
                  );
                })()}
              </div>
              
              {deal.prospectStatusUpdatedAt && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Mis à jour le</span>
                  <span>{formatDate(deal.prospectStatusUpdatedAt)}</span>
                </div>
              )}

              {deal.followUpDate && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Date de relance</span>
                  <span className={new Date(deal.followUpDate) < new Date() ? 'text-red-500 font-medium' : ''}>
                    {formatDate(deal.followUpDate)}
                  </span>
                </div>
              )}

              {deal.followUpNotes && (
                <div className="text-sm">
                  <span className="text-muted-foreground block mb-1">Notes de suivi</span>
                  <div className="bg-muted/50 rounded-md p-2">
                    <MarkdownRenderer content={deal.followUpNotes} className="text-sm" />
                  </div>
                </div>
              )}

              <Separator />

              <div className="space-y-3">
                <Label className="text-sm font-medium">Changer le statut</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.entries(prospectStatusConfig) as [ProspectStatus, typeof prospectStatusConfig['active']][]).map(([key, config]) => {
                    const StatusIcon = config.icon;
                    const isActive = (deal.prospectStatus || 'active') === key;
                    return (
                      <Button
                        key={key}
                        variant={isActive ? "default" : "outline"}
                        size="sm"
                        className={isActive ? '' : `hover:${config.bgColor}`}
                        onClick={() => {
                          if (key === 'follow_up') {
                            setStatusFollowUpDate(deal.followUpDate ? deal.followUpDate.split('T')[0] : '');
                            setStatusFollowUpNotes(deal.followUpNotes || '');
                            setShowFollowUpForm(true);
                          } else {
                            setShowFollowUpForm(false);
                            updateProspectStatusMutation.mutate({ status: key });
                          }
                        }}
                        disabled={updateProspectStatusMutation.isPending}
                        data-testid={`button-status-${key}`}
                      >
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {config.label}
                      </Button>
                    );
                  })}
                </div>

                {(deal.prospectStatus === 'follow_up' || showFollowUpForm) && (
                  <div className="space-y-3 pt-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Date de relance</Label>
                      <Input
                        type="date"
                        value={statusFollowUpDate || (deal.followUpDate ? deal.followUpDate.split('T')[0] : '')}
                        onChange={(e) => setStatusFollowUpDate(e.target.value)}
                        className="mt-1"
                        data-testid="input-follow-up-date"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Notes</Label>
                      <Textarea
                        value={statusFollowUpNotes || deal.followUpNotes || ''}
                        onChange={(e) => setStatusFollowUpNotes(e.target.value)}
                        placeholder="Notes de suivi..."
                        className="mt-1 min-h-[60px]"
                        data-testid="input-follow-up-notes"
                      />
                    </div>
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => updateProspectStatusMutation.mutate({
                        status: 'follow_up',
                        followUpDate: statusFollowUpDate,
                        followUpNotes: statusFollowUpNotes,
                      })}
                      disabled={updateProspectStatusMutation.isPending || !statusFollowUpDate}
                      data-testid="button-save-follow-up"
                    >
                      {updateProspectStatusMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Enregistrer la relance
                    </Button>

                    <Separator className="my-3" />

                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full bg-gradient-to-r from-violet-500/10 to-purple-500/10 border-violet-500/30 hover:border-violet-500/50"
                      onClick={() => generateFollowUpMutation.mutate()}
                      disabled={generateFollowUpMutation.isPending}
                      data-testid="button-generate-follow-up"
                    >
                      {generateFollowUpMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4 mr-2 text-violet-500" />
                      )}
                      Générer messages avec IA
                    </Button>
                  </div>
                )}

                {showFollowUpPanel && (
                  <div className="space-y-4 pt-4 border-t mt-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-violet-500" />
                        Messages générés par l'IA
                      </h4>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => generateFollowUpMutation.mutate()}
                        disabled={generateFollowUpMutation.isPending}
                        data-testid="button-regenerate-follow-up"
                      >
                        {generateFollowUpMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          Email de relance
                        </Label>
                        <Input
                          value={followUpEmail.to}
                          onChange={(e) => setFollowUpEmail(prev => ({ ...prev, to: e.target.value }))}
                          placeholder="Email destinataire"
                          className="mt-1 mb-2"
                          data-testid="input-follow-up-email-to"
                        />
                        <Input
                          value={followUpEmail.subject}
                          onChange={(e) => setFollowUpEmail(prev => ({ ...prev, subject: e.target.value }))}
                          placeholder="Objet"
                          className="mb-2"
                          data-testid="input-follow-up-email-subject"
                        />
                        <Textarea
                          value={followUpEmail.body}
                          onChange={(e) => setFollowUpEmail(prev => ({ ...prev, body: e.target.value }))}
                          placeholder="Contenu de l'email..."
                          className="min-h-[120px]"
                          data-testid="input-follow-up-email-body"
                        />
                        <Button
                          size="sm"
                          className="w-full mt-2"
                          onClick={() => sendFollowUpEmailMutation.mutate()}
                          disabled={sendFollowUpEmailMutation.isPending || !followUpEmail.to || !followUpEmail.body}
                          data-testid="button-send-follow-up-email"
                        >
                          {sendFollowUpEmailMutation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4 mr-2" />
                          )}
                          Envoyer l'email
                        </Button>
                      </div>

                      <Separator />

                      <div>
                        <Label className="text-xs text-muted-foreground flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          Message WhatsApp
                        </Label>
                        <Textarea
                          value={followUpWhatsapp.message}
                          onChange={(e) => setFollowUpWhatsapp(prev => ({ ...prev, message: e.target.value }))}
                          placeholder="Message WhatsApp..."
                          className="mt-1 min-h-[80px]"
                          data-testid="input-follow-up-whatsapp"
                        />
                        {followUpWhatsapp.url ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full mt-2 bg-green-500/10 border-green-500/30 hover:bg-green-500/20"
                            onClick={() => {
                              window.open(followUpWhatsapp.url, '_blank');
                              recordWhatsAppMutation.mutate();
                            }}
                            disabled={recordWhatsAppMutation.isPending}
                            data-testid="button-open-whatsapp"
                          >
                            {recordWhatsAppMutation.isPending ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <MessageSquare className="h-4 w-4 mr-2 text-green-500" />
                            )}
                            Ouvrir WhatsApp
                          </Button>
                        ) : (
                          <p className="text-xs text-muted-foreground mt-2">
                            Aucun numéro de téléphone disponible pour WhatsApp
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {followUpHistory.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1 mb-3">
                      <History className="h-3 w-3" />
                      Historique des relances ({followUpHistory.length})
                    </Label>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {followUpHistory.map((entry) => {
                        const typeIcons: Record<string, typeof Mail> = {
                          email: Mail,
                          whatsapp: MessageSquare,
                          call: PhoneCall,
                          meeting: Users,
                          visio: Video,
                          sms: MessageSquare,
                        };
                        const TypeIcon = typeIcons[entry.type] || Mail;
                        const typeLabels: Record<string, string> = {
                          email: 'Email',
                          whatsapp: 'WhatsApp',
                          call: 'Appel',
                          meeting: 'Réunion',
                          visio: 'Visio',
                          sms: 'SMS',
                        };
                        return (
                          <div 
                            key={entry.id}
                            className="p-3 rounded-lg bg-muted/50 border border-border/50"
                            data-testid={`follow-up-history-${entry.id}`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <TypeIcon className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs font-medium">{typeLabels[entry.type]}</span>
                              <span className="text-xs text-muted-foreground ml-auto">
                                {new Date(entry.sentAt).toLocaleDateString('fr-FR', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            {entry.subject && (
                              <p className="text-xs font-medium mb-1">{entry.subject}</p>
                            )}
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {entry.content}
                            </p>
                            {entry.response && (
                              <div className="mt-2 p-2 bg-green-500/10 rounded border border-green-500/30">
                                <p className="text-xs text-green-600 dark:text-green-400">
                                  Réponse: {entry.response}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documents ({dealDocuments.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dealDocuments.length > 0 ? (
                <div className="space-y-2">
                  {dealDocuments.map(doc => (
                    <div 
                      key={doc.id} 
                      className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
                      data-testid={`document-item-${doc.id}`}
                    >
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm truncate flex-1">{doc.name}</span>
                      {doc.url && (
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => window.open(doc.url, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">Aucun document</p>
              )}
              <Link href="/documents">
                <Button variant="outline" size="sm" className="w-full mt-4">
                  Gérer les documents
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Projets ({dealProjects.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dealProjects.length > 0 ? (
                <div className="space-y-2">
                  {dealProjects.map(project => (
                    <Link key={project.id} href={`/projects/${project.id}`}>
                      <div 
                        className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 hover-elevate cursor-pointer"
                        data-testid={`project-item-${project.id}`}
                      >
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium truncate block">{project.name}</span>
                          <span className="text-xs text-muted-foreground">{project.status}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">Aucun projet</p>
              )}
              <Link href="/projects">
                <Button variant="outline" size="sm" className="w-full mt-4">
                  Gérer les projets
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Historique
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Créé le</span>
                  <span>{formatDate(deal.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Modifié le</span>
                  <span>{formatDate(deal.updatedAt)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convertir en client</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir convertir ce prospect en client ? 
              L'opportunité sera marquée comme gagnée et le compte sera activé.
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              <div>
                <p className="font-semibold">{deal.name || account?.name}</p>
                <p className="text-sm text-muted-foreground">
                  {amountNum.toLocaleString('fr-FR')}€
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={() => convertToClientMutation.mutate()}
              disabled={convertToClientMutation.isPending}
              data-testid="button-confirm-convert"
            >
              {convertToClientMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Confirmer la conversion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={contractDialogOpen} onOpenChange={setContractDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Générer et envoyer un contrat</DialogTitle>
            <DialogDescription>
              Sélectionnez le type de contrat à générer pour {account?.name || 'ce client'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Type de contrat</label>
              <Select 
                value={selectedContractType} 
                onValueChange={(value: 'audit' | 'prestation') => setSelectedContractType(value)}
              >
                <SelectTrigger data-testid="select-contract-type">
                  <SelectValue placeholder="Sélectionner le type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="audit">Contrat d'Audit</SelectItem>
                  <SelectItem value="prestation">Contrat de Prestation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-lg border p-4 bg-muted/50">
              <h4 className="font-medium mb-2">Informations du contrat</h4>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>Client: {prospectInfo.contactName || account?.contactName || account?.name || 'Non défini'}</p>
                <p>Email: {deal?.contactEmail || prospectInfo.contactEmail || account?.contactEmail || 'Non défini'}</p>
                <p>Montant: {parseFloat(deal?.amount || '0').toLocaleString('fr-FR')}€</p>
              </div>
            </div>
            <div className="rounded-lg border p-4 bg-blue-50 dark:bg-blue-950">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>Conseil:</strong> Utilisez "Créer et personnaliser" pour éditer le contrat avec l'aide de ChatGPT avant l'envoi.
              </p>
            </div>
          </div>
          <DialogFooter className="flex-wrap gap-2">
            <Button variant="outline" onClick={() => setContractDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              variant="outline"
              onClick={async () => {
                try {
                  const response = await apiRequest('POST', '/api/contracts/create-from-deal', {
                    dealId: dealId,
                    type: selectedContractType,
                  });
                  const contract = await response.json();
                  queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
                  setContractDialogOpen(false);
                  navigate(`/contracts/${contract.id}/preview`);
                } catch (error: any) {
                  toast({ 
                    title: 'Erreur', 
                    description: error.message || 'Échec de la création du brouillon', 
                    variant: 'destructive' 
                  });
                }
              }}
              data-testid="button-create-draft"
            >
              <FileText className="mr-2 h-4 w-4" />
              Créer et personnaliser
            </Button>
            <Button
              onClick={() => generateAndSendContractMutation.mutate(selectedContractType)}
              disabled={generateAndSendContractMutation.isPending || !(deal?.contactEmail || prospectInfo.contactEmail || account?.contactEmail)}
              data-testid="button-confirm-generate-send"
            >
              {generateAndSendContractMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Générer et envoyer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={driveQuotesDialogOpen} onOpenChange={setDriveQuotesDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Devis sur Google Drive
            </DialogTitle>
            <DialogDescription>
              {driveStatus?.connected 
                ? `Connecté à ${driveStatus.email}` 
                : 'Non connecté à Google Drive'}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto space-y-2">
            {driveQuotes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <HardDrive className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucun devis enregistré sur Drive</p>
                <p className="text-sm mt-2">
                  Utilisez "Enregistrer sur Drive" pour sauvegarder un devis
                </p>
              </div>
            ) : (
              driveQuotes.map((file) => (
                <div 
                  key={file.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover-elevate"
                  data-testid={`drive-file-${file.id}`}
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-red-500" />
                    <div>
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {file.modifiedTime 
                          ? new Date(file.modifiedTime).toLocaleString('fr-FR')
                          : 'Date inconnue'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {file.webViewLink && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(file.webViewLink, '_blank')}
                        data-testid={`button-view-${file.id}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    {file.webContentLink && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(file.webContentLink, '_blank')}
                        data-testid={`button-download-${file.id}`}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteQuoteFromDriveMutation.mutate(file.id)}
                      disabled={deleteQuoteFromDriveMutation.isPending}
                      data-testid={`button-delete-${file.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDriveQuotesDialogOpen(false)}>
              Fermer
            </Button>
            <Button 
              onClick={() => saveQuoteToDriveMutation.mutate()}
              disabled={saveQuoteToDriveMutation.isPending}
            >
              {saveQuoteToDriveMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <HardDrive className="mr-2 h-4 w-4" />
              )}
              Nouveau devis
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={qontoQuoteDialogOpen} onOpenChange={setQontoQuoteDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Personnaliser le devis Qonto</DialogTitle>
            <DialogDescription>
              Modifiez les détails du devis avant de l'envoyer à Qonto
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="qonto-title">Titre de la prestation</Label>
              <Input
                id="qonto-title"
                value={qontoFormData.title}
                onChange={(e) => setQontoFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Ex: Audit IA - Analyse des processus"
                data-testid="input-qonto-title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qonto-description">Description</Label>
              <Textarea
                id="qonto-description"
                value={qontoFormData.description}
                onChange={(e) => setQontoFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Description de la prestation..."
                rows={3}
                data-testid="input-qonto-description"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="qonto-quantity">Quantité</Label>
                <Input
                  id="qonto-quantity"
                  type="number"
                  min={1}
                  value={qontoFormData.quantity}
                  onChange={(e) => setQontoFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                  data-testid="input-qonto-quantity"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="qonto-price">Prix unitaire (€)</Label>
                <Input
                  id="qonto-price"
                  type="number"
                  min={0}
                  step={0.01}
                  value={qontoFormData.unitPrice}
                  onChange={(e) => setQontoFormData(prev => ({ ...prev, unitPrice: parseFloat(e.target.value) || 0 }))}
                  data-testid="input-qonto-price"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="qonto-vat">TVA (%)</Label>
                <Input
                  id="qonto-vat"
                  type="number"
                  min={0}
                  max={100}
                  value={qontoFormData.vatRate}
                  onChange={(e) => setQontoFormData(prev => ({ ...prev, vatRate: parseFloat(e.target.value) || 0 }))}
                  data-testid="input-qonto-vat"
                />
              </div>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex justify-between text-sm">
                <span>Sous-total HT:</span>
                <span className="font-medium">{(qontoFormData.quantity * qontoFormData.unitPrice).toLocaleString('fr-FR')} €</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>TVA ({qontoFormData.vatRate}%):</span>
                <span className="font-medium">{(qontoFormData.quantity * qontoFormData.unitPrice * qontoFormData.vatRate / 100).toLocaleString('fr-FR')} €</span>
              </div>
              <div className="flex justify-between font-bold mt-2 pt-2 border-t">
                <span>Total TTC:</span>
                <span>{(qontoFormData.quantity * qontoFormData.unitPrice * (1 + qontoFormData.vatRate / 100)).toLocaleString('fr-FR')} €</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQontoQuoteDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={() => createQontoQuoteMutation.mutate(qontoFormData)}
              disabled={createQontoQuoteMutation.isPending || !qontoFormData.title}
              data-testid="button-create-qonto-quote"
            >
              {createQontoQuoteMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileText className="mr-2 h-4 w-4" />
              )}
              Créer le devis
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
