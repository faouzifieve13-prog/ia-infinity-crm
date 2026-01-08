import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { GripVertical, Calendar, TrendingUp, Clock, AlertCircle, FileEdit, PhoneCall, XCircle, Mail, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { ProspectStatus, DealStage } from '@/lib/types';

interface DealOwner {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
}

interface DealCardDeal {
  id: string;
  accountName: string;
  contactName: string;
  contactEmail?: string | null;
  amount: string;
  probability: number;
  nextAction?: string | null;
  daysInStage: number;
  owner: DealOwner;
  missionTypes?: string[] | null;
  prospectStatus?: ProspectStatus | null;
  followUpDate?: string | null;
  followUpNotes?: string | null;
  score?: string | null;
  stage: DealStage;
}

const scoreConfig: Record<string, { label: string; className: string }> = {
  A: { label: 'A', className: 'bg-emerald-500 text-white border-emerald-600' },
  B: { label: 'B', className: 'bg-amber-500 text-white border-amber-600' },
  C: { label: 'C', className: 'bg-slate-400 text-white border-slate-500' },
};

const prospectStatusConfig: Record<ProspectStatus, { label: string; color: string; icon: typeof AlertCircle }> = {
  active: { label: 'Actif', color: 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30', icon: TrendingUp },
  draft: { label: 'Brouillon', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30', icon: FileEdit },
  follow_up: { label: 'À relancer', color: 'bg-amber-500/20 text-amber-500 border-amber-500/30', icon: PhoneCall },
  abandoned: { label: 'Abandonné', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: XCircle },
};

interface DealCardProps {
  deal: DealCardDeal;
  onEmailClick?: (deal: DealCardDeal) => void;
  onDelete?: (dealId: string) => void;
}

const getProbabilityColor = (probability: number) => {
  if (probability >= 70) return 'bg-emerald-500';
  if (probability >= 40) return 'bg-amber-500';
  return 'bg-red-400';
};

const getDaysColor = (days: number) => {
  if (days <= 7) return 'text-emerald-500';
  if (days <= 14) return 'text-amber-500';
  return 'text-red-500';
};

export function DealCard({ deal, onEmailClick, onDelete }: DealCardProps) {
  const [, navigate] = useLocation();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: deal.id });

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on the drag handle
    if ((e.target as HTMLElement).closest('[data-testid^="deal-drag-handle"]')) {
      return;
    }
    navigate(`/deals/${deal.id}`);
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const ownerInitials = deal.owner.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  const amountNum = typeof deal.amount === 'string' ? parseFloat(deal.amount) : deal.amount;

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={false}
      animate={{ 
        opacity: isDragging ? 0.6 : 1,
        scale: isDragging ? 1.02 : 1,
        boxShadow: isDragging ? '0 10px 40px rgba(0,0,0,0.15)' : '0 1px 3px rgba(0,0,0,0.08)'
      }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className="cursor-pointer group overflow-hidden border-0 shadow-sm hover:shadow-md transition-all duration-200"
        onClick={handleCardClick}
        data-testid={`deal-card-${deal.id}`}
      >
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <div
              {...attributes}
              {...listeners}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              className="mt-1 cursor-grab text-muted-foreground/50 hover:text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
              data-testid={`deal-drag-handle-${deal.id}`}
            >
              <GripVertical className="h-4 w-4 pointer-events-none" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  {deal.score && scoreConfig[deal.score] && (
                    <Badge
                      className={`text-[10px] px-1.5 py-0 h-4 font-bold shrink-0 ${scoreConfig[deal.score].className}`}
                      data-testid={`badge-score-${deal.id}`}
                    >
                      {scoreConfig[deal.score].label}
                    </Badge>
                  )}
                  <h4 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                    {deal.accountName}
                  </h4>
                </div>
                <Badge variant="secondary" className="font-bold text-xs shrink-0 bg-primary/10 text-primary border-0">
                  {amountNum.toLocaleString('fr-FR')}€
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate mb-1">
                {deal.contactName}
              </p>
              
              <div className="flex flex-wrap gap-1 mb-2">
                {deal.prospectStatus && deal.prospectStatus !== 'active' && (
                  <Badge 
                    variant="outline" 
                    className={`text-[10px] px-1.5 py-0 h-4 ${prospectStatusConfig[deal.prospectStatus].color}`}
                    data-testid={`badge-prospect-status-${deal.id}`}
                  >
                    {(() => {
                      const StatusIcon = prospectStatusConfig[deal.prospectStatus!].icon;
                      return <StatusIcon className="h-2.5 w-2.5 mr-1" />;
                    })()}
                    {prospectStatusConfig[deal.prospectStatus].label}
                  </Badge>
                )}
                {deal.missionTypes && deal.missionTypes.length > 0 && (
                  <>
                    {deal.missionTypes.includes('audit') && (
                      <Badge 
                        variant="secondary" 
                        className="text-[10px] px-1.5 py-0 h-4 bg-violet-500/20 text-violet-600 dark:text-violet-400 border-0"
                        data-testid={`badge-mission-audit-${deal.id}`}
                      >
                        Audit
                      </Badge>
                    )}
                    {deal.missionTypes.includes('automatisation') && (
                      <Badge 
                        variant="secondary" 
                        className="text-[10px] px-1.5 py-0 h-4 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-0"
                        data-testid={`badge-mission-auto-${deal.id}`}
                      >
                        Automatisation
                      </Badge>
                    )}
                  </>
                )}
              </div>

              {deal.followUpNotes && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2 bg-amber-500/10 rounded-md px-2 py-1.5 border border-amber-500/20">
                  <Calendar className="h-3 w-3 text-amber-500 shrink-0" />
                  <span className="truncate text-amber-600 dark:text-amber-400">{deal.followUpNotes}</span>
                </div>
              )}
              
              {deal.nextAction && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3 bg-muted/50 rounded-md px-2 py-1">
                  <Calendar className="h-3 w-3 text-primary shrink-0" />
                  <span className="truncate">{deal.nextAction}</span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full ${getProbabilityColor(deal.probability)} rounded-full`}
                            initial={{ width: 0 }}
                            animate={{ width: `${deal.probability}%` }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                          />
                        </div>
                        <span className="text-xs font-medium">{deal.probability}%</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>Probabilité de conversion</TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className={`flex items-center gap-1 text-xs ${getDaysColor(deal.daysInStage)}`}>
                        <Clock className="h-3 w-3" />
                        <span className="font-medium">{deal.daysInStage}j</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>Jours dans cette étape</TooltipContent>
                  </Tooltip>
                  {onEmailClick && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEmailClick(deal);
                          }}
                          data-testid={`deal-email-btn-${deal.id}`}
                        >
                          <Mail className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Envoyer un email</TooltipContent>
                    </Tooltip>
                  )}
                  {onDelete && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(deal.id);
                          }}
                          data-testid={`deal-delete-btn-${deal.id}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Supprimer le prospect</TooltipContent>
                    </Tooltip>
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Avatar className="h-6 w-6 ring-2 ring-background">
                        <AvatarFallback className="text-[10px] bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-semibold">
                          {ownerInitials}
                        </AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent>{deal.owner.name}</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
