// components/Stack/CallStackPanel.tsx — horizontal card layout for bottom-row
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, ChevronDown } from 'lucide-react';
import { useDebuggerStore } from '../../store/debuggerStore';
import { getShortValue } from '../Variables/VariableCard';

export function CallStackPanel() {
  const { frames, currentFrameIndex } = useDebuggerStore();
  const [expandedFrame, setExpandedFrame] = useState<number | null>(null);

  const frame = frames[currentFrameIndex];

  if (!frame) {
    return (
      <div className="flex flex-col h-full panel">
        <div className="panel-header">
          <Layers size={12} />
          <span>Call Stack</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-text-muted text-sm text-center px-4">No stack frames yet</p>
        </div>
      </div>
    );
  }

  const stack = [...(frame.stack || [])].reverse();

  return (
    <div className="flex flex-col h-full panel overflow-hidden">
      <div className="panel-header">
        <Layers size={12} />
        <span>Call Stack</span>
        <span className="ml-auto text-text-muted text-[10px] font-normal normal-case tracking-normal">
          {stack.length} frame{stack.length !== 1 ? 's' : ''}
        </span>
        {/* Current event badge */}
        {frame && (
          <span className={`text-[9px] px-1.5 py-0.5 rounded-sm font-mono uppercase ml-1
            ${frame.event === 'call' ? 'bg-success/10 text-success' :
              frame.event === 'return' ? 'bg-info/10 text-info' :
              frame.event === 'exception' ? 'bg-error/10 text-error' :
              'bg-accent/10 text-accent'
            }`}>
            {frame.event} · L{frame.line}
          </span>
        )}
      </div>

      {/* Horizontal card list — scrolls horizontally when many frames */}
      <div className="flex-1 overflow-auto p-2">
        {stack.length === 0 ? (
          <div className="text-text-muted text-xs px-2 py-3">Module-level execution</div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <AnimatePresence mode="popLayout">
              {stack.map((sf, idx) => {
                const isActive = idx === 0;
                const isExpanded = expandedFrame === idx;
                const localEntries = Object.entries(sf.locals || {});

                return (
                  <motion.div
                    key={`${sf.function_name}-${idx}`}
                    layout
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.15, delay: idx * 0.03 }}
                    className={`
                      rounded-card border overflow-hidden
                      transition-colors duration-150
                      ${isActive
                        ? 'border-accent/40 bg-accent/5'
                        : 'border-border-subtle bg-bg-elevated hover:border-border-muted'
                      }
                    `}
                  >
                    {/* Horizontal frame header */}
                    <div
                      className="flex items-center gap-3 px-3 py-2 cursor-pointer"
                      onClick={() => setExpandedFrame(isExpanded ? null : idx)}
                    >
                      {/* Active dot */}
                      {isActive && (
                        <div className="w-1.5 h-1.5 rounded-full bg-accent shrink-0 animate-pulse" />
                      )}
                      {/* Depth indicator */}
                      <span className="text-text-muted text-[9px] font-mono shrink-0 w-4 text-right">
                        #{stack.length - 1 - idx}
                      </span>

                      {/* Function name */}
                      <span className={`font-mono text-sm font-medium shrink-0 ${isActive ? 'text-accent' : 'text-text-primary'}`}>
                        {sf.function_name === '<module>' ? '(module)' : `${sf.function_name}()`}
                      </span>

                      {/* Separator */}
                      <span className="text-border-muted text-xs">·</span>

                      {/* File + line */}
                      <span className="text-text-muted text-[11px] font-mono truncate flex-1">
                        {sf.filename} <span className="text-text-secondary">L{sf.line}</span>
                      </span>

                      {/* Locals preview — show first 3 inline */}
                      {localEntries.length > 0 && !isExpanded && (
                        <div className="flex items-center gap-1 shrink-0">
                          {localEntries.slice(0, 3).map(([name, val]) => (
                            <span key={name} className="px-1.5 py-0.5 rounded-sm bg-bg-base border border-border-subtle text-[9px] font-mono text-text-muted">
                              {name}=<span className="text-text-secondary">{getShortValue(val, 0)}</span>
                            </span>
                          ))}
                          {localEntries.length > 3 && (
                            <span className="text-text-muted text-[9px]">+{localEntries.length - 3}</span>
                          )}
                        </div>
                      )}

                      {/* Expand chevron */}
                      {localEntries.length > 0 && (
                        <ChevronDown
                          size={12}
                          className={`text-text-muted shrink-0 transition-transform duration-150 ${isExpanded ? 'rotate-180' : ''}`}
                        />
                      )}
                    </div>

                    {/* Expanded locals grid */}
                    <AnimatePresence>
                      {isExpanded && localEntries.length > 0 && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-border-subtle px-3 py-2">
                            <div className="flex flex-wrap gap-x-4 gap-y-1">
                              {localEntries.map(([name, val]) => (
                                <div key={name} className="flex items-center gap-1.5 text-[11px] font-mono">
                                  <span className="text-text-muted">{name}</span>
                                  <span className="text-text-muted">=</span>
                                  <span className="text-text-primary">{getShortValue(val, 0)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
