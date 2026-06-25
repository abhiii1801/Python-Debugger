// components/Variables/VariablePanel.tsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Variable, Globe, ChevronDown, ChevronRight, Eye, Columns, Square, EyeOff } from 'lucide-react';
import { useDebuggerStore } from '../../store/debuggerStore';
import { VariableCard } from './VariableCard';
import { VariableHistory } from './VariableHistory';
import type { AnyDescriptor } from '../../types/debugger';

// Frontend safety layer: filter typing module internals
const TYPING_CLASS_NAMES = new Set([
  '_SpecialGenericAlias', '_GenericAlias', '_SpecialForm',
  '_TupleType', '_UnionGenericAlias', '_LiteralGenericAlias',
  '_AnnotatedAlias', '_BaseGenericAlias', 'ABCMeta',
  '_CallableGenericAlias', '_CallableType',
]);

function isTypingInternal(descriptor: AnyDescriptor | undefined): boolean {
  if (!descriptor) return false;
  if ((descriptor as any).type === '_typing_internal') return true;
  if (descriptor.type === 'instance') {
    const cn = (descriptor as any).class_name as string;
    if (TYPING_CLASS_NAMES.has(cn)) return true;
    // Heuristic: internal class starting with underscore + no meaningful attributes
    if (cn.startsWith('_') && Object.keys((descriptor as any).attributes ?? {}).length === 0) return true;
  }
  if (descriptor.type === 'class') {
    const n = (descriptor as any).name as string;
    if (TYPING_CLASS_NAMES.has(n)) return true;
  }
  return false;
}

export function VariablePanel() {
  const { 
    frames, 
    currentFrameIndex, 
    hiddenVariables, 
    hideHeapVariables, 
    variableColumns,
    toggleVariableVisibility,
    unhideAllVariables,
    toggleHideHeapVariables,
    setVariableColumns
  } = useDebuggerStore();
  
  const [selectedVar, setSelectedVar] = useState<string | null>(null);
  const [showGlobals, setShowGlobals] = useState(false);

  const frame = frames[currentFrameIndex];

  if (!frame) {
    return (
      <div className="flex flex-col h-full panel">
        <div className="panel-header">
          <Variable size={12} />
          <span>Variables</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-text-muted text-sm text-center px-4">
            Run your code to see variable values at each step
          </p>
        </div>
      </div>
    );
  }

  const locals = frame.locals || {};
  const globals = frame.globals || {};
  const changedVars = new Set(frame.changed_vars || []);
  
  // Set of all object IDs present in the heap
  const heapObjectIds = new Set(
    (frame.heap || [])
      .map(obj => (obj as any).id)
      .filter(id => id && id.startsWith('obj_'))
  );

  const localEntries = Object.entries(locals)
    .filter(([, d]) => !isTypingInternal(d))
    .filter(([name]) => !hiddenVariables.has(name))
    .filter(([, d]) => !hideHeapVariables || !heapObjectIds.has((d as any).id));

  const globalEntries = Object.entries(globals)
    .filter(([k]) => !Object.keys(locals).includes(k))
    .filter(([, d]) => !isTypingInternal(d))
    .filter(([name]) => !hiddenVariables.has(name))
    .filter(([, d]) => !hideHeapVariables || !heapObjectIds.has((d as any).id));

  const layoutClass = variableColumns === 2 
    ? "grid grid-cols-2 gap-2" 
    : "flex flex-col space-y-1.5";

  return (
    <>
      <div className="flex flex-col h-full panel overflow-hidden">
        <div className="panel-header">
          <Variable size={12} />
          <span>Variables</span>
          
          <div className="ml-auto flex items-center gap-1.5">
            {/* Columns Toggle */}
            <div className="flex items-center bg-bg-elevated rounded-sm border border-border-subtle p-0.5">
              <button
                onClick={() => setVariableColumns(1)}
                className={`p-1 rounded-sm transition-colors ${variableColumns === 1 ? 'bg-accent/20 text-accent' : 'text-text-muted hover:text-text-primary'}`}
                title="1 Column Layout"
              >
                <Square size={10} />
              </button>
              <button
                onClick={() => setVariableColumns(2)}
                className={`p-1 rounded-sm transition-colors ${variableColumns === 2 ? 'bg-accent/20 text-accent' : 'text-text-muted hover:text-text-primary'}`}
                title="2 Column Layout"
              >
                <Columns size={10} />
              </button>
            </div>
            
            {/* Hide Heap Variables Toggle */}
            <button
              onClick={toggleHideHeapVariables}
              className={`flex items-center gap-1 px-1.5 py-1 rounded-sm border text-[9px] font-medium transition-colors ${
                hideHeapVariables 
                  ? 'bg-accent/20 border-accent/40 text-accent' 
                  : 'bg-bg-elevated border-border-subtle text-text-muted hover:text-text-primary'
              }`}
              title="Hide variables that are already visible in the Heap Graph"
            >
              {hideHeapVariables ? <EyeOff size={10} /> : <Eye size={10} />}
              <span className="hidden sm:inline">Heap Refs</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {/* Locals section */}
          {localEntries.length > 0 ? (
            <>
              <div className="flex items-center justify-between px-1 pt-1 mb-1.5">
                <div className="text-[10px] uppercase tracking-wider text-text-muted">
                  Local Variables
                </div>
                <span className="text-text-muted text-[10px] font-mono">
                  {localEntries.length} items
                </span>
              </div>
              <motion.div layout className={layoutClass}>
                <AnimatePresence mode="popLayout">
                  {localEntries.map(([name, descriptor]) => (
                    <VariableCard
                      key={name}
                      name={name}
                      descriptor={descriptor}
                      isChanged={changedVars.has(name)}
                      onClick={() => setSelectedVar(name)}
                      onHide={() => toggleVariableVisibility(name)}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            </>
          ) : (
            <div className="text-text-muted text-xs px-2 py-3">No local variables</div>
          )}

          {/* Globals section (collapsible) */}
          {globalEntries.length > 0 && (
            <div className="mt-2">
              <button
                className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-text-muted px-1 py-1 w-full hover:text-text-secondary transition-colors duration-150"
                onClick={() => setShowGlobals(!showGlobals)}
              >
                {showGlobals ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                <Globe size={10} />
                <span>Globals ({globalEntries.length})</span>
              </button>
              <AnimatePresence>
                {showGlobals && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <motion.div layout className={`${layoutClass} pt-1.5`}>
                      <AnimatePresence mode="popLayout">
                        {globalEntries.map(([name, descriptor]) => (
                          <VariableCard
                            key={name}
                            name={name}
                            descriptor={descriptor}
                            isChanged={changedVars.has(name)}
                            onClick={() => setSelectedVar(name)}
                            onHide={() => toggleVariableVisibility(name)}
                          />
                        ))}
                      </AnimatePresence>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Return value */}
          {frame.return_value && (
            <div className="mt-2">
              <div className="text-[10px] uppercase tracking-wider text-text-muted px-1 pt-1">
                Return Value
              </div>
              <VariableCard
                name="(return)"
                descriptor={frame.return_value}
                isChanged={false}
                onClick={() => {}}
              />
            </div>
          )}

          {/* Exception */}
          {frame.exception && (
            <div className="mt-2 p-3 rounded-card border border-error/30 bg-error/5">
              <div className="text-error text-xs font-semibold mb-1">
                ⚠ {frame.exception.type}
              </div>
              <div className="text-error/80 text-xs font-mono">{frame.exception.message}</div>
            </div>
          )}
          
          {/* Hidden Variables Restorer */}
          {hiddenVariables.size > 0 && (
            <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between px-1">
              <span className="text-[10px] text-text-muted">
                {hiddenVariables.size} hidden variable{hiddenVariables.size !== 1 ? 's' : ''}
              </span>
              <button
                onClick={unhideAllVariables}
                className="text-[10px] text-accent hover:text-accent/80 transition-colors flex items-center gap-1"
              >
                <Eye size={10} /> Restore All
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Variable History Modal */}
      {selectedVar && (
        <VariableHistory
          variableName={selectedVar}
          onClose={() => setSelectedVar(null)}
        />
      )}
    </>
  );
}
