// components/Heap/HeapView.tsx
import { useEffect, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge,
  MarkerType,
  BackgroundVariant,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from '@dagrejs/dagre';
import { Network } from 'lucide-react';
import { useDebuggerStore } from '../../store/debuggerStore';
import type { AnyDescriptor, InstanceDescriptor } from '../../types/debugger';
import { getShortValue } from '../Variables/VariableCard';

// ─── Typing Internal Filter (frontend safety layer) ──────────────────────────
const TYPING_CLASS_NAMES = new Set([
  '_SpecialGenericAlias', '_GenericAlias', '_SpecialForm',
  '_TupleType', '_UnionGenericAlias', '_LiteralGenericAlias',
  '_AnnotatedAlias', '_BaseGenericAlias', 'ABCMeta',
  '_CallableGenericAlias', '_CallableType',
]);

function isTypingInternal(desc: AnyDescriptor): boolean {
  if (desc.type === 'instance') {
    const inst = desc as InstanceDescriptor;
    if (TYPING_CLASS_NAMES.has(inst.class_name)) return true;
    if (inst.class_name.startsWith('_') && inst.class_name.length > 2) {
      // Heuristic: private-looking class with no meaningful attrs
      return true;
    }
  }
  if (desc.type === '_typing_internal' as any) return true;
  return false;
}

// ─── Dagre Layout ──────────────────────────────────────────────────────────────
const NODE_WIDTH = 200;
const NODE_HEIGHT = 80;

function getLayoutedElements(nodes: Node[], edges: Edge[]) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: 'LR',
    ranksep: 60,   // horizontal distance between ranks (columns) — tighter
    nodesep: 30,   // vertical distance between nodes in same rank — tighter
    edgesep: 15,
    marginx: 20,
    marginy: 20,
  });

  nodes.forEach((node) => {
    g.setNode(node.id, { width: NODE_WIDTH, height: (node.data._height as number) || NODE_HEIGHT });
  });
  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  return {
    nodes: nodes.map((node) => {
      const n = g.node(node.id);
      return {
        ...node,
        position: { x: n.x - NODE_WIDTH / 2, y: n.y - ((node.data._height as number) || NODE_HEIGHT) / 2 },
      };
    }),
    edges,
  };
}

// ─── Custom Node Components ────────────────────────────────────────────────────

function VarNamesHeader({ names, color }: { names?: string[], color: string }) {
  if (!names || names.length === 0) return null;
  // A slightly darkened or opaque version of the color for the badge
  return (
    <div className="absolute -top-6 left-2 right-2 flex flex-wrap gap-1 justify-center z-10 pointer-events-none">
      {names.map((name) => (
        <div 
          key={name} 
          className="px-1.5 py-0.5 rounded-sm font-mono text-[9px] font-medium shadow-sm whitespace-nowrap"
          style={{ 
            background: color, 
            borderColor: color, 
            borderWidth: 1, 
            borderStyle: 'solid',
            color: '#0A0A0C' // dark text for high contrast on vibrant colors
          }}
        >
          {name}
        </div>
      ))}
    </div>
  );
}

function ListNode({ data }: { data: any }) {
  const desc = data.descriptor;
  if (desc.type !== 'list' && desc.type !== 'tuple') return null;
  return (
    <div
      className="relative rounded-card border overflow-visible"
      style={{ background: '#141416', borderColor: desc.type === 'list' ? '#F97316' : '#06B6D4', minWidth: 120 }}
    >
      <VarNamesHeader names={data.varNames} color={desc.type === 'list' ? '#F97316' : '#06B6D4'} />
      <Handle type="target" position={Position.Left} style={{ background: '#7C6DFA', width: 8, height: 8 }} />
      <div className="px-2 py-1 text-[9px] uppercase tracking-wider font-semibold border-b"
        style={{ background: desc.type === 'list' ? '#F97316' : '#06B6D4', color: '#0A0A0C', borderColor: 'transparent' }}>
        {desc.type} [{desc.length}]
      </div>
      <div className="flex p-1 gap-1 flex-wrap">
        {desc.items.map((item: AnyDescriptor, i: number) => (
          <div key={i} className="flex flex-col items-center">
            <span className="text-[8px] text-text-muted font-mono">{i}</span>
            <span className="px-1 py-0.5 rounded-sm text-[10px] font-mono text-text-primary"
              style={{ background: '#1A1A1E', border: '1px solid #2A2A30' }}>
              {getShortValue(item, 1)}
            </span>
          </div>
        ))}
      </div>
      <Handle type="source" position={Position.Right} style={{ background: '#7C6DFA', width: 8, height: 8 }} />
    </div>
  );
}

function DictNode({ data }: { data: any }) {
  const desc = data.descriptor;
  if (desc.type !== 'dict') return null;
  return (
    <div className="relative rounded-card border overflow-visible" style={{ background: '#141416', borderColor: '#EC4899', minWidth: 140 }}>
      <VarNamesHeader names={data.varNames} color="#EC4899" />
      <Handle type="target" position={Position.Left} style={{ background: '#7C6DFA', width: 8, height: 8 }} />
      <div className="px-2 py-1 text-[9px] uppercase tracking-wider font-semibold border-b"
        style={{ background: '#EC4899', color: '#0A0A0C', borderColor: 'transparent' }}>
        dict {'{'}{desc.pairs.length}{'}'} pairs
      </div>
      <div className="p-1.5 space-y-0.5">
        {desc.pairs.map((pair: any, i: number) => (
          <div key={i} className="flex items-center gap-1 text-[10px] font-mono">
            <span className="text-type-dict">{getShortValue(pair.key, 1)}</span>
            <span className="text-text-muted">→</span>
            <span className="text-text-primary">{getShortValue(pair.value, 1)}</span>
          </div>
        ))}
      </div>
      <Handle type="source" position={Position.Right} style={{ background: '#7C6DFA', width: 8, height: 8 }} />
    </div>
  );
}

function InstanceNode({ data }: { data: any }) {
  const desc = data.descriptor;
  if (desc.type !== 'instance') return null;
  return (
    <div className="relative rounded-card border overflow-visible" style={{ background: '#141416', borderColor: '#10B981', minWidth: 150 }}>
      <VarNamesHeader names={data.varNames} color="#10B981" />
      <Handle type="target" position={Position.Left} style={{ background: '#7C6DFA', width: 8, height: 8 }} />
      <div className="px-2 py-1 text-[9px] uppercase tracking-wider font-semibold border-b"
        style={{ background: '#10B981', color: '#0A0A0C', borderColor: 'transparent' }}>
        {desc.class_name}
      </div>
      <div className="p-1.5 space-y-0.5">
        {Object.entries(desc.attributes).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1 text-[10px] font-mono">
            <span className="text-type-instance">.{k}</span>
            <span className="text-text-muted">=</span>
            <span className="text-text-primary">{getShortValue(v as AnyDescriptor, 1)}</span>
          </div>
        ))}
      </div>
      <Handle type="source" position={Position.Right} style={{ background: '#7C6DFA', width: 8, height: 8 }} />
    </div>
  );
}

function StringNode({ data }: { data: any }) {
  const desc = data.descriptor;
  if (desc.type !== 'string') return null;
  return (
    <div className="relative rounded-card border px-3 py-2 text-type-str font-mono text-xs overflow-visible"
      style={{ background: '#141416', borderColor: '#FBBF24', maxWidth: 200 }}>
      <VarNamesHeader names={data.varNames} color="#FBBF24" />
      <Handle type="target" position={Position.Left} style={{ background: '#7C6DFA', width: 8, height: 8 }} />
      <div className="text-[9px] text-text-muted mb-0.5">string · {desc.length}</div>
      <div className="truncate">"{desc.value}"</div>
      <Handle type="source" position={Position.Right} style={{ background: '#7C6DFA', width: 8, height: 8 }} />
    </div>
  );
}

function SetNode({ data }: { data: any }) {
  const desc = data.descriptor;
  if (desc.type !== 'set') return null;
  return (
    <div className="relative rounded-card border overflow-visible" style={{ background: '#141416', borderColor: '#8B5CF6', minWidth: 120 }}>
      <VarNamesHeader names={data.varNames} color="#8B5CF6" />
      <Handle type="target" position={Position.Left} style={{ background: '#7C6DFA', width: 8, height: 8 }} />
      <div className="px-2 py-1 text-[9px] uppercase tracking-wider font-semibold border-b"
        style={{ background: '#8B5CF6', color: '#0A0A0C', borderColor: 'transparent' }}>
        set · {desc.items.length}
      </div>
      <div className="p-1.5 flex flex-wrap gap-1">
        {desc.items.slice(0, 6).map((item: AnyDescriptor, i: number) => (
          <span key={i} className="px-1.5 py-0.5 rounded-full text-[9px] font-mono text-type-set"
            style={{ background: '#8B5CF620', border: '1px solid #8B5CF640' }}>
            {getShortValue(item, 1)}
          </span>
        ))}
      </div>
      <Handle type="source" position={Position.Right} style={{ background: '#7C6DFA', width: 8, height: 8 }} />
    </div>
  );
}

function FuncNode({ data }: { data: any }) {
  const desc = data.descriptor;
  return (
    <div className="relative rounded-card border px-3 py-2 text-type-func font-mono text-xs overflow-visible"
      style={{ background: '#141416', borderColor: '#F59E0B' }}>
      <VarNamesHeader names={data.varNames} color="#F59E0B" />
      <Handle type="target" position={Position.Left} style={{ background: '#7C6DFA', width: 8, height: 8 }} />
      <div className="text-[9px] text-text-muted mb-0.5">function</div>
      <div>ƒ {desc.name}</div>
    </div>
  );
}

const nodeTypes = {
  listNode: ListNode,
  dictNode: DictNode,
  instanceNode: InstanceNode,
  stringNode: StringNode,
  setNode: SetNode,
  funcNode: FuncNode,
};

function getNodeType(type: string): string {
  switch (type) {
    case 'list': case 'tuple': return 'listNode';
    case 'dict': return 'dictNode';
    case 'instance': return 'instanceNode';
    case 'string': return 'stringNode';
    case 'set': return 'setNode';
    case 'function': return 'funcNode';
    default: return 'stringNode';
  }
}

function estimateHeight(descriptor: AnyDescriptor): number {
  switch (descriptor.type) {
    case 'list': case 'tuple': return 36 + Math.ceil(Math.max((descriptor as any).items.length, 1) / 3) * 36;
    case 'dict': return 30 + (descriptor as any).pairs.length * 18;
    case 'instance': return 30 + Object.keys((descriptor as any).attributes).length * 18;
    case 'string': return 56;
    case 'set': return 30 + Math.ceil((descriptor as any).items.length / 3) * 24;
    default: return 56;
  }
}

// ─── Inner component (needs to be inside ReactFlowProvider for useReactFlow) ──

function HeapViewInner() {
  const { frames, currentFrameIndex, isLeetcodeMode } = useDebuggerStore();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const { fitView } = useReactFlow();

  const frame = frames[currentFrameIndex];

  // Build graph whenever frame changes
  useEffect(() => {
    if (!frame) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const rawHeap: AnyDescriptor[] = frame.heap || [];
    // Frontend typing filter — skip typing internals, and skip _solution in LeetCode mode
    const heapObjects = rawHeap.filter(obj => 
      !isTypingInternal(obj) && 
      !(isLeetcodeMode && obj.type === 'instance' && (obj as any).class_name === 'Solution')
    );
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];

    // Map object IDs to variable names
    const varNamesMap = new Map<string, string[]>();
    
    const collectVarNames = (vars: Record<string, any>) => {
      Object.entries(vars || {}).forEach(([varName, descriptor]) => {
        if (!descriptor || !('id' in descriptor)) return;
        const desc = descriptor as any;
        if (!desc.id || !desc.id.startsWith('obj_')) return;
        if (isTypingInternal(descriptor)) return;
        
        const names = varNamesMap.get(desc.id) || [];
        names.push(varName);
        varNamesMap.set(desc.id, names);
      });
    };
    
    collectVarNames(frame.locals);
    collectVarNames(frame.globals);

    // Create heap object nodes
    heapObjects.forEach((obj) => {
      if (!('id' in obj) || !obj.id) return;
      const height = estimateHeight(obj);
      newNodes.push({
        id: obj.id,
        type: getNodeType(obj.type),
        position: { x: 0, y: 0 },
        data: { 
          descriptor: obj, 
          _height: height,
          varNames: varNamesMap.get(obj.id) || []
        },
      });

      const addRef = (childDesc: AnyDescriptor | null | undefined, edgeId: string) => {
        if (!childDesc || !('id' in childDesc)) return;
        const childAny = childDesc as any;
        if (!childAny.id || !childAny.id.startsWith('obj_')) return;
        newEdges.push({
          id: edgeId,
          source: obj.id as string,
          target: childAny.id,
          type: 'smoothstep',
          animated: false,
          markerEnd: { type: MarkerType.ArrowClosed, width: 10, height: 10, color: '#4B5563' },
          style: { stroke: '#4B5563', strokeWidth: 1, strokeDasharray: '4 2' },
        });
      };

      if (obj.type === 'list' || obj.type === 'tuple') {
        obj.items.forEach((item, i) => addRef(item, `e_${obj.id}_item_${i}`));
      } else if (obj.type === 'dict') {
        obj.pairs.forEach((pair, i) => addRef(pair.value, `e_${obj.id}_val_${i}`));
      } else if (obj.type === 'instance') {
        Object.entries(obj.attributes).forEach(([k, v]) => addRef(v, `e_${obj.id}_attr_${k}`));
      }
    });

    // Deduplicate edges
    const edgeSet = new Map<string, Edge>();
    newEdges.forEach((e) => edgeSet.set(e.id, e));

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      newNodes,
      Array.from(edgeSet.values())
    );

    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [currentFrameIndex, frames]);

  // Auto-fit after nodes update
  const doFitView = useCallback(() => {
    fitView({ padding: 0.15, duration: 300, maxZoom: 1.2 });
  }, [fitView]);

  useEffect(() => {
    const timer = setTimeout(doFitView, 60);
    return () => clearTimeout(timer);
  }, [nodes.length, currentFrameIndex, doFitView]);

  if (!frame || (frame.heap || []).filter(o => !isTypingInternal(o)).length === 0) {
    return (
      <div className="flex flex-col h-full panel">
        <div className="panel-header">
          <Network size={12} />
          <span>Heap / Object Graph</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-text-muted text-sm text-center px-4">
            {frame ? 'No heap objects at this step' : 'Run code to see the object graph'}
          </p>
        </div>
      </div>
    );
  }

  const visibleCount = (frame.heap || []).filter(o => !isTypingInternal(o)).length;

  return (
    <div className="flex flex-col h-full panel overflow-hidden">
      <div className="panel-header">
        <Network size={12} />
        <span>Heap / Object Graph</span>
        <span className="ml-auto text-text-muted text-[10px] font-normal normal-case tracking-normal">
          {visibleCount} objects
        </span>
      </div>
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.3}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="#1E1E22"
          />
          <Controls
            position="bottom-right"
            showInteractive={false}
            style={{
              background: '#1A1A1E',
              border: '1px solid #2A2A30',
              borderRadius: 8,
            }}
          />
        </ReactFlow>
      </div>
    </div>
  );
}

// ─── Export wrapped in ReactFlowProvider ───────────────────────────────────────

export function HeapView() {
  return (
    <ReactFlowProvider>
      <HeapViewInner />
    </ReactFlowProvider>
  );
}
