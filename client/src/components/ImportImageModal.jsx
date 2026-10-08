import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';

const MAX_EDGE = 1800;

// Downscale before upload: cuts payload size and improves OCR consistency.
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not decode that image.'));
      img.onload = () => {
        const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function ImportImageModal({ open, onClose, onLoad, specsByType }) {
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    api.aiStatus().then(setStatus).catch(() => setStatus({ ready: false }));
  }, [open]);

  const reset = useCallback(() => {
    setPreview(null);
    setResult(null);
    setError('');
    setBusy(false);
  }, []);

  const pick = async (file) => {
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      setError('Please choose a PNG, JPEG, or WebP image.');
      return;
    }
    setError('');
    setResult(null);
    try {
      setPreview(await fileToDataUrl(file));
    } catch (e) {
      setError(e.message);
    }
  };

  const analyze = async () => {
    if (!preview) return;
    setBusy(true);
    setError('');
    try {
      setResult(await api.analyzeImage(preview));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const confirm = () => {
    onLoad(result);
    reset();
    onClose();
  };

  if (!open) return null;

  const counts = {};
  (result?.nodes || []).forEach((n) => {
    counts[n.type] = (counts[n.type] || 0) + 1;
  });

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Import architecture from image</h2>
          <button onClick={onClose}>✕</button>
        </div>

        {status && !status.ready && (
          <div className="banner warn">
            AI vision isn't configured. Set <code>AI_API_KEY</code> (and{' '}
            <code>AI_BASE_URL</code> / <code>AI_MODEL</code>) in <code>server/.env</code>, then restart the API.
          </div>
        )}
        {status?.ready && (
          <div className="muted small" style={{ marginBottom: 8 }}>
            Using <b>{status.provider}</b> · {status.model}
            {status.local ? ' (local)' : ''}
          </div>
        )}

        {!result && (
          <>
            <div
              className={'dropzone' + (preview ? ' has-image' : '')}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                pick(e.dataTransfer.files?.[0]);
              }}
            >
              {preview ? (
                <img src={preview} alt="Diagram preview" />
              ) : (
                <div className="dz-hint">
                  <div className="dz-icon">🖼</div>
                  <div>Drop an architecture diagram here</div>
                  <div className="muted small">PNG, JPEG, or WebP · draw.io, Visio, Lucidchart, slides, whiteboard photos</div>
                </div>
              )}
            </div>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => pick(e.target.files?.[0])}
            />
            <div className="modal-actions">
              {preview && <button onClick={reset}>Choose another</button>}
              <div className="spacer" />
              <button
                className="primary"
                onClick={analyze}
                disabled={!preview || busy || (status && !status.ready)}
              >
                {busy ? 'Analyzing diagram…' : 'Analyze diagram'}
              </button>
            </div>
            {busy && (
              <div className="muted small" style={{ marginTop: 8 }}>
                Reading boxes, labels, and arrow directions. This usually takes 10-30 seconds.
              </div>
            )}
          </>
        )}

        {result && (
          <>
            <div className="banner ok">
              Detected <b>{result.nodes.length}</b> components and <b>{result.edges.length}</b> connections
              {result.title ? ` — “${result.title}”` : ''}.
            </div>

            <div className="result-grid">
              <div>
                <div className="rem-label">Components</div>
                <div className="chip-wrap">
                  {Object.entries(counts)
                    .sort((a, b) => b[1] - a[1])
                    .map(([t, c]) => (
                      <span key={t} className="suggest-chip">
                        {specsByType?.[t]?.label || t}
                        {c > 1 ? ` ×${c}` : ''}
                      </span>
                    ))}
                </div>
              </div>

              {result.report && (
                <div>
                  <div className="rem-label">Preview score</div>
                  <div className="preview-score">
                    <span className="ps-num">{result.report.summary.overall}</span>
                    <span className="ps-grade">{result.report.summary.grade}</span>
                    <span className="muted small">
                      {result.report.summary.findingCount} findings · ${result.report.summary.monthlyCost}/mo
                    </span>
                  </div>
                </div>
              )}

              {result.warnings?.length > 0 && (
                <div>
                  <div className="rem-label">Adjusted mappings</div>
                  <ul className="mini-list">
                    {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              )}

              {result.unmapped?.length > 0 && (
                <div>
                  <div className="rem-label">Not recognized ({result.unmapped.length})</div>
                  <div className="chip-wrap">
                    {result.unmapped.map((u, i) => <span key={i} className="tag-mini">{u}</span>)}
                  </div>
                  <div className="muted small" style={{ marginTop: 4 }}>
                    Add these manually from the palette if they matter to the score.
                  </div>
                </div>
              )}

              {result.notes?.length > 0 && (
                <div>
                  <div className="rem-label">Notes from the diagram</div>
                  <ul className="mini-list">
                    {result.notes.map((n, i) => <li key={i}>{n}</li>)}
                  </ul>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button onClick={reset}>Start over</button>
              <div className="spacer" />
              <button className="primary" onClick={confirm}>Load onto canvas</button>
            </div>
          </>
        )}

        {error && <div className="banner err">{error}</div>}
      </div>
    </div>
  );
}
