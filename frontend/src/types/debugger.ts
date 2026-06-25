// types/debugger.ts — TypeScript interfaces matching the backend frame format exactly.

// ─── Serialized Object Descriptors ────────────────────────────────────────────

export interface PrimitiveDescriptor {
  id: string;
  type: 'int' | 'float' | 'bool' | 'none';
  value: number | boolean | null;
}

export interface StringDescriptor {
  id: string;
  type: 'string';
  value: string;
  length: number;
}

export interface ListDescriptor {
  id: string;
  type: 'list';
  length: number;
  items: AnyDescriptor[];
}

export interface TupleDescriptor {
  id: string;
  type: 'tuple';
  length: number;
  items: AnyDescriptor[];
}

export interface SetDescriptor {
  id: string;
  type: 'set';
  items: AnyDescriptor[];
}

export interface DictPair {
  key: AnyDescriptor;
  value: AnyDescriptor;
}

export interface DictDescriptor {
  id: string;
  type: 'dict';
  pairs: DictPair[];
}

export interface InstanceDescriptor {
  id: string;
  type: 'instance';
  class_name: string;
  attributes: Record<string, AnyDescriptor>;
}

export interface FunctionDescriptor {
  id: string;
  type: 'function';
  name: string;
}

export interface ClassDescriptor {
  id: string;
  type: 'class';
  name: string;
}

export interface CircularRefDescriptor {
  type: 'circular_ref';
  ref_id: string;
}

export interface ErrorDescriptor {
  type: 'error';
  value: string;
}

export interface UnknownDescriptor {
  id: string;
  type: 'unknown';
  value: string;
}

export type AnyDescriptor =
  | PrimitiveDescriptor
  | StringDescriptor
  | ListDescriptor
  | TupleDescriptor
  | SetDescriptor
  | DictDescriptor
  | InstanceDescriptor
  | FunctionDescriptor
  | ClassDescriptor
  | CircularRefDescriptor
  | ErrorDescriptor
  | UnknownDescriptor;

// ─── Execution Frames ─────────────────────────────────────────────────────────

export interface StackFrame {
  function_name: string;
  filename: string;
  line: number;
  locals: Record<string, AnyDescriptor>;
}

export interface ExceptionInfo {
  type: string;
  message: string;
  traceback: string;
}

export type FrameEvent = 'line' | 'call' | 'return' | 'exception';

export interface ExecutionFrame {
  frame_index: number;
  line: number;
  event: FrameEvent;
  locals: Record<string, AnyDescriptor>;
  globals: Record<string, AnyDescriptor>;
  stack: StackFrame[];
  stdout: string;
  stderr: string;
  heap: AnyDescriptor[];
  return_value: AnyDescriptor | null;
  exception: ExceptionInfo | null;
  changed_vars: string[];
  /** Present only when LeetCode-transformed code ran — str(return_value) of Solution method */
  leetcode_result?: string;
}

// ─── AST Info ─────────────────────────────────────────────────────────────────

export interface AstInfo {
  has_loops: boolean;
  has_functions: boolean;
  has_classes: boolean;
  has_recursion: boolean;
  function_names: string[];
  class_names: string[];
  import_names: string[];
}

// ─── API Response Types ────────────────────────────────────────────────────────

export interface ApiError {
  type: string;
  message: string;
  line: number | null;
}

export interface RunResponse {
  frames: ExecutionFrame[];
  ast_info: AstInfo | null;
  total_frames: number;
  execution_time_ms: number;
  error?: ApiError;
}
