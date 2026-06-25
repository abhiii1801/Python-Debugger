// App.tsx — Root layout with resizable panels (react-resizable-panels v4)
// The outer vertical split is done manually with flex so the Timeline
// fixed-height strip can sit between the top and bottom resizable sections.
import { Panel, Group, Separator } from 'react-resizable-panels';
import { useRef, useState, useCallback, useEffect } from 'react';
import { Toolbar } from './components/Toolbar/Toolbar';
import { EditorPanel } from './components/Editor/EditorPanel';
import { VariablePanel } from './components/Variables/VariablePanel';
import { CallStackPanel } from './components/Stack/CallStackPanel';
import { Timeline } from './components/Timeline/Timeline';
import { Console } from './components/Console/Console';
import { HeapView } from './components/Heap/HeapView';
import { TestCasePanel } from './components/leetcode/TestCasePanel';
import { LeetcodeBanner } from './components/leetcode/LeetcodeBanner';
import { useDebuggerStore } from './store/debuggerStore';

// ── Vertical drag-to-resize hook ──────────────────────────────────────────────
function useVerticalResize(initialTopPct: number) {
  const [topPct, setTopPct] = useState(initialTopPct); // 0–100
  const containerRef = useRef<HTMLDivElement>(null);

  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const container = containerRef.current;
    if (!container) return;
    const totalH = container.getBoundingClientRect().height;
    const startPct = topPct;

    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientY - startY;
      const newPct = Math.min(85, Math.max(15, startPct + (delta / totalH) * 100));
      setTopPct(newPct);
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [topPct]);

  return { topPct, containerRef, onDragStart };
}

function App() {
  const isLeetcodeMode = useDebuggerStore(s => s.isLeetcodeMode);
  const { topPct, containerRef, onDragStart } = useVerticalResize(63);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const lcParam = params.get('lc');
    
    if (lcParam) {
      try {
        const decoded = JSON.parse(decodeURIComponent(escape(atob(lcParam))));
        
        if (decoded.code) {
          useDebuggerStore.getState().setCode(decoded.code);
        }
        
        if (decoded.leetcodeMode) {
          useDebuggerStore.getState().setLeetcodeMode(true);
        }
        
        if (decoded.testCases && decoded.testCases.length > 0) {
          useDebuggerStore.getState().setTestCasesFromExtension(decoded.testCases);
        }
        
        // Clean URL
        window.history.replaceState({}, '', window.location.pathname);
        
        setTimeout(() => {
          useDebuggerStore.getState().runCode();
        }, 800);
        
      } catch (err) {
        console.error('[Tracer] Failed to parse extension payload:', err);
      }
    }
  }, []);

  return (
    <div className="flex flex-col h-screen bg-bg-base overflow-hidden">
      {/* ── Toolbar ───────────────────────────────────────────────────────────── */}
      <Toolbar />

      {/* ── LeetCode suggestion banner ─────────────────────────────────────────── */}
      <LeetcodeBanner />

      {/* ── Main layout ──────────────────────────────────────────────────────── */}
      <div ref={containerRef} className="flex-1 min-h-0 flex flex-col overflow-hidden">

        {/* ── TOP: Editor | Variables | HeapView ───────────────────────────── */}
        <div style={{ height: `${topPct}%`, minHeight: 0, overflow: 'hidden', padding: '8px 8px 0 8px' }}>
          <Group orientation="horizontal" style={{ height: '100%' }}>

            <Panel defaultSize={35} minSize={15}>
              <EditorPanel />
            </Panel>

            <Separator className="resize-handle-horizontal" />

            <Panel defaultSize={30} minSize={15}>
              <VariablePanel />
            </Panel>

            <Separator className="resize-handle-horizontal" />

            <Panel defaultSize={35} minSize={15}>
              <HeapView />
            </Panel>

          </Group>
        </div>

        {/* ── TIMELINE — fixed height, not resizable ────────────────────────── */}
        <div style={{ flexShrink: 0, padding: '0 8px' }}>
          <Timeline />
        </div>

        {/* ── VERTICAL RESIZE HANDLE ────────────────────────────────────────── */}
        <div
          onMouseDown={onDragStart}
          className="resize-handle-vertical"
          style={{ flexShrink: 0 }}
          title="Drag to resize"
        />

        {/* ── BOTTOM: Console | CallStack or TestCases ─────────────────────── */}
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', padding: '4px 8px 8px 8px' }}>
          <Group orientation="horizontal" style={{ height: '100%' }}>

            <Panel defaultSize={40} minSize={15}>
              <div className="h-full panel overflow-hidden">
                <Console />
              </div>
            </Panel>

            <Separator className="resize-handle-horizontal" />

            <Panel defaultSize={60} minSize={20}>
              {isLeetcodeMode ? <TestCasePanel /> : <CallStackPanel />}
            </Panel>

          </Group>
        </div>

      </div>
    </div>
  );
}

export default App;
