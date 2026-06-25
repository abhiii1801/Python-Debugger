// components/Variables/VariableHistory.tsx
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp } from 'lucide-react';
import { useDebuggerStore } from '../../store/debuggerStore';
import { getShortValue } from './VariableCard';
import type { AnyDescriptor } from '../../types/debugger';

interface VariableHistoryProps {
  variableName: string | null;
  onClose: () => void;
}

export function VariableHistory({ variableName, onClose }: VariableHistoryProps) {
  const { frames } = useDebuggerStore();

  if (!variableName) return null;

  // Collect history of this variable across all frames
  const history: Array<{ frameIndex: number; line: number; event: string; value: AnyDescriptor }> = [];
  let prevValueStr = '';

  frames.forEach((frame, idx) => {
    const val = frame.locals[variableName] ?? frame.globals[variableName];
    if (val !== undefined) {
      const valStr = getShortValue(val);
      if (idx === 0 || valStr !== prevValueStr) {
        history.push({
          frameIndex: idx,
          line: frame.line,
          event: frame.event,
          value: val,
        });
        prevValueStr = valStr;
      }
    }
  });

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center"
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="relative z-10 w-full max-w-md mx-4 panel shadow-card max-h-[70vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="panel-header border-b border-border-subtle px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp size={13} className="text-accent" />
              <span className="text-text-primary font-semibold normal-case tracking-normal text-sm font-mono">
                {variableName}
              </span>
              <span className="text-text-muted text-xs font-normal normal-case tracking-normal">history</span>
            </div>
            <button
              onClick={onClose}
              className="text-text-muted hover:text-text-primary transition-colors duration-150"
            >
              <X size={14} />
            </button>
          </div>

          {/* History list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {history.length === 0 ? (
              <p className="text-text-muted text-sm text-center py-6">
                Variable not found in any frame
              </p>
            ) : (
              history.map((entry, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="flex items-center gap-3 p-2 rounded-sm hover:bg-bg-elevated transition-colors duration-100"
                >
                  {/* Frame indicator */}
                  <div className="text-right w-20 shrink-0">
                    <div className="text-[10px] text-text-muted font-mono">Frame {entry.frameIndex + 1}</div>
                    <div className="text-[10px] text-text-muted">Line {entry.line}</div>
                  </div>

                  {/* Event badge */}
                  <div className="w-16 shrink-0">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-sm font-mono uppercase
                      ${entry.event === 'call' ? 'bg-success/10 text-success' :
                        entry.event === 'return' ? 'bg-info/10 text-info' :
                        entry.event === 'exception' ? 'bg-error/10 text-error' :
                        'bg-accent/10 text-accent'
                      }`}>
                      {entry.event}
                    </span>
                  </div>

                  {/* Value */}
                  <div className="flex-1 font-mono text-sm text-text-primary break-all pr-2">
                    {getShortValue(entry.value)}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
