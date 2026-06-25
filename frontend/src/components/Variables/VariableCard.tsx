// components/Variables/VariableCard.tsx
import { motion } from 'framer-motion';
import { EyeOff } from 'lucide-react';
import type { AnyDescriptor } from '../../types/debugger';

interface VariableCardProps {
  name: string;
  descriptor: AnyDescriptor;
  isChanged: boolean;
  onClick: () => void;
  onHide?: () => void;
}

function getTypeBadgeClass(type: string): string {
  const map: Record<string, string> = {
    int: 'badge-int',
    float: 'badge-float',
    bool: 'badge-bool',
    string: 'badge-str',
    list: 'badge-list',
    dict: 'badge-dict',
    set: 'badge-set',
    tuple: 'badge-tuple',
    instance: 'badge-instance',
    none: 'badge-none',
    function: 'badge-func',
    class: 'badge-class',
    circular_ref: 'badge-unknown',
    error: 'badge-unknown',
    unknown: 'badge-unknown',
  };
  return map[type] || 'badge-unknown';
}

/**
 * Renders a compact inline string for a descriptor — used inside collection items.
 * For small tuples/lists, renders full contents (e.g. "(1, 2)" or "[3, 4]").
 * Only abbreviates large/deeply nested collections.
 */
export function getShortValue(descriptor: AnyDescriptor | null | undefined, depth = 0): string {
  if (!descriptor) return '?';
  switch (descriptor.type) {
    case 'int':
    case 'float':
    case 'bool':
      return String(descriptor.value);
    case 'none':
      return 'None';
    case 'string': {
      const s = descriptor.value as string;
      const preview = s.slice(0, 16);
      return `"${preview}${s.length > 16 ? '…' : ''}"`;
    }
    case 'list': {
      if (descriptor.length === 0) return '[]';
      if (depth >= 2) return `[...]`;
      const inner = descriptor.items.map(i => getShortValue(i, depth + 1)).join(', ');
      return `[${inner}]`;
    }
    case 'tuple': {
      if (descriptor.length === 0) return '()';
      if (depth >= 2) return `(...)`;
      const inner = descriptor.items.map(i => getShortValue(i, depth + 1)).join(', ');
      return `(${inner})`;
    }
    case 'set': {
      if (descriptor.items.length === 0) return '{}';
      if (depth >= 2) return `{...}`;
      const inner = descriptor.items.map(i => getShortValue(i, depth + 1)).join(', ');
      return `{${inner}}`;
    }
    case 'dict': {
      if (descriptor.pairs.length === 0) return '{}';
      if (depth >= 2) return `{...}`;
      const inner = descriptor.pairs.map(p => `${getShortValue(p.key, depth + 1)}: ${getShortValue(p.value, depth + 1)}`).join(', ');
      return `{${inner}}`;
    }
    case 'instance':
      return `<${descriptor.class_name}>`;
    case 'function':
      return `ƒ ${descriptor.name}`;
    case 'class':
      return `class ${descriptor.name}`;
    case 'circular_ref':
      return '↩ ref';
    default:
      return (descriptor as any).value?.toString().slice(0, 20) ?? '?';
  }
}

/** Renders the value for a single list/tuple item inline */
function renderItemValue(descriptor: AnyDescriptor, _index: number): React.ReactNode {
  const text = getShortValue(descriptor, 1);

  let colorClass = 'text-text-primary';
  switch (descriptor.type) {
    case 'int': case 'float': colorClass = 'text-type-int'; break;
    case 'bool': colorClass = 'text-type-bool'; break;
    case 'string': colorClass = 'text-type-str'; break;
    case 'tuple': colorClass = 'text-type-tuple'; break;
    case 'list': colorClass = 'text-type-list'; break;
    case 'dict': colorClass = 'text-type-dict'; break;
    case 'set': colorClass = 'text-type-set'; break;
    case 'instance': colorClass = 'text-type-instance'; break;
    case 'function': colorClass = 'text-type-func'; break;
    case 'none': colorClass = 'text-text-muted'; break;
  }
  return <span className={`${colorClass} font-mono text-[10px]`}>{text}</span>;
}

import React from 'react';

function renderValue(descriptor: AnyDescriptor): React.ReactNode {
  if (!descriptor) return <span className="text-text-muted">undefined</span>;

  switch (descriptor.type) {
    case 'int':
    case 'float':
      return <span className="text-type-int font-mono text-sm">{String(descriptor.value)}</span>;
    case 'bool':
      return <span className="text-type-bool font-mono text-sm">{String(descriptor.value)}</span>;
    case 'none':
      return <span className="text-text-muted font-mono text-sm">None</span>;
    case 'string':
      return (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-type-str font-mono text-sm truncate max-w-[160px]">
            "{descriptor.value}"
          </span>
          <span className="text-[10px] text-text-muted font-mono">len={descriptor.length}</span>
        </div>
      );
    case 'list': {
      return (
        <div className="flex gap-1 flex-wrap mt-1">
          {descriptor.items.map((item, i) => (
            <div key={i} className="flex items-center gap-0.5">
              <span className="text-text-muted text-[9px] font-mono">[{i}]</span>
              <span className="px-1.5 py-0.5 rounded-sm bg-type-list/10 border border-type-list/20 text-[10px] font-mono">
                {renderItemValue(item, i)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    case 'tuple': {
      return (
        <div className="flex gap-1 flex-wrap mt-1">
          <span className="text-type-tuple font-mono text-[10px]">(</span>
          {descriptor.items.map((item, i) => (
            <React.Fragment key={i}>
              <span className="px-1.5 py-0.5 rounded-full bg-type-tuple/10 border border-type-tuple/20 text-[10px] font-mono">
                {renderItemValue(item, i)}
              </span>
              {i < descriptor.length - 1 && <span className="text-text-muted text-[10px]">,</span>}
            </React.Fragment>
          ))}
          <span className="text-type-tuple font-mono text-[10px]">)</span>
        </div>
      );
    }
    case 'set': {
      return (
        <div className="flex gap-1 flex-wrap mt-1">
          {descriptor.items.map((item, i) => (
            <span key={i} className="px-1.5 py-0.5 rounded-full bg-type-set/10 border border-type-set/20 text-type-set text-[10px] font-mono">
              {getShortValue(item, 1)}
            </span>
          ))}
        </div>
      );
    }
    case 'dict': {
      return (
        <div className="mt-1 space-y-0.5">
          {descriptor.pairs.map((pair, i) => (
            <div key={i} className="flex items-center gap-1 text-[10px] font-mono">
              <span className="text-type-dict">{getShortValue(pair.key, 1)}</span>
              <span className="text-text-muted">→</span>
              <span className="text-text-primary">{getShortValue(pair.value, 1)}</span>
            </div>
          ))}
        </div>
      );
    }
    case 'instance':
      return (
        <div className="mt-1 space-y-0.5">
          {Object.entries(descriptor.attributes).map(([k, v]) => (
            <div key={k} className="flex items-center gap-1 text-[10px] font-mono">
              <span className="text-type-instance">.{k}</span>
              <span className="text-text-muted">=</span>
              <span className="text-text-primary">{getShortValue(v, 1)}</span>
            </div>
          ))}
        </div>
      );
    case 'function':
      return <span className="text-type-func font-mono text-sm">ƒ {descriptor.name}</span>;
    case 'class':
      return <span className="text-type-class font-mono text-sm">class {descriptor.name}</span>;
    case 'circular_ref':
      return <span className="text-text-muted font-mono text-sm">↩ {descriptor.ref_id}</span>;
    default:
      return <span className="text-text-muted font-mono text-sm truncate max-w-[180px]">{(descriptor as any).value ?? '?'}</span>;
  }
}

export function VariableCard({ name, descriptor, isChanged, onClick, onHide }: VariableCardProps) {
  // Guard: skip any typing internal that slipped through backend/panel filter
  if (!descriptor || (descriptor as any).type === '_typing_internal') return null;

  const badgeClass = getTypeBadgeClass(descriptor.type);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4, scale: 0.97 }}
      transition={{ duration: 0.2 }}
      className={`
        relative p-2.5 rounded-card border cursor-pointer group
        transition-colors duration-150
        ${isChanged
          ? 'border-warning/40 bg-warning/5 flash-animation'
          : 'border-border-subtle bg-bg-elevated hover:border-border-muted hover:bg-bg-elevated/80'
        }
      `}
      onClick={onClick}
    >
      {/* Changed indicator */}
      <div className="absolute top-1.5 right-1.5 flex items-center gap-1.5 z-10">
        {onHide && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onHide();
            }}
            className="text-text-muted hover:text-text-primary opacity-0 group-hover:opacity-100 transition-opacity"
            title="Hide variable"
          >
            <EyeOff size={12} />
          </button>
        )}
        {isChanged && (
          <div className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
        )}
      </div>

      {/* Type badge */}
      <div className={`type-badge ${badgeClass} mb-1.5`}>{descriptor.type}</div>

      {/* Variable name */}
      <div className="text-text-primary font-mono text-sm font-medium mb-1">{name}</div>

      {/* Value */}
      <div className="text-text-secondary">{renderValue(descriptor)}</div>

      {/* Hover hint */}
      <div className="absolute inset-x-0 bottom-0 h-0.5 rounded-b-card bg-accent opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
    </motion.div>
  );
}
