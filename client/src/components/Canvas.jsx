import React, { useCallback, useMemo, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  useReactFlow,
  ReactFlowProvider
} from 'reactflow';
import ArchNode from './nodes/ArchNode';
import { providerLabel } from '../lib/componentSpecs';

const nodeTypes = { arch: ArchNode };

function CanvasInner({ nodes, edges, setNodes, setEdges, onSelectNode, report, specsByType, provider }) {
  const wrapperRef = useRef(null);
  const { screenToFlowPosition } = useReactFlow();

  const decoratedNodes = useMemo(() => {
    const byId = new Map((report?.load || []).map((r) => [r.id, r]));
    return nodes.map((n) => {
      const info = byId.get(n.id);
      const spec = specsByType[n.componentType];
      return {
        ...n,
        type: 'arch',
        data: {
          ...n.data,
          typeLabel: spec?.label || n.componentType,
          providerLabel: spec ? providerLabel(spec, provider) : '',
          status: info?.status,
          utilization: info?.utilization
        }
      };
    });
  }, [nodes, report, specsByType, provider]);

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [setNodes]
  );
  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [setEdges]
  );
  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    [setEdges]
  );

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      const type = e.dataTransfer.getData('application/reactflow');
      if (!type) return;
      const spec = specsByType[type];
      if (!spec) return;
      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const id = `${type}_${Date.now().toString(36)}`;
      const newNode = {
        id,
        type: 'arch',
        componentType: type,
        position,
        data: {
          label: spec.label,
          nodeType: type,
          config: { ...(spec.defaultConfig || {}) }
        }
      };
      setNodes((nds) => [...nds, newNode]);
    },
    [screenToFlowPosition, setNodes, specsByType]
  );

  const onSelectionChange = useCallback(
    ({ nodes: sel }) => onSelectNode(sel?.[0]?.id || null),
    [onSelectNode]
  );

  return (
    <div className="canvas" ref={wrapperRef} onDragOver={onDragOver} onDrop={onDrop}>
      <ReactFlow
        nodes={decoratedNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onSelectionChange={onSelectionChange}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background gap={20} color="#253062" />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={(n) => {
            const s = n.data?.status;
            if (s === 'overloaded') return '#f87171';
            if (s === 'hot') return '#fbbf24';
            return '#6ee7b7';
          }}
          maskColor="rgba(11,16,32,0.6)"
        />
      </ReactFlow>
    </div>
  );
}

export default function Canvas(props) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}
