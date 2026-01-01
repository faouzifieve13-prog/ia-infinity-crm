import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Mail, Send, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface EmailTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal: {
    id: string;
    accountName: string;
    contactName: string;
    contactEmail?: string;
    amount: string;
    stage: string;
  };
}

export function EmailTemplateDialog({ open, onOpenChange, deal }: EmailTemplateDialogProps) {
  const { toast } = useToast();
  const [recipientEmail, setRecipientEmail] = useState(deal.contactEmail || '');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  // Fetch template for current stage
  const { data: template, isLoading: templateLoading } = useQuery({
    queryKey: ['/api/email-templates', deal.stage],
    queryFn: async () => {
      const res = await fetch(`/api/email-templates?stage=${deal.stage}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: open,
  });

  // Replace placeholders with actual values
  const replacePlaceholders = (text: string) => {
    return text
      .replace(/{clientName}/g, deal.contactName)
      .replace(/{dealTitle}/g, deal.accountName)
      .replace(/{value}/g, parseFloat(deal.amount).toLocaleString('fr-FR'));
  };

  // Update subject and body when template loads
  useEffect(() => {
    if (template) {
      setSubject(replacePlaceholders(template.subject));
      setBody(replacePlaceholders(template.body));
    }
  }, [template, deal]);

  // Update recipient email when deal changes
  useEffect(() => {
    if (deal.contactEmail) {
      setRecipientEmail(deal.contactEmail);
    }
  }, [deal.contactEmail]);

  // Send email mutation
  const sendEmailMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/gmail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipientEmail,
          subject,
          body,
          dealId: deal.id,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Erreur lors de l\'envoi');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Email envoyé',
        description: `Email envoyé à ${recipientEmail}`,
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSend = () => {
    if (!recipientEmail) {
      toast({
        title: 'Erreur',
        description: 'Veuillez saisir une adresse email',
        variant: 'destructive',
      });
      return;
    }
    sendEmailMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Envoyer un email
          </DialogTitle>
          <DialogDescription>
            Template pour l'étape "{deal.stage}" - {deal.accountName}
          </DialogDescription>
        </DialogHeader>

        {templateLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recipient">Destinataire</Label>
              <Input
                id="recipient"
                type="email"
                placeholder="email@exemple.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Objet</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">Message</Label>
              <Textarea
                id="body"
                rows={10}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="resize-none"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button
                onClick={handleSend}
                disabled={sendEmailMutation.isPending || !recipientEmail}
              >
                {sendEmailMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Envoi...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Envoyer
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
