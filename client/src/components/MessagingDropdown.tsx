import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  MessageSquare,
  Send,
  X,
  ChevronDown,
  ChevronUp,
  User,
  Users,
  Briefcase,
  Building2,
  Loader2,
  Check,
  CheckCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Recipient {
  id: string;
  name: string;
  email: string;
  role: string;
  type: 'admin' | 'vendor' | 'client';
}

interface Conversation {
  id: string;
  participant1Id: string;
  participant2Id: string;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  otherParticipant: {
    id: string;
    name: string;
    email: string;
    role?: string;
  };
  unreadCount: number;
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  content: string;
  status: 'sent' | 'delivered' | 'read';
  readAt: string | null;
  createdAt: string;
}

const roleIcons: Record<string, typeof User> = {
  admin: Briefcase,
  sales: Briefcase,
  delivery: Briefcase,
  finance: Briefcase,
  vendor: Users,
  client_admin: Building2,
  client_member: Building2,
};

const roleLabels: Record<string, string> = {
  admin: 'Admin',
  sales: 'Commercial',
  delivery: 'Delivery',
  finance: 'Finance',
  vendor: 'Sous-traitant',
  client_admin: 'Client (Admin)',
  client_member: 'Client',
};

export function MessagingDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    admin: true,
    vendor: true,
    client: true,
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Fetch conversations
  const { data: conversations = [], isLoading: conversationsLoading } = useQuery<Conversation[]>({
    queryKey: ['/api/messages/conversations'],
    enabled: isOpen,
    refetchInterval: isOpen ? 10000 : false, // Refresh every 10s when open
  });

  // Fetch unread count
  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ['/api/messages/unread-count'],
    refetchInterval: 30000, // Refresh every 30s
  });

  // Fetch recipients
  const { data: recipients = [] } = useQuery<Recipient[]>({
    queryKey: ['/api/messages/recipients'],
    enabled: showNewConversation,
  });

  // Fetch messages for selected conversation
  const { data: messages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ['/api/messages/conversations', selectedConversation?.id, 'messages'],
    enabled: !!selectedConversation,
    refetchInterval: selectedConversation ? 5000 : false,
  });

  // Start conversation mutation
  const startConversationMutation = useMutation({
    mutationFn: async (recipientId: string) => {
      const response = await apiRequest('POST', '/api/messages/conversations', { recipientId });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/messages/conversations'] });
      setSelectedConversation({
        ...data,
        otherParticipant: recipients.find(r => r.id === (data.participant1Id === data.participant2Id ? data.participant1Id : data.participant2Id)) || { id: '', name: 'Inconnu', email: '' },
        unreadCount: 0,
      });
      setShowNewConversation(false);
    },
    onError: () => {
      toast({ title: 'Erreur', description: 'Impossible de démarrer la conversation', variant: 'destructive' });
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: string; content: string }) => {
      const response = await apiRequest('POST', `/api/messages/conversations/${conversationId}/messages`, { content });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messages/conversations', selectedConversation?.id, 'messages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/messages/conversations'] });
      setNewMessage('');
    },
    onError: () => {
      toast({ title: 'Erreur', description: "Impossible d'envoyer le message", variant: 'destructive' });
    },
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!selectedConversation || !newMessage.trim()) return;
    sendMessageMutation.mutate({
      conversationId: selectedConversation.id,
      content: newMessage.trim(),
    });
  };

  const handleStartConversation = (recipientId: string) => {
    // Check if conversation already exists
    const existingConv = conversations.find(
      c => c.otherParticipant.id === recipientId
    );
    if (existingConv) {
      setSelectedConversation(existingConv);
      setShowNewConversation(false);
    } else {
      startConversationMutation.mutate(recipientId);
    }
  };

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  const groupedRecipients = {
    admin: recipients.filter(r => r.type === 'admin'),
    vendor: recipients.filter(r => r.type === 'vendor'),
    client: recipients.filter(r => r.type === 'client'),
  };

  const getRoleIcon = (role?: string) => {
    const Icon = roleIcons[role || ''] || User;
    return Icon;
  };

  const unreadCount = unreadData?.count || 0;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <MessageSquare className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 p-0">
        <div className="flex flex-col h-[500px]">
          {/* Header */}
          <div className="p-3 border-b flex items-center justify-between bg-violet-50 dark:bg-violet-900/20">
            <h3 className="font-semibold flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-violet-600" />
              Messages privés
            </h3>
            {selectedConversation && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedConversation(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Content */}
          {showNewConversation ? (
            // New conversation view
            <div className="flex-1 overflow-hidden">
              <div className="p-3 border-b">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Nouvelle conversation</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowNewConversation(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <ScrollArea className="flex-1 h-[380px]">
                <div className="p-2">
                  {/* Admin group */}
                  <Collapsible open={expandedGroups.admin} onOpenChange={() => toggleGroup('admin')}>
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-sm">Équipe interne</span>
                        <Badge variant="secondary" className="text-xs">{groupedRecipients.admin.length}</Badge>
                      </div>
                      {expandedGroups.admin ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pl-4">
                      {groupedRecipients.admin.map(recipient => (
                        <button
                          key={recipient.id}
                          onClick={() => handleStartConversation(recipient.id)}
                          className="flex items-center gap-3 w-full p-2 hover:bg-muted rounded-lg text-left"
                        >
                          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <User className="h-4 w-4 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{recipient.name}</p>
                            <p className="text-xs text-muted-foreground">{roleLabels[recipient.role] || recipient.role}</p>
                          </div>
                        </button>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Vendor group */}
                  {groupedRecipients.vendor.length > 0 && (
                    <Collapsible open={expandedGroups.vendor} onOpenChange={() => toggleGroup('vendor')}>
                      <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted rounded-lg">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-purple-600" />
                          <span className="font-medium text-sm">Sous-traitants</span>
                          <Badge variant="secondary" className="text-xs">{groupedRecipients.vendor.length}</Badge>
                        </div>
                        {expandedGroups.vendor ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pl-4">
                        {groupedRecipients.vendor.map(recipient => (
                          <button
                            key={recipient.id}
                            onClick={() => handleStartConversation(recipient.id)}
                            className="flex items-center gap-3 w-full p-2 hover:bg-muted rounded-lg text-left"
                          >
                            <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                              <Users className="h-4 w-4 text-purple-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{recipient.name}</p>
                              <p className="text-xs text-muted-foreground">{recipient.email}</p>
                            </div>
                          </button>
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  )}

                  {/* Client group */}
                  {groupedRecipients.client.length > 0 && (
                    <Collapsible open={expandedGroups.client} onOpenChange={() => toggleGroup('client')}>
                      <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted rounded-lg">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-green-600" />
                          <span className="font-medium text-sm">Clients</span>
                          <Badge variant="secondary" className="text-xs">{groupedRecipients.client.length}</Badge>
                        </div>
                        {expandedGroups.client ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pl-4">
                        {groupedRecipients.client.map(recipient => (
                          <button
                            key={recipient.id}
                            onClick={() => handleStartConversation(recipient.id)}
                            className="flex items-center gap-3 w-full p-2 hover:bg-muted rounded-lg text-left"
                          >
                            <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                              <Building2 className="h-4 w-4 text-green-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{recipient.name}</p>
                              <p className="text-xs text-muted-foreground">{recipient.email}</p>
                            </div>
                          </button>
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </div>
              </ScrollArea>
            </div>
          ) : selectedConversation ? (
            // Conversation view
            <div className="flex flex-col flex-1 overflow-hidden">
              {/* Conversation header */}
              <div className="p-3 border-b bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                    {(() => {
                      const Icon = getRoleIcon(selectedConversation.otherParticipant.role);
                      return <Icon className="h-5 w-5 text-violet-600" />;
                    })()}
                  </div>
                  <div>
                    <p className="font-medium">{selectedConversation.otherParticipant.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {roleLabels[selectedConversation.otherParticipant.role || ''] || selectedConversation.otherParticipant.email}
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-3">
                {messagesLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    Aucun message. Commencez la conversation!
                  </div>
                ) : (
                  <div className="space-y-3">
                    {[...messages].reverse().map((message) => {
                      const isMe = message.senderId !== selectedConversation.otherParticipant.id;
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg p-2 ${
                              isMe
                                ? 'bg-violet-600 text-white'
                                : 'bg-gray-100 dark:bg-gray-800'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            <div className={`flex items-center gap-1 mt-1 text-xs ${isMe ? 'text-violet-200' : 'text-muted-foreground'}`}>
                              <span>{format(new Date(message.createdAt), 'HH:mm', { locale: fr })}</span>
                              {isMe && (
                                message.status === 'read' ? (
                                  <CheckCheck className="h-3 w-3" />
                                ) : (
                                  <Check className="h-3 w-3" />
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Message input */}
              <div className="p-3 border-t">
                <div className="flex gap-2">
                  <Input
                    placeholder="Votre message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    disabled={sendMessageMutation.isPending}
                  />
                  <Button
                    size="icon"
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sendMessageMutation.isPending}
                  >
                    {sendMessageMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            // Conversations list
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-[400px]">
                {conversationsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="text-center py-8 px-4">
                    <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground text-sm">Aucune conversation</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => setShowNewConversation(true)}
                    >
                      Démarrer une conversation
                    </Button>
                  </div>
                ) : (
                  <div className="p-2">
                    {conversations.map((conv) => {
                      const Icon = getRoleIcon(conv.otherParticipant.role);
                      return (
                        <button
                          key={conv.id}
                          onClick={() => setSelectedConversation(conv)}
                          className="flex items-center gap-3 w-full p-3 hover:bg-muted rounded-lg text-left"
                        >
                          <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                              <Icon className="h-5 w-5 text-violet-600" />
                            </div>
                            {conv.unreadCount > 0 && (
                              <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                                <span className="text-xs text-white font-medium">
                                  {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-sm truncate">{conv.otherParticipant.name}</p>
                              {conv.lastMessageAt && (
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(conv.lastMessageAt), 'dd/MM', { locale: fr })}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {conv.lastMessagePreview || 'Aucun message'}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>

              {/* New conversation button */}
              <div className="p-3 border-t">
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => setShowNewConversation(true)}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Nouvelle conversation
                </Button>
              </div>
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
