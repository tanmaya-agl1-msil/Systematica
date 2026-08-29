import React from 'react';
import { Handle, Position } from 'reactflow';

export default function ArchNode({ data, selected }) {
  const status = data?.status || 'cool';
  const util = data?.utilization;
  const cls = ['rf-node', selected ? 'selected' : '', status].join(' ').trim();
  return (
    <div className={cls}>
      <Handle type="target" position={Position.Left} />
      <div className="rf-head">
        <span className="rf-type">{data?.typeLabel}</span>
        {data?.providerLabel && <span className="rf-provider">{data.providerLabel}</span>}
      </div>
      <div className="rf-title">{data?.label}</div>
      {typeof util === 'number' && (
        <div className="rf-util">
          <span>{Math.round((util || 0) * 100)}%</span>
          <div className="bar">
            <div style={{ width: Math.min(100, Math.round(util * 100)) + '%' }} />
          </div>
        </div>
      )}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
