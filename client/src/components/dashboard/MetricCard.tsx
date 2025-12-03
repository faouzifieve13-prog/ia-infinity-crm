import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: LucideIcon;
  format?: 'currency' | 'percent' | 'number';
  index?: number;
  accentColor?: 'primary' | 'success' | 'warning' | 'info';
}

const accentColors = {
  primary: 'from-primary/10 to-primary/5 border-l-primary',
  success: 'from-emerald-500/10 to-emerald-500/5 border-l-emerald-500',
  warning: 'from-amber-500/10 to-amber-500/5 border-l-amber-500',
  info: 'from-blue-500/10 to-blue-500/5 border-l-blue-500',
};

const iconColors = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-emerald-500/10 text-emerald-500',
  warning: 'bg-amber-500/10 text-amber-500',
  info: 'bg-blue-500/10 text-blue-500',
};

export function MetricCard({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  format = 'number',
  index = 0,
  accentColor = 'primary',
}: MetricCardProps) {
  const formatValue = (val: string | number) => {
    if (typeof val === 'string') return val;
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);
      case 'percent':
        return `${val}%`;
      default:
        return val.toLocaleString();
    }
  };

  const getTrendIcon = () => {
    if (change === undefined) return null;
    if (change > 0) return <TrendingUp className="h-4 w-4" />;
    if (change < 0) return <TrendingDown className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };

  const getTrendColor = () => {
    if (change === undefined) return '';
    if (change > 0) return 'text-emerald-500 bg-emerald-500/10';
    if (change < 0) return 'text-red-500 bg-red-500/10';
    return 'text-muted-foreground bg-muted';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      <Card 
        className={`relative overflow-hidden border-l-4 bg-gradient-to-br ${accentColors[accentColor]} hover:shadow-lg transition-all duration-300 group`}
        data-testid={`card-metric-${title.toLowerCase().replace(/\s+/g, '-')}`}
      >
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          {Icon && (
            <div className={`p-2 rounded-lg ${iconColors[accentColor]} transition-transform duration-300 group-hover:scale-110`}>
              <Icon className="h-4 w-4" />
            </div>
          )}
        </CardHeader>
        <CardContent>
          <motion.div 
            className="text-3xl font-bold tracking-tight"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, delay: index * 0.1 + 0.2 }}
          >
            {formatValue(value)}
          </motion.div>
          {change !== undefined && (
            <motion.div 
              className={`inline-flex items-center gap-1 text-sm mt-2 px-2 py-0.5 rounded-full ${getTrendColor()}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 + 0.3 }}
            >
              {getTrendIcon()}
              <span className="font-medium">{change > 0 ? '+' : ''}{change}%</span>
              {changeLabel && <span className="text-muted-foreground ml-1">{changeLabel}</span>}
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
