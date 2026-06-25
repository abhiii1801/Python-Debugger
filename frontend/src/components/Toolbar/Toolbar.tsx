// components/Toolbar/Toolbar.tsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, SkipBack, SkipForward, RotateCcw,
  Zap, AlertCircle, Clock, PlaySquare, X
} from 'lucide-react';
import { useDebuggerStore } from '../../store/debuggerStore';

/** Warning dialog shown when LeetCode mode Run is clicked with no params filled */
function NoParamsWarning({ onClose }: { onClose: () => void }) {
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 8 }}
          transition={{ duration: 0.18 }}
          onClick={e => e.stopPropagation()}
          className="relative z-10 w-[360px] rounded-xl border border-border-muted bg-bg-elevated shadow-2xl p-6 flex flex-col items-center gap-4"
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-text-muted hover:text-text-primary transition-colors"
          >
            <X size={14} />
          </button>
          <div className="w-10 h-10 rounded-full bg-accent/15 flex items-center justify-center">
            <Zap size={20} className="text-accent" />
          </div>
          <div className="text-center">
            <h3 className="text-text-primary font-semibold text-sm mb-2">Add Test Case Parameters</h3>
            <p className="text-text-muted text-xs leading-relaxed">
              LeetCode mode requires at least one input parameter to run.
              <br /><br />
              Go to the <strong className="text-text-secondary">Test Cases panel</strong> and fill
              in your input parameters, then click Run Test again.
            </p>
          </div>
          <button
            onClick={onClose}
            className="btn btn-primary w-full justify-center"
          >
            OK, Got It
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export function Toolbar() {
  const [toastError, setToastError] = useState<string | null>(null);
  const {
    frames,
    currentFrameIndex,
    isPlaying,
    isLoading,
    error,
    astInfo,
    executionTimeMs,
    isLeetcodeMode,
    showNoParamsWarning,
    runCode,
    nextFrame,
    prevFrame,
    play,
    pause,
    restart,
    toggleLeetcodeMode,
    runActiveTestCase,
    runAllTestCases,
    dismissNoParamsWarning,
  } = useDebuggerStore();

  const hasFrames = frames.length > 0;
  const currentFrame = frames[currentFrameIndex];
  const isAtEnd = currentFrameIndex >= frames.length - 1;
  const isAtStart = currentFrameIndex === 0;

  useEffect(() => {
    if (error?.type === 'NetworkError' || error?.message?.includes('Cannot reach the server') || error?.message?.includes('Request timed out') || error?.message?.includes('Too many requests')) {
      setToastError(error.message);
      const timer = setTimeout(() => setToastError(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  return (
    <>
      {/* No-params warning dialog */}
      {showNoParamsWarning && <NoParamsWarning onClose={dismissNoParamsWarning} />}

      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border-subtle bg-bg-surface select-none flex-wrap">
        {/* Logo/Title */}
        <div className="flex items-center gap-2 mr-3">
          <img src="/logo.svg" alt="Tracer" className="w-7 h-7" />
          <span className="font-semibold text-sm text-white tracking-tight">Tracer</span>
        </div>

        <div className="w-px h-5 bg-border-subtle mx-1" />

        {/* ── Run buttons — different in normal vs LeetCode mode ── */}
        {isLeetcodeMode ? (
          <>
            {/* Run Test (active case only) */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              className={`btn ${isLoading ? 'btn-ghost' : 'btn-primary'}`}
              onClick={runActiveTestCase}
              disabled={isLoading}
              title="Run the active test case"
            >
              {isLoading ? (
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                  <Zap size={14} />
                </motion.div>
              ) : (
                <Play size={14} fill="currentColor" />
              )}
              {isLoading ? 'Running…' : 'Run Test'}
            </motion.button>

            {/* Run All */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              className="btn btn-ghost"
              onClick={() => runAllTestCases()}
              disabled={isLoading}
              title="Run all test cases sequentially"
            >
              <PlaySquare size={14} />
              Run All
            </motion.button>
          </>
        ) : (
          /* Normal mode: single Run / Re-run button */
          <motion.button
            whileTap={{ scale: 0.95 }}
            className={`btn ${isLoading ? 'btn-ghost' : 'btn-primary'}`}
            onClick={() => runCode()}
            disabled={isLoading}
            title="Run code (executes and loads all frames)"
          >
            {isLoading ? (
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                <Zap size={14} />
              </motion.div>
            ) : (
              <Play size={14} fill="currentColor" />
            )}
            {isLoading ? 'Running…' : hasFrames ? 'Re-run' : 'Run'}
          </motion.button>
        )}

        {/* Restart */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          className="btn btn-ghost"
          onClick={restart}
          disabled={!hasFrames}
          title="Jump to first frame"
        >
          <RotateCcw size={14} />
          Restart
        </motion.button>

        <div className="w-px h-5 bg-border-subtle mx-1" />

        {/* Prev */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          className="btn btn-ghost"
          onClick={prevFrame}
          disabled={!hasFrames || isAtStart || isPlaying}
          title="Previous frame"
        >
          <SkipBack size={14} />
        </motion.button>

        {/* Play / Pause */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          className={`btn ${isPlaying ? 'btn-ghost' : 'btn-accent'}`}
          onClick={() => isPlaying ? pause() : play()}
          disabled={!hasFrames}
          title={isPlaying ? 'Pause playback' : 'Play all frames'}
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
          {isPlaying ? 'Pause' : 'Play'}
        </motion.button>

        {/* Next */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          className="btn btn-ghost"
          onClick={nextFrame}
          disabled={!hasFrames || isAtEnd || isPlaying}
          title="Next frame"
        >
          <SkipForward size={14} />
        </motion.button>

        <div className="w-px h-5 bg-border-subtle mx-1" />

        {/* Frame counter */}
        {hasFrames && (
          <div className="flex items-center gap-2 text-text-muted text-xs font-mono">
            <span className="text-text-secondary font-medium">
              Frame{' '}
              <span className="text-accent font-bold">{currentFrameIndex + 1}</span>
              {' '}/{' '}{frames.length}
            </span>
            {currentFrame && (
              <span className="px-2 py-0.5 rounded-sm bg-bg-elevated text-text-muted text-[10px] uppercase tracking-wide">
                {currentFrame.event} · L{currentFrame.line}
              </span>
            )}
          </div>
        )}

        {/* Execution time */}
        {executionTimeMs !== null && (
          <div className="flex items-center gap-1 text-text-muted text-xs">
            <Clock size={11} />
            <span>{executionTimeMs.toFixed(1)}ms</span>
          </div>
        )}

        {/* Error indicator */}
        {error && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-error/10 border border-error/30 text-error text-xs"
          >
            <AlertCircle size={12} />
            <span className="font-medium">{error.type}:</span>
            <span className="text-error/80 truncate max-w-[240px]">{error.message}</span>
            {error.line && <span className="text-error/60">line {error.line}</span>}
          </motion.div>
        )}

        {/* AST Info badges */}
        {astInfo && (
          <div className="flex items-center gap-1.5">
            {astInfo.has_classes && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-type-instance/10 text-type-instance border border-type-instance/20">
                Classes
              </span>
            )}
            {astInfo.has_functions && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-type-func/10 text-type-func border border-type-func/20">
                Functions
              </span>
            )}
            {astInfo.has_loops && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-accent/10 text-accent border border-accent/20">
                Loops
              </span>
            )}
            {astInfo.has_recursion && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-warning/10 text-warning border border-warning/20">
                Recursive
              </span>
            )}
          </div>
        )}

        {/* ── LeetCode Mode Toggle ─────────────────────────────── */}
        <div className="ml-auto flex items-center gap-2">
          <div className="w-px h-5 bg-border-subtle" />
          <span className="text-[11px] text-text-muted flex items-center gap-1">
            <Zap size={11} className={isLeetcodeMode ? 'text-accent' : 'text-text-muted'} />
            LeetCode
          </span>
          <button
            onClick={toggleLeetcodeMode}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 focus:outline-none ${
              isLeetcodeMode ? 'bg-accent border-accent' : 'bg-bg-elevated border-border-muted'
            }`}
            role="switch"
            aria-checked={isLeetcodeMode}
            title="Toggle LeetCode Mode"
          >
            <span
              className={`pointer-events-none inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm mt-px transition-transform duration-200 ${
                isLeetcodeMode ? 'translate-x-4' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Error Toast */}
      <div className="relative z-40">
        <AnimatePresence>
          {toastError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="w-full bg-[#FBBF24]/10 border-b border-[#FBBF24]/50 text-[#FBBF24] overflow-hidden"
            >
              <div className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium">
                <AlertCircle size={16} />
                {toastError}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
