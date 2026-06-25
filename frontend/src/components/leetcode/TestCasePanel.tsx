// components/leetcode/TestCasePanel.tsx
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Check, X, AlertCircle, PlaySquare, ChevronRight } from 'lucide-react';
import { useDebuggerStore } from '../../store/debuggerStore';
import type { TestCase } from '../../store/debuggerStore';
import { detectSolutionParams, detectSolutionMethodName } from '../../utils/leetcodeTransformer';

function StatusBadge({ status }: { status: TestCase['status'] }) {
  switch (status) {
    case 'pass':
      return (
        <span className="flex items-center gap-1 text-[10px] font-semibold text-success">
          <Check size={11} /> PASS
        </span>
      );
    case 'fail':
      return (
        <span className="flex items-center gap-1 text-[10px] font-semibold text-error">
          <X size={11} /> FAIL
        </span>
      );
    case 'error':
      return (
        <span className="flex items-center gap-1 text-[10px] font-semibold text-warning">
          <AlertCircle size={11} /> ERROR
        </span>
      );
    default:
      return <span className="text-[10px] text-text-muted">—</span>;
  }
}

function TabIcon({ status }: { status: TestCase['status'] }) {
  switch (status) {
    case 'pass': return <span className="text-success text-[10px]">✓</span>;
    case 'fail': return <span className="text-error text-[10px]">✗</span>;
    case 'error': return <span className="text-warning text-[10px]">!</span>;
    default: return <span className="text-text-muted text-[10px]">●</span>;
  }
}

export function TestCasePanel() {
  const {
    code, testCases, activeTestCaseId,
    addTestCase, removeTestCase, updateTestCase,
    setActiveTestCase,
  } = useDebuggerStore();

  const activeCase = testCases.find(t => t.id === activeTestCaseId) ?? testCases[0];
  const methodName = detectSolutionMethodName(code);
  const suggestedParams = detectSolutionParams(code);

  const handleAutoFill = () => {
    if (!activeCase || suggestedParams.length === 0) return;
    updateTestCase(activeCase.id, {
      params: suggestedParams.map(name => ({
        name,
        value: activeCase.params.find(p => p.name === name)?.value ?? '',
      })),
    });
  };

  const passCount = testCases.filter(t => t.status === 'pass').length;
  const totalRun = testCases.filter(t => t.status !== 'idle').length;

  return (
    <div className="flex flex-col h-full" style={{ background: '#0D0D0F' }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border-subtle" style={{ background: '#141416' }}>
        <PlaySquare size={12} className="text-accent shrink-0" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Test Cases</span>

        {/* Run summary */}
        {totalRun > 0 && (
          <span className="text-[10px] font-mono text-text-muted ml-1">
            {passCount}/{totalRun} passed
          </span>
        )}

        <div className="ml-auto flex items-center gap-1">
          {methodName && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-sm bg-accent/10 text-accent border border-accent/20 font-mono">
              .{methodName}()
            </span>
          )}
          <button
            onClick={addTestCase}
            className="flex items-center gap-1 px-2 py-1 rounded-sm text-[10px] text-text-muted hover:text-text-primary hover:bg-bg-elevated border border-transparent hover:border-border-subtle transition-colors duration-150"
          >
            <Plus size={10} />
            Add
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-2 pt-1.5 pb-0 border-b border-border-subtle overflow-x-auto" style={{ background: '#141416' }}>
        {testCases.map((tc, idx) => (
          <button
            key={tc.id}
            onClick={() => setActiveTestCase(tc.id)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-t-sm text-[11px] font-medium transition-colors duration-150 shrink-0 border-b-2 ${
              tc.id === activeTestCaseId
                ? 'border-accent text-text-primary bg-bg-elevated'
                : 'border-transparent text-text-muted hover:text-text-secondary hover:bg-bg-elevated/50'
            }`}
          >
            <TabIcon status={tc.status} />
            Case {idx + 1}
            {tc.frames.length > 0 && (
              <span className="text-[8px] text-text-muted ml-0.5">({tc.frames.length}f)</span>
            )}
          </button>
        ))}
      </div>



      {/* Active case editor */}
      {activeCase && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">

          {/* Auto-fill suggestion */}
          {suggestedParams.length > 0 && activeCase.params.some(p => !suggestedParams.includes(p.name)) && (
            <button
              onClick={handleAutoFill}
              className="flex items-center gap-1.5 text-[10px] text-accent hover:text-accent/80 transition-colors"
            >
              <ChevronRight size={10} />
              Auto-fill params from {methodName ? `.${methodName}()` : 'method'}
            </button>
          )}

          {/* Input Parameters */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">Input Parameters</span>
              <button
                onClick={() => updateTestCase(activeCase.id, {
                  params: [...activeCase.params, { name: '', value: '' }],
                })}
                className="flex items-center gap-1 text-[9px] text-text-muted hover:text-accent transition-colors"
              >
                <Plus size={9} /> Add Param
              </button>
            </div>

            <div className="space-y-1.5">
              {activeCase.params.map((param, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <input
                    className="w-24 shrink-0 px-2 py-1 rounded-sm bg-bg-elevated border border-border-subtle text-[11px] font-mono text-text-primary focus:border-accent/60 focus:outline-none transition-colors"
                    placeholder="name"
                    value={param.name}
                    onChange={e => {
                      const newParams = [...activeCase.params];
                      newParams[i] = { ...newParams[i], name: e.target.value };
                      updateTestCase(activeCase.id, { params: newParams });
                    }}
                  />
                  <span className="text-text-muted text-[11px] font-mono">=</span>
                  <input
                    className="flex-1 min-w-0 px-2 py-1 rounded-sm bg-bg-elevated border border-border-subtle text-[11px] font-mono text-type-list focus:border-accent/60 focus:outline-none transition-colors"
                    placeholder="[1, 2, 3] or 42 or &quot;str&quot;"
                    value={param.value}
                    onChange={e => {
                      const newParams = [...activeCase.params];
                      newParams[i] = { ...newParams[i], value: e.target.value };
                      updateTestCase(activeCase.id, { params: newParams });
                    }}
                  />
                  {activeCase.params.length > 1 && (
                    <button
                      onClick={() => {
                        const newParams = activeCase.params.filter((_, pi) => pi !== i);
                        updateTestCase(activeCase.id, { params: newParams });
                      }}
                      className="text-text-muted hover:text-error transition-colors shrink-0"
                    >
                      <Trash2 size={10} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Expected Output */}
          <div>
            <span className="text-[10px] uppercase tracking-wider text-text-muted font-semibold block mb-1.5">Expected Output</span>
            <input
              className="w-full px-2 py-1.5 rounded-sm bg-bg-elevated border border-border-subtle text-[11px] font-mono text-text-primary focus:border-accent/60 focus:outline-none transition-colors"
              placeholder="10"
              value={activeCase.expectedOutput}
              onChange={e => updateTestCase(activeCase.id, { expectedOutput: e.target.value })}
            />
          </div>

          {/* Actual Output + Status */}
          <AnimatePresence>
            {activeCase.actualOutput !== null && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="flex items-start gap-4 p-2.5 rounded-card border"
                style={{
                  borderColor: activeCase.status === 'pass' ? '#10B98140' :
                    activeCase.status === 'fail' ? '#F8717140' : '#FBBF2440',
                  background: activeCase.status === 'pass' ? '#10B98108' :
                    activeCase.status === 'fail' ? '#F8717108' : '#FBBF2408',
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[9px] uppercase tracking-wider text-text-muted mb-0.5">Actual Output</div>
                  <div className="font-mono text-[11px] text-text-primary break-all">
                    {activeCase.actualOutput || '(empty)'}
                  </div>
                </div>
                <div className="shrink-0">
                  <StatusBadge status={activeCase.status} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>



          {/* Remove case */}
          {testCases.length > 1 && (
            <div className="pt-1">
              <button
                onClick={() => removeTestCase(activeCase.id)}
                className="flex items-center gap-1 text-[10px] text-text-muted hover:text-error transition-colors"
              >
                <Trash2 size={10} /> Remove this case
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
