// utils/leetcodeTransformer.ts
// Transforms LeetCode Solution class code into a runnable script
// by auto-detecting the method and injecting a runner.

import type { TestCaseParam } from '../store/debuggerStore';

const TYPING_IMPORT = 'from typing import List, Dict, Tuple, Optional, Set, Any, Union';

export interface TransformResult {
  ok: true;
  code: string;
  methodName: string;
  paramNames: string[];
}

export interface TransformError {
  ok: false;
  error: string;
}

/**
 * Given user code containing `class Solution:` and test case params,
 * returns a transformed code string ready to send to the backend.
 */
export function transformLeetcodeCode(
  userCode: string,
  params: TestCaseParam[],
): TransformResult | TransformError {
  // ── Step 1: Find class Solution ──────────────────────────────────────────────
  if (!/class\s+Solution\s*:/m.test(userCode)) {
    return { ok: false, error: 'No "class Solution:" found in the code.' };
  }

  // ── Step 2: Find the primary method (not __init__, not __new__) ──────────────
  // Match: def methodName(self, ...) pattern inside the class
  // We look for the first non-dunder method in the Solution class
  const methodRegex = /^\s{4}def\s+([a-zA-Z][a-zA-Z0-9_]*)\s*\(self(?:,\s*([^)]*))?\)/m;
  const methodMatch = userCode.match(methodRegex);
  if (!methodMatch) {
    return { ok: false, error: 'Could not detect a method inside class Solution.' };
  }

  const methodName = methodMatch[1];
  if (methodName.startsWith('__')) {
    // Try finding next method after __init__
    const allMethods = [...userCode.matchAll(/^\s{4}def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/gm)];
    const nonDunder = allMethods.find(m => !m[1].startsWith('__'));
    if (!nonDunder) {
      return { ok: false, error: 'No non-dunder method found in class Solution.' };
    }
  }

  // ── Step 3: Build parameter assignment string ─────────────────────────────────
  // Each param has name + value (raw Python literal)
  const paramAssignments = params
    .filter(p => p.name.trim() !== '')
    .map(p => `${p.name.trim()}=${p.value.trim()}`)
    .join(', ');

  // ── Step 4: Build the typing import header (skip if already present) ──────────
  const hasTypingImport = /from\s+typing\s+import/.test(userCode);
  const typingHeader = hasTypingImport ? '' : `${TYPING_IMPORT}\n\n`;

  // ── Step 5: Assemble final code ───────────────────────────────────────────────
  const runner = [
    '',
    '# --- LeetCode Runner (auto-generated) ---',
    '_solution = Solution()',
    `_result = _solution.${methodName}(${paramAssignments})`,
    'print(_result)',
  ].join('\n');

  const finalCode = `${typingHeader}${userCode.trimEnd()}${runner}`;

  return {
    ok: true,
    code: finalCode,
    methodName,
    paramNames: params.map(p => p.name.trim()),
  };
}

/**
 * Tries to extract parameter names from the Solution method signature.
 * Returns [] if detection fails.
 */
export function detectSolutionParams(userCode: string): string[] {
  const methodRegex = /^\s{4}def\s+[a-zA-Z][a-zA-Z0-9_]*\s*\(self(?:,\s*([^)]*))?\)/m;
  const match = userCode.match(methodRegex);
  if (!match || !match[1]) return [];

  // Parse "param: Type, param2: Type = default" → ["param", "param2"]
  return match[1]
    .split(',')
    .map(p => p.trim().split(/[:\s=]/)[0].trim())
    .filter(p => p.length > 0);
}

/**
 * Returns the Solution method name, or null if not found.
 */
export function detectSolutionMethodName(userCode: string): string | null {
  const allMethods = [...userCode.matchAll(/^\s{4}def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/gm)];
  const nonDunder = allMethods.find(m => !m[1].startsWith('__'));
  return nonDunder?.[1] ?? null;
}
