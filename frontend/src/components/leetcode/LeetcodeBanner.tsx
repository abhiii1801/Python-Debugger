// components/leetcode/LeetcodeBanner.tsx
// Dismissable suggestion banner shown when class Solution: is detected
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, X } from 'lucide-react';
import { useDebuggerStore } from '../../store/debuggerStore';

export function LeetcodeBanner() {
  const { leetcodeSuggestionVisible, toggleLeetcodeMode, dismissLeetcodeSuggestion, isLeetcodeMode } = useDebuggerStore();

  // Don't show if already in LeetCode mode
  if (isLeetcodeMode || !leetcodeSuggestionVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2 }}
        className="flex items-center gap-2 px-4 py-1.5 border-b border-accent/20"
        style={{ background: 'rgba(124, 109, 250, 0.06)' }}
      >
        <Zap size={11} className="text-accent shrink-0" />
        <span className="text-[11px] text-text-muted flex-1">
          Looks like LeetCode code detected
        </span>
        <button
          onClick={() => {
            toggleLeetcodeMode();
          }}
          className="text-[11px] font-medium text-accent hover:text-accent/80 transition-colors px-2 py-0.5 rounded-sm border border-accent/30 hover:border-accent/60"
        >
          Enable LeetCode Mode
        </button>
        <button
          onClick={dismissLeetcodeSuggestion}
          className="text-text-muted hover:text-text-primary transition-colors ml-1"
        >
          <X size={12} />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
