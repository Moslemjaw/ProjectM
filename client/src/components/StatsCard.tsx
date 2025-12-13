import type { KeyboardEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  onClick?: () => void;
}

export function StatsCard({ title, value, icon: Icon, description, trend, onClick }: StatsCardProps) {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3, scale: 1.02 }}
      transition={{ duration: 0.3 }}
      data-testid={`card-stat-${title.toLowerCase().replace(/\s+/g, '-')}`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={onClick ? "cursor-pointer" : ""}
    >
      <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/20">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <motion.div
            whileHover={{ rotate: 10, scale: 1.2 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors"
          >
            <Icon className="h-4 w-4 text-primary" />
          </motion.div>
        </CardHeader>
        <CardContent className="relative">
          <motion.div 
            className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent" 
            data-testid={`text-stat-value-${title.toLowerCase().replace(/\s+/g, '-')}`}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
          >
            {value}
          </motion.div>
          {description && (
            <motion.p 
              className="text-xs text-muted-foreground mt-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {description}
            </motion.p>
          )}
          {trend && (
            <motion.p 
              className={`text-xs mt-2 font-medium flex items-center gap-1 ${trend.isPositive ? 'text-success' : 'text-destructive'}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <span className="text-base">{trend.isPositive ? '↑' : '↓'}</span>
              {Math.abs(trend.value)}% from last month
            </motion.p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
