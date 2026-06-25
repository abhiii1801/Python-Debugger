// components/Console/Console.tsx
import { useRef, useEffect, useState } from 'react';
import { Terminal, AlertTriangle } from 'lucide-react';
import { useDebuggerStore } from '../../store/debuggerStore';

export function Console() {
  const { frames, currentFrameIndex } = useDebuggerStore();
  const stdoutRef = useRef<HTMLDivElement>(null);
  const stderrRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'stdout' | 'stderr'>('stdout');

  const frame = frames[currentFrameIndex];
  const stdout = frame?.stdout ?? '';
  const stderr = frame?.stderr ?? '';

  // Auto-scroll
  useEffect(() => {
    if (activeTab === 'stdout' && stdoutRef.current) {
      stdoutRef.current.scrollTop = stdoutRef.current.scrollHeight;
    }
    if (activeTab === 'stderr' && stderrRef.current) {
      stderrRef.current.scrollTop = stderrRef.current.scrollHeight;
    }
  }, [stdout, stderr, activeTab]);

  const hasStdout = stdout.trim().length > 0;
  const hasStderr = stderr.trim().length > 0;

  return (
    <div className="flex flex-col h-full" style={{ background: '#0A0A0C' }}>
      {/* Header + tabs */}
      <div className="flex items-center border-b border-border-subtle px-3 py-1.5" style={{ background: '#141416' }}>
        <Terminal size={12} className="text-text-muted mr-2" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mr-4">Console</span>

        {/* Tabs */}
        <div className="flex gap-1">
          <button
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-medium transition-colors duration-150 ${
              activeTab === 'stdout'
                ? 'bg-success/10 text-success'
                : 'text-text-muted hover:text-text-secondary'
            }`}
            onClick={() => setActiveTab('stdout')}
          >
            stdout
            {hasStdout && (
              <div className="w-1.5 h-1.5 rounded-full bg-success opacity-80" />
            )}
          </button>
          <button
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-medium transition-colors duration-150 ${
              activeTab === 'stderr'
                ? 'bg-error/10 text-error'
                : 'text-text-muted hover:text-text-secondary'
            }`}
            onClick={() => setActiveTab('stderr')}
          >
            stderr
            {hasStderr && (
              <div className="w-1.5 h-1.5 rounded-full bg-error" />
            )}
          </button>
        </div>
      </div>

      {/* Output */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'stdout' && (
          <div
            ref={stdoutRef}
            className="h-full overflow-y-auto p-3"
            style={{ background: '#0A0A0C' }}
          >
            {hasStdout ? (
              <pre className="font-mono text-xs leading-relaxed whitespace-pre-wrap" style={{ color: '#34D399' }}>
                {stdout}
              </pre>
            ) : (
              <div className="text-text-muted text-xs flex items-center gap-2 h-full justify-center">
                <Terminal size={14} />
                <span>No stdout output</span>
              </div>
            )}
          </div>
        )}

        {activeTab === 'stderr' && (
          <div
            ref={stderrRef}
            className="h-full overflow-y-auto p-3"
            style={{ background: '#0A0A0C' }}
          >
            {hasStderr ? (
              <pre className="font-mono text-xs leading-relaxed whitespace-pre-wrap" style={{ color: '#F87171' }}>
                {stderr}
              </pre>
            ) : (
              <div className="text-text-muted text-xs flex items-center gap-2 h-full justify-center">
                <AlertTriangle size={14} />
                <span>No stderr output</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
