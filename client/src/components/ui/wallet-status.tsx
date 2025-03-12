import { motion } from "framer-motion";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface WalletStatusProps {
  isConnected: boolean;
  isLoading: boolean;
  address?: string;
  className?: string;
}

export function WalletStatus({ 
  isConnected, 
  isLoading, 
  address, 
  className 
}: WalletStatusProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {isLoading ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2"
        >
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Connecting to wallet...
          </span>
        </motion.div>
      ) : isConnected ? (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2"
        >
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span className="text-sm">
            Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
          </span>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2"
        >
          <XCircle className="h-4 w-4 text-destructive" />
          <span className="text-sm text-destructive">
            Wallet not connected
          </span>
        </motion.div>
      )}
    </div>
  );
}
