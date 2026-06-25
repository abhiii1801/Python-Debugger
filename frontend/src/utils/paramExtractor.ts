// utils/paramExtractor.ts
// Extracts parameter names from a LeetCode Solution class method signature.

import type { TestCaseParam } from '../store/debuggerStore';

/**
 * Parses a LeetCode Solution class and extracts the parameter list
 * of the primary method (the first non-dunder method).
 *
 * Example input:
 *   class Solution:
 *       def twoSum(self, nums: List[int], target: int) -> List[int]:
 * Returns: [{ name: 'nums', value: '' }, { name: 'target', value: '' }]
 */
export function extractParamsFromCode(code: string): TestCaseParam[] {
  if (!code || !/class\s+Solution\s*:/m.test(code)) return [];

  // Match the first non-dunder method inside the Solution class
  // Pattern: "    def methodName(self, param1: Type, param2: Type) ..."
  const methodMatch = code.match(
    /class\s+Solution[\s\S]*?\n\s{4}def\s+([a-zA-Z][a-zA-Z0-9_]*)\s*\(self(?:,\s*([^)]*))?\s*\)/
  );
  if (!methodMatch) return [];

  const methodName = methodMatch[1];
  // Skip __init__ and other dunder methods
  if (methodName.startsWith('__')) {
    // Try to find the next non-dunder def
    const allDefsMatch = [...code.matchAll(/\n\s{4}def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(self(?:,\s*([^)]*))?\s*\)/g)];
    const nonDunder = allDefsMatch.find(m => !m[1].startsWith('__'));
    if (!nonDunder) return [];
    const paramsStr = nonDunder[2];
    return parseParamString(paramsStr);
  }

  const paramsStr = methodMatch[2];
  return parseParamString(paramsStr);
}

function parseParamString(paramsStr: string | undefined): TestCaseParam[] {
  if (!paramsStr || !paramsStr.trim()) return [];

  return paramsStr
    .split(',')
    .map(p => {
      // Strip type annotation and default value: "heights: List[int]" → "heights"
      const name = p.trim().split(/[:\s=]/)[0].trim();
      return { name, value: '' };
    })
    .filter(p => p.name && p.name !== 'self' && p.name.length > 0);
}
