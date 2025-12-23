import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Mail, MailOpen, RefreshCw, ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { GmailMessage } from '@/lib/types';

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  show: { opacity: 1, x: 0 }
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatEmailDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return formatDistanceToNow(date, { addSuffix: true, locale: fr });
  } catch {
    return dateStr;
  }
}

export function InboxWidget() {
  const { data: emails = [], isLoading, isError, error, refetch, isFetching } = useQuery<GmailMessage[]>({
    queryKey: ['/api/gmail/inbox'],
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  const openInGmail = (email: GmailMessage) => {
    window.open(`https://mail.google.com/mail/u/0/#inbox/${email.threadId}`, '_blank');
  };

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          Boîte de réception
        </CardTitle>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => refetch()}
          disabled={isFetching}
          data-testid="button-refresh-inbox"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2 text-center px-4">
            <AlertCircle className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {(error as Error)?.message?.includes('Permission') 
                ? 'Permissions insuffisantes pour lire les emails. Ouvrez Gmail pour consulter votre boîte de réception.'
                : (error as Error)?.message || 'Impossible de charger les emails'}
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => window.open('https://mail.google.com', '_blank')}
              data-testid="button-open-gmail-fallback"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Ouvrir Gmail
            </Button>
          </div>
        ) : emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2 text-center px-4">
            <MailOpen className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Aucun email dans la boîte de réception</p>
          </div>
        ) : (
          <ScrollArea className="h-[320px]">
            <div className="divide-y">
              {emails.slice(0, 10).map((email, index) => (
                <motion.div
                  key={email.id}
                  variants={itemVariants}
                  initial="hidden"
                  animate="show"
                  transition={{ delay: index * 0.05 }}
                  className={`flex items-start gap-3 p-3 hover-elevate cursor-pointer ${
                    email.isUnread ? 'bg-primary/5' : ''
                  }`}
                  onClick={() => openInGmail(email)}
                  data-testid={`email-item-${email.id}`}
                >
                  <Avatar className="h-9 w-9 flex-shrink-0">
                    <AvatarFallback className={email.isUnread ? 'bg-primary/20 text-primary' : ''}>
                      {getInitials(email.fromName || email.from)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm truncate ${email.isUnread ? 'font-semibold' : 'font-medium'}`}>
                        {email.fromName || email.from.split('@')[0]}
                      </span>
                      {email.isUnread && (
                        <Badge variant="default" className="text-xs px-1.5 py-0">
                          Nouveau
                        </Badge>
                      )}
                    </div>
                    <p className={`text-sm truncate ${email.isUnread ? 'font-medium' : 'text-muted-foreground'}`}>
                      {email.subject}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {email.snippet}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatEmailDate(email.date)}
                    </span>
                    <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                  </div>
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        )}
        {emails.length > 0 && (
          <div className="p-3 border-t">
            <Button
              variant="ghost"
              className="w-full text-sm"
              onClick={() => window.open('https://mail.google.com', '_blank')}
              data-testid="button-open-gmail"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Ouvrir Gmail
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
