// components/Editor/EditorPanel.tsx
import { useRef, useCallback, useEffect } from 'react';
import Editor, { type Monaco, type OnMount } from '@monaco-editor/react';
import type * as monaco from 'monaco-editor';
import { useDebuggerStore } from '../../store/debuggerStore';
import { Code2 } from 'lucide-react';

export function EditorPanel() {
  const {
    code,
    setCode,
    isLoading,
    frames,
    currentFrameIndex,
    breakpoints,
  } = useDebuggerStore();

  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const decorationsRef = useRef<monaco.editor.IEditorDecorationsCollection | null>(null);

  const currentLine = frames[currentFrameIndex]?.line ?? null;

  const handleEditorMount: OnMount = useCallback((editor, monacoInstance) => {
    editorRef.current = editor;
    monacoRef.current = monacoInstance;

    // Create decorations collection
    decorationsRef.current = editor.createDecorationsCollection([]);

    // Click gutter to toggle breakpoints
    editor.onMouseDown((e) => {
      if (
        e.target.type === monacoInstance.editor.MouseTargetType.GUTTER_GLYPH_MARGIN ||
        e.target.type === monacoInstance.editor.MouseTargetType.GUTTER_LINE_NUMBERS
      ) {
        const line = e.target.position?.lineNumber;
        if (line) {
          useDebuggerStore.getState().toggleBreakpoint(line);
        }
      }
    });

    // Register Python language token colors
    monacoInstance.editor.defineTheme('tracer-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '7C6DFA', fontStyle: 'bold' },
        { token: 'string', foreground: 'FBBF24' },
        { token: 'number', foreground: '60A5FA' },
        { token: 'comment', foreground: '4B5563', fontStyle: 'italic' },
        { token: 'type', foreground: '34D399' },
        { token: 'function', foreground: 'A78BFA' },
      ],
      colors: {
        'editor.background': '#141416',
        'editor.foreground': '#E4E4E7',
        'editor.lineHighlightBackground': '#1A1A1E',
        'editorLineNumber.foreground': '#3A3A44',
        'editorLineNumber.activeForeground': '#71717A',
        'editor.selectionBackground': '#7C6DFA33',
        'editor.inactiveSelectionBackground': '#7C6DFA22',
        'editorGutter.background': '#141416',
        'editorCursor.foreground': '#7C6DFA',
        'editorIndentGuide.background': '#1E1E22',
        'editorIndentGuide.activeBackground': '#2A2A30',
        'scrollbarSlider.background': '#2A2A3066',
        'scrollbarSlider.hoverBackground': '#3A3A4488',
        'scrollbarSlider.activeBackground': '#4A4A5488',
      },
    });
    monacoInstance.editor.setTheme('tracer-dark');
  }, []);

  // Update decorations whenever currentLine or breakpoints change
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current || !decorationsRef.current) return;
    const monacoInstance = monacoRef.current;

    const newDecorations: monaco.editor.IModelDecoration[] = [];

    // Current execution line highlight
    if (currentLine !== null) {
      newDecorations.push({
        id: `current-line-${currentLine}`,
        ownerId: 0,
        range: new monacoInstance.Range(currentLine, 1, currentLine, 1),
        options: {
          isWholeLine: true,
          className: 'current-execution-line',
          glyphMarginClassName: 'execution-arrow-glyph',
          overviewRuler: {
            color: '#FBBF24',
            position: monacoInstance.editor.OverviewRulerLane.Left,
          },
        },
      });
    }

    // Breakpoints
    breakpoints.forEach((line) => {
      newDecorations.push({
        id: `bp-${line}`,
        ownerId: 0,
        range: new monacoInstance.Range(line, 1, line, 1),
        options: {
          isWholeLine: false,
          glyphMarginClassName: 'breakpoint-glyph',
          overviewRuler: {
            color: '#F87171',
            position: monacoInstance.editor.OverviewRulerLane.Right,
          },
        },
      });
    });

    decorationsRef.current.set(newDecorations);

    // Reveal current line
    if (currentLine !== null) {
      editorRef.current.revealLineInCenterIfOutsideViewport(currentLine);
    }
  }, [currentLine, breakpoints]);

  return (
    <div className="flex flex-col h-full panel">
      <div className="panel-header">
        <Code2 size={12} />
        <span>Editor</span>
        {isLoading && (
          <span className="ml-auto text-warning text-[10px] font-normal normal-case tracking-normal">
            Executing…
          </span>
        )}
        {!isLoading && frames.length > 0 && (
          <span className="ml-auto text-text-muted text-[10px] font-normal normal-case tracking-normal">
            Click gutter to set breakpoints
          </span>
        )}
      </div>

      <style>{`
        .current-execution-line {
          background: rgba(251, 191, 36, 0.08) !important;
          border-left: 2px solid #FBBF24 !important;
        }
        .execution-arrow-glyph::before {
          content: '▶';
          color: #FBBF24;
          font-size: 11px;
          line-height: 18px;
          display: block;
          text-align: center;
        }
        .breakpoint-glyph::before {
          content: '●';
          color: #F87171;
          font-size: 13px;
          line-height: 18px;
          display: block;
          text-align: center;
        }
      `}</style>

      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          defaultLanguage="python"
          value={code}
          onChange={(val) => setCode(val ?? '')}
          onMount={handleEditorMount}
          options={{
            fontFamily: '"JetBrains Mono", "Fira Code", monospace',
            fontSize: 14,
            lineHeight: 22,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            readOnly: isLoading,
            wordWrap: 'on',
            glyphMargin: true,
            lineNumbers: 'on',
            folding: false,
            renderLineHighlight: 'all',
            cursorBlinking: 'smooth',
            smoothScrolling: true,
            automaticLayout: true,
            padding: { top: 12, bottom: 12 },
            overviewRulerLanes: 2,
            scrollbar: {
              verticalScrollbarSize: 6,
              horizontalScrollbarSize: 6,
            },
          }}
        />
      </div>
    </div>
  );
}
