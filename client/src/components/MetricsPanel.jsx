import React, { useState } from 'react';

const DIM_LABELS = {
  scalability: 'Scalability',
  faultTolerance: 'Fault Tolerance',
  availability: 'Availability',
  performance: 'Performance',
  security: 'Security',
  costEfficiency: 'Cost Efficiency',
  modularity: 'Modularity',
  observability: 'Observability',
  maintainability: 'Maintainability',
  governance: 'Governance'
};

const DIM_ICONS = {
  scalability: '↗',
  faultTolerance: '⛨',
  availability: '⏱',
  performance: '⚡',
  security: '🔒',
  costEfficiency: '$',
  modularity: '▦',
  observability: '👁',
  maintainability: '🛠',
  governance: '⚖'
};

function fmtMoney(n) {
  return n == null ? '-' : `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function colorFor(score) {
  if (score >= 80) return 'var(--accent)';
  if (score >= 60) return 'var(--warn)';
  return 'var(--danger)';
}

export default function MetricsPanel({ report, specsByType, onApplyFix }) {
  const [expanded, setExpanded] = useState(null);
  if (!report) {
    return <div className="card muted">Add components to see live metrics.</div>;
  }
  const { summary, dimensions, dimensionOrder, findings, cost, load } = report;
  const order = dimensionOrder || Object.keys(dimensions || {});

  return (
    <div>
      <div className="card score-hero">
        <div className="num" style={{ color: colorFor(summary.overall) }}>
          {summary.overall}
        </div>
        <div>
          <div className="grade">{summary.grade}</div>
          <div className="meta">Overall score</div>
        </div>
      </div>

      <div className="card">
        <div className="stat-row"><span>Monthly cost</span><span>{fmtMoney(summary.monthlyCost)}</span></div>
        <div className="stat-row"><span>Annual cost</span><span>{fmtMoney(cost?.annual)}</span></div>
        <div className="stat-row"><span>Components</span><span>{summary.nodes}</span></div>
        <div className="stat-row"><span>Connections</span><span>{summary.edges}</span></div>
        <div className="stat-row"><span>Bottlenecks</span><span>{summary.bottleneckCount}</span></div>
        <div className="stat-row"><span>Findings</span><span>{summary.findingCount}</span></div>
      </div>

      <h3>Quality dimensions</h3>
      <div className="card">
        {order.map((d) => (
          <div key={d} className="dim-row">
            <div className="dim-label">
              <span className="dim-icon">{DIM_ICONS[d] || '•'}</span>
              {DIM_LABELS[d] || d}
            </div>
            <div className="dim-bar-wrap">
              <div className="dim-bar">
                <div style={{ width: `${dimensions[d]}%`, background: colorFor(dimensions[d]) }} />
              </div>
              <div className="dim-value" style={{ color: colorFor(dimensions[d]) }}>
                {dimensions[d]}
              </div>
            </div>
          </div>
        ))}
      </div>

      <h3>Findings ({findings?.length || 0})</h3>
      {findings?.length ? (
        findings.map((f, i) => {
          const isOpen = expanded === i;
          const suggests = f.remediation?.suggests || [];
          const impactBits = f.contributions
            ? Object.entries(f.contributions).map(([d, w]) => `${DIM_LABELS[d] || d} +${w}`)
            : [];
          return (
            <div key={i} className={'finding ' + f.severity}>
              <div
                className="finding-head"
                onClick={() => setExpanded(isOpen ? null : i)}
                title="Click for remediation"
              >
                <div className="rule">
                  <span className="chev">{isOpen ? '▾' : '▸'}</span> {f.severity} · {f.rule}
                  {f.weight ? <span className="weight-pill">−{f.weight}</span> : null}
                </div>
                <div>{f.message}</div>
                {f.dimensions?.length > 0 && (
                  <div className="rule">affects: {f.dimensions.join(', ')}</div>
                )}
              </div>
              {isOpen && (
                <div className="remediation">
                  {f.remediation?.how?.length > 0 && (
                    <>
                      <div className="rem-label">How to fix</div>
                      <ol className="rem-steps">
                        {f.remediation.how.map((step, j) => <li key={j}>{step}</li>)}
                      </ol>
                    </>
                  )}
                  {impactBits.length > 0 && (
                    <>
                      <div className="rem-label">Score impact if fixed</div>
                      <div className="rem-impact">
                        {impactBits.map((s) => (
                          <span key={s} className="tag-mini impact">+{s.split(' +')[1]} {s.split(' +')[0]}</span>
                        ))}
                      </div>
                    </>
                  )}
                  {suggests.length > 0 && (
                    <>
                      <div className="rem-label">Suggested components</div>
                      <div className="rem-suggests">
                        {suggests.map((t) => {
                          const spec = specsByType?.[t];
                          return (
                            <span key={t} className="suggest-chip" title={spec?.description || t}>
                              {spec?.label || t}
                            </span>
                          );
                        })}
                      </div>
                      {onApplyFix && (
                        <button
                          className="primary rem-apply"
                          onClick={(e) => {
                            e.stopPropagation();
                            onApplyFix(suggests);
                          }}
                        >
                          + Add {suggests.length === 1 ? 'this component' : `these ${suggests.length} components`}
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })
      ) : (
        <div className="card" style={{ color: 'var(--accent)', fontSize: 12 }}>
          No lint findings — solid design.
        </div>
      )}

      <h3>Load per component</h3>
      {load?.length ? (
        load.map((r) => (
          <div key={r.id} className="card" style={{ padding: '6px 10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span>{r.label}</span>
              <span className={'tag ' + r.status}>{r.status}</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>
              {r.load.toLocaleString()} / {r.capacity ? r.capacity.toLocaleString() : '∞'} rps · {r.category}
            </div>
            <div className="bar">
              <div style={{ width: Math.min(100, Math.round((r.utilization || 0) * 100)) + '%' }} />
            </div>
          </div>
        ))
      ) : (
        <div className="card muted small">No components.</div>
      )}

      <h3>Cost breakdown</h3>
      {cost?.breakdown?.length ? (
        cost.breakdown.map((b) => (
          <div key={b.id} className="stat-row">
            <span>{b.label}</span>
            <span>{fmtMoney(b.monthly)}</span>
          </div>
        ))
      ) : (
        <div className="card muted small">No costs.</div>
      )}
    </div>
  );
}
