import { Check } from 'lucide-react';
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface ToastProps {
  message: string | null;
  onClose: () => void;
}

export function Toast({ message, onClose }: ToastProps) {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [message, onClose]);

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
          className="fixed bottom-24 right-8 z-50 flex items-center px-4 py-3 bg-zinc-800 border border-zinc-700 text-zinc-100 rounded-lg shadow-2xl"
        >
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 mr-3">
            <Check className="w-3.5 h-3.5" />
          </div>
          <span className="text-sm font-medium">{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
