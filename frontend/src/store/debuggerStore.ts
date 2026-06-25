// store/debuggerStore.ts — Zustand store for the Python Visual Debugger
import { create } from 'zustand';
import { runCode as apiRunCode } from '../api/debuggerApi';
import type { ExecutionFrame, AstInfo, ApiError } from '../types/debugger';
import { transformLeetcodeCode } from '../utils/leetcodeTransformer';
import { extractParamsFromCode } from '../utils/paramExtractor';

const DEFAULT_CODE = `class Person:
    def __init__(self, name, age):
        self.name = name
        self.age = age

def greet(person):
    message = f"Hello, {person.name}!"
    return message

people = []
for i in range(3):
    p = Person(f"User{i}", 20 + i)
    people.append(p)

result = greet(people[0])
print(result)
`;

export interface TestCaseParam {
  name: string;
  value: string; // raw Python literal string
}

export interface TestCase {
  id: string;
  params: TestCaseParam[];
  expectedOutput: string;
  actualOutput: string | null;
  status: 'idle' | 'pass' | 'fail' | 'error';
  // Per-test-case execution data (populated after run)
  frames: ExecutionFrame[];
  astInfo: AstInfo | null;
  executionTimeMs: number;
}

function makeDefaultTestCase(params?: TestCaseParam[]): TestCase {
  return {
    id: crypto.randomUUID(),
    params: params ?? [{ name: 'param1', value: '' }],
    expectedOutput: '',
    actualOutput: null,
    status: 'idle',
    frames: [],
    astInfo: null,
    executionTimeMs: 0,
  };
}

export interface DebuggerState {
  // Execution data (reflects whatever test case / run is active)
  code: string;
  frames: ExecutionFrame[];
  currentFrameIndex: number;
  isPlaying: boolean;
  playSpeed: number;
  isLoading: boolean;
  error: ApiError | null;
  astInfo: AstInfo | null;
  executionTimeMs: number | null;
  breakpoints: Set<number>;
  _playInterval: ReturnType<typeof setInterval> | null;

  // LeetCode mode
  isLeetcodeMode: boolean;
  leetcodeSuggestionVisible: boolean;
  testCases: TestCase[];
  activeTestCaseId: string;
  // UI state for "no params" warning dialog
  showNoParamsWarning: boolean;

  // Variables panel UI state
  hiddenVariables: Set<string>;
  hideHeapVariables: boolean;
  variableColumns: 1 | 2;

  // Core actions
  setCode: (code: string) => void;
  runCode: (overrideCode?: string) => Promise<void>;
  setFrameIndex: (i: number) => void;
  nextFrame: () => void;
  prevFrame: () => void;
  play: () => void;
  pause: () => void;
  restart: () => void;
  toggleBreakpoint: (line: number) => void;

  // Variables panel actions
  toggleVariableVisibility: (name: string) => void;
  unhideAllVariables: () => void;
  toggleHideHeapVariables: () => void;
  setVariableColumns: (cols: 1 | 2) => void;

  // LeetCode actions
  toggleLeetcodeMode: () => void;
  dismissLeetcodeSuggestion: () => void;
  dismissNoParamsWarning: () => void;
  addTestCase: () => void;
  removeTestCase: (id: string) => void;
  updateTestCase: (id: string, updates: Partial<TestCase>) => void;
  setActiveTestCase: (id: string) => void;
  runActiveTestCase: () => Promise<void>;
  runTestCase: (id: string) => Promise<void>;
  runAllTestCases: () => Promise<void>;
}

const defaultTestCase = makeDefaultTestCase();

export const useDebuggerStore = create<DebuggerState>((set, get) => ({
  code: DEFAULT_CODE,
  frames: [],
  currentFrameIndex: 0,
  isPlaying: false,
  playSpeed: 500,
  isLoading: false,
  error: null,
  astInfo: null,
  executionTimeMs: null,
  breakpoints: new Set<number>(),
  _playInterval: null,

  // Variables panel UI defaults
  hiddenVariables: new Set<string>(),
  hideHeapVariables: true,
  variableColumns: 2,

  // LeetCode defaults
  isLeetcodeMode: false,
  leetcodeSuggestionVisible: false,
  testCases: [defaultTestCase],
  activeTestCaseId: defaultTestCase.id,
  showNoParamsWarning: false,

  // ── Core actions ──────────────────────────────────────────────────────────────

  setCode: (code) => {
    set({ code });
    const { isLeetcodeMode, leetcodeSuggestionVisible, testCases } = get();
    // Show LeetCode suggestion banner
    if (!isLeetcodeMode && !leetcodeSuggestionVisible && /class\s+Solution\s*:/m.test(code)) {
      set({ leetcodeSuggestionVisible: true });
    }
    // In LeetCode mode, auto-update param NAMES in existing test cases when code changes
    if (isLeetcodeMode) {
      const detectedParams = extractParamsFromCode(code);
      if (detectedParams.length > 0) {
        const updatedCases = testCases.map(tc => ({
          ...tc,
          params: detectedParams.map((p, i) => ({
            name: p.name,
            // Preserve existing values by matching by position
            value: tc.params[i]?.value ?? '',
          })),
        }));
        set({ testCases: updatedCases });
      }
    }
  },

  runCode: async (overrideCode?: string) => {
    const { code, _playInterval } = get();
    const codeToRun = overrideCode ?? code;
    if (_playInterval) clearInterval(_playInterval);
    set({ isLoading: true, error: null, frames: [], currentFrameIndex: 0, isPlaying: false, _playInterval: null });
    try {
      const response = await apiRunCode(codeToRun);
      if (response.error) {
        set({
          error: response.error,
          frames: [],
          astInfo: response.ast_info,
          isLoading: false,
          executionTimeMs: response.execution_time_ms,
        });
      } else {
        set({
          frames: response.frames,
          astInfo: response.ast_info,
          currentFrameIndex: 0,
          error: null,
          isLoading: false,
          executionTimeMs: response.execution_time_ms,
        });
      }
    } catch (err: any) {
      set({
        error: {
          type: 'NetworkError',
          message: err?.message || 'Failed to connect to the backend. Is it running on port 8000?',
          line: null,
        },
        isLoading: false,
      });
    }
  },

  setFrameIndex: (i) => {
    const { frames } = get();
    const clamped = Math.max(0, Math.min(i, frames.length - 1));
    set({ currentFrameIndex: clamped });
  },

  nextFrame: () => {
    const { currentFrameIndex, frames, pause } = get();
    if (currentFrameIndex >= frames.length - 1) { pause(); return; }
    set({ currentFrameIndex: currentFrameIndex + 1 });
  },

  prevFrame: () => {
    const { currentFrameIndex } = get();
    if (currentFrameIndex <= 0) return;
    set({ currentFrameIndex: currentFrameIndex - 1 });
  },

  play: () => {
    const { _playInterval, frames, currentFrameIndex, playSpeed } = get();
    if (_playInterval) clearInterval(_playInterval);
    if (frames.length === 0) return;
    const startIndex = currentFrameIndex >= frames.length - 1 ? 0 : currentFrameIndex;
    set({ isPlaying: true, currentFrameIndex: startIndex });
    const interval = setInterval(() => {
      const state = get();
      if (state.currentFrameIndex >= state.frames.length - 1) {
        clearInterval(interval);
        set({ isPlaying: false, _playInterval: null });
        return;
      }
      const nextIdx = state.currentFrameIndex + 1;
      const nextFrame = state.frames[nextIdx];
      if (nextFrame && state.breakpoints.has(nextFrame.line)) {
        set({ currentFrameIndex: nextIdx, isPlaying: false, _playInterval: null });
        clearInterval(interval);
        return;
      }
      set({ currentFrameIndex: state.currentFrameIndex + 1 });
    }, playSpeed);
    set({ _playInterval: interval });
  },

  pause: () => {
    const { _playInterval } = get();
    if (_playInterval) clearInterval(_playInterval);
    set({ isPlaying: false, _playInterval: null });
  },

  restart: () => {
    const { _playInterval } = get();
    if (_playInterval) clearInterval(_playInterval);
    set({ currentFrameIndex: 0, isPlaying: false, _playInterval: null });
  },

  toggleBreakpoint: (line) => {
    const { breakpoints } = get();
    const next = new Set(breakpoints);
    if (next.has(line)) next.delete(line); else next.add(line);
    set({ breakpoints: next });
  },

  // ── Variables panel actions ───────────────────────────────────────────────────

  toggleVariableVisibility: (name) => {
    const { hiddenVariables } = get();
    const next = new Set(hiddenVariables);
    if (next.has(name)) next.delete(name); else next.add(name);
    set({ hiddenVariables: next });
  },

  unhideAllVariables: () => set({ hiddenVariables: new Set() }),

  toggleHideHeapVariables: () => set(s => ({ hideHeapVariables: !s.hideHeapVariables })),

  setVariableColumns: (cols) => set({ variableColumns: cols }),

  // ── LeetCode actions ──────────────────────────────────────────────────────────

  toggleLeetcodeMode: () => {
    const { isLeetcodeMode, code, testCases } = get();
    const turningOn = !isLeetcodeMode;
    if (turningOn) {
      // Auto-fill params from detected method when enabling LC mode
      const detectedParams = extractParamsFromCode(code);
      if (detectedParams.length > 0) {
        // Update first test case params if they are still default
        const firstTc = testCases[0];
        const needsFill = firstTc.params.length === 0 ||
          (firstTc.params.length === 1 && firstTc.params[0].name === 'param1');
        if (needsFill) {
          const updated = testCases.map((tc, i) =>
            i === 0
              ? { ...tc, params: detectedParams }
              : {
                  ...tc,
                  params: detectedParams.map((p, pi) => ({
                    name: p.name,
                    value: tc.params[pi]?.value ?? '',
                  })),
                }
          );
          set({ isLeetcodeMode: true, leetcodeSuggestionVisible: false, testCases: updated });
          return;
        }
      }
    }
    set({ isLeetcodeMode: turningOn, leetcodeSuggestionVisible: false });
  },

  dismissLeetcodeSuggestion: () => set({ leetcodeSuggestionVisible: false }),
  dismissNoParamsWarning: () => set({ showNoParamsWarning: false }),

  addTestCase: () => {
    // Auto-detect params from current code
    const { code } = get();
    const detectedParams = extractParamsFromCode(code);
    const tc = makeDefaultTestCase(detectedParams.length > 0 ? detectedParams : undefined);
    set(s => ({ testCases: [...s.testCases, tc], activeTestCaseId: tc.id }));
  },

  removeTestCase: (id) => {
    set(s => {
      const remaining = s.testCases.filter(t => t.id !== id);
      if (remaining.length === 0) {
        const tc = makeDefaultTestCase();
        return { testCases: [tc], activeTestCaseId: tc.id };
      }
      const newActive = s.activeTestCaseId === id ? remaining[0] : remaining.find(t => t.id === s.activeTestCaseId) ?? remaining[0];
      return {
        testCases: remaining,
        activeTestCaseId: newActive.id,
        frames: newActive.frames,
        currentFrameIndex: 0,
        astInfo: newActive.astInfo,
      };
    });
  },

  updateTestCase: (id, updates) => {
    set(s => ({
      testCases: s.testCases.map(t => t.id === id ? { ...t, ...updates } : t),
    }));
  },

  setActiveTestCase: (id) => {
    const { testCases } = get();
    const tc = testCases.find(t => t.id === id);
    set({
      activeTestCaseId: id,
      frames: tc?.frames ?? [],
      currentFrameIndex: 0,
      astInfo: tc?.astInfo ?? null,
      executionTimeMs: tc?.executionTimeMs ?? null,
    });
  },

  // ── runActiveTestCase — used by toolbar "Run Test" button ─────────────────────
  runActiveTestCase: async () => {
    const { activeTestCaseId, testCases, runTestCase } = get();
    const tc = testCases.find(t => t.id === activeTestCaseId);

    // Guard: check if any parameter has a name but an empty value
    // This prevents sending `nums=` which causes a SyntaxError in the backend
    const hasEmptyValues = tc && tc.params.some(p => p.name.trim() !== '' && p.value.trim() === '');
    if (hasEmptyValues) {
      set({ showNoParamsWarning: true });
      return;
    }
    await runTestCase(activeTestCaseId);
  },

  runTestCase: async (id) => {
    const { code, testCases } = get();
    const tc = testCases.find(t => t.id === id);
    if (!tc) return;

    get().updateTestCase(id, { status: 'idle', actualOutput: null });

    const transformed = transformLeetcodeCode(code, tc.params);
    if (!transformed.ok) {
      get().updateTestCase(id, { status: 'error', actualOutput: transformed.error, frames: [], astInfo: null });
      return;
    }

    set({ isLoading: true, error: null, frames: [], currentFrameIndex: 0 });
    try {
      const response = await apiRunCode(transformed.code);
      if (response.error) {
        set({ error: response.error, frames: [], astInfo: response.ast_info, isLoading: false });
        get().updateTestCase(id, { status: 'error', actualOutput: response.error.message, frames: [], astInfo: response.ast_info, executionTimeMs: response.execution_time_ms });
        return;
      }

      const lastFrame = response.frames[response.frames.length - 1];

      // Change 5: prefer leetcode_result over stdout for reliable comparison
      const actual = (lastFrame?.leetcode_result !== undefined
        ? String(lastFrame.leetcode_result)
        : (lastFrame?.stdout ?? '').trim()
      );
      const expected = tc.expectedOutput.trim();
      const newStatus = expected === '' ? 'idle' : (actual === expected ? 'pass' : 'fail');

      // Store frames in the test case and update global view
      get().updateTestCase(id, {
        actualOutput: actual,
        status: newStatus,
        frames: response.frames,
        astInfo: response.ast_info,
        executionTimeMs: response.execution_time_ms,
      });

      set({
        frames: response.frames,
        astInfo: response.ast_info,
        currentFrameIndex: 0,
        error: null,
        isLoading: false,
        executionTimeMs: response.execution_time_ms,
      });
    } catch (err: any) {
      const msg = err?.message || 'Network error';
      set({ error: { type: 'NetworkError', message: msg, line: null }, isLoading: false });
      get().updateTestCase(id, { status: 'error', actualOutput: msg, frames: [], astInfo: null });
    }
  },

  runAllTestCases: async () => {
    const { testCases, runTestCase, setActiveTestCase } = get();
    for (const tc of testCases) {
      setActiveTestCase(tc.id);

      // Prevent empty values from crashing the run
      const hasEmptyValues = tc.params.some(p => p.name.trim() !== '' && p.value.trim() === '');
      if (hasEmptyValues) {
        set({ showNoParamsWarning: true });
        return;
      }

      await runTestCase(tc.id);
      await new Promise(r => setTimeout(r, 150));
    }
    // After run all, set active to first case and load its frames
    const firstTc = get().testCases[0];
    if (firstTc) {
      set({
        activeTestCaseId: firstTc.id,
        frames: firstTc.frames,
        currentFrameIndex: 0,
        astInfo: firstTc.astInfo,
        executionTimeMs: firstTc.executionTimeMs,
      });
    }
  },
}));
