// components/Timeline/Timeline.tsx
import { useRef, useCallback, useState, type MouseEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDebuggerStore } from '../../store/debuggerStore';

const EVENT_COLORS: Record<string, string> = {
  line: '#7C6DFA',
  call: '#34D399',
  return: '#60A5FA',
  exception: '#F87171',
};

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  frameIndex: number;
}

export function Timeline() {
  const { frames, currentFrameIndex, setFrameIndex } = useDebuggerStore();
  const trackRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0, frameIndex: 0 });

  const total = frames.length;

  const getFrameIndexFromX = useCallback((clientX: number): number => {
    if (!trackRef.current || total <= 1) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.round(ratio * (total - 1));
  }, [total]);

  const handleMouseMove = useCallback((e: MouseEvent<HTMLElement>) => {
    const idx = getFrameIndexFromX(e.clientX);
    setTooltip({ visible: true, x: e.clientX, y: e.clientY, frameIndex: idx });
  }, [getFrameIndexFromX]);

  const handleMouseLeave = useCallback(() => {
    setTooltip(prev => ({ ...prev, visible: false }));
  }, []);

  const handleClick = useCallback((e: MouseEvent<HTMLElement>) => {
    const idx = getFrameIndexFromX(e.clientX);
    setFrameIndex(idx);
  }, [getFrameIndexFromX, setFrameIndex]);

  const handleMouseDown = useCallback((_e: MouseEvent<HTMLElement>) => {
    const handleMove = (ev: globalThis.MouseEvent) => {
      const idx = getFrameIndexFromX(ev.clientX);
      setFrameIndex(idx);
    };
    const handleUp = () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  }, [getFrameIndexFromX, setFrameIndex]);

  if (total === 0) {
    return (
      <div className="flex items-center px-4 h-10 border-t border-border-subtle bg-bg-surface">
        <span className="text-text-muted text-xs">Run code to see execution timeline</span>
      </div>
    );
  }

  const progress = total > 1 ? currentFrameIndex / (total - 1) : 1;
  const tooltipFrame = frames[tooltip.frameIndex];

  return (
    <div className="flex flex-col px-4 py-2 border-t border-border-subtle bg-bg-surface gap-1">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-text-muted text-[10px] uppercase tracking-wider">Timeline</span>
        <span className="text-text-muted text-[10px] font-mono">
          {total} frames
        </span>
      </div>

      {/* Track */}
      <div
        ref={trackRef}
        className="relative h-7 cursor-pointer flex items-center"
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
      >
        {/* Background track */}
        <div className="absolute inset-x-0 h-1 rounded-full bg-border-subtle" style={{ top: '50%', transform: 'translateY(-50%)' }} />

        {/* Fill */}
        <div
          className="absolute h-1 rounded-full bg-accent transition-all duration-150"
          style={{ left: 0, width: `${progress * 100}%`, top: '50%', transform: 'translateY(-50%)' }}
        />

        {/* Event tick marks */}
        {total <= 200 && frames.map((frame, idx) => {
          const xPct = total > 1 ? (idx / (total - 1)) * 100 : 0;
          const color = EVENT_COLORS[frame.event] || '#7C6DFA';
          return (
            <div
              key={idx}
              className="absolute w-0.5 rounded-full opacity-40 hover:opacity-80"
              style={{
                left: `${xPct}%`,
                top: '50%',
                transform: 'translate(-50%, -50%)',
                height: frame.event === 'call' || frame.event === 'return' ? '10px' : '6px',
                background: color,
              }}
            />
          );
        })}

        {/* Animated thumb */}
        <motion.div
          className="absolute z-10 w-3.5 h-3.5 rounded-full bg-accent border-2 border-bg-base cursor-grab active:cursor-grabbing"
          style={{
            left: `${progress * 100}%`,
            top: '50%',
          }}
          animate={{ left: `${progress * 100}%` }}
          transition={{ type: 'spring', stiffness: 400, damping: 40 }}
          transformTemplate={(_t) => `translate(-50%, -50%)`}
        />
      </div>

      {/* Tooltip */}
      <AnimatePresence>
        {tooltip.visible && tooltipFrame && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.1 }}
            className="fixed z-50 pointer-events-none px-2 py-1 rounded-md bg-bg-elevated border border-border-muted text-xs shadow-card"
            style={{
              left: tooltip.x,
              top: tooltip.y - 36,
              transform: 'translateX(-50%)',
            }}
          >
            <span className="text-text-muted">Frame {tooltip.frameIndex + 1} · </span>
            <span className="text-text-primary">Line {tooltipFrame.line}</span>
            <span className="mx-1 text-border-muted">—</span>
            <span style={{ color: EVENT_COLORS[tooltipFrame.event] }}>{tooltipFrame.event}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
