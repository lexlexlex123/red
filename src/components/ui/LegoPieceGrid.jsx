import React from 'react';
import { LEGO_PIECES, legoPreviewSvg } from '../../editor/lego.js';

function PieceCard({ p, color, selectedId, ru, onPointerDrag, onPick }) {
  return (
    <button
      type="button"
      className={`lego-card${selectedId === p.id ? ' is-selected' : ''}`}
      title={ru ? p.labelRu : p.labelEn}
      onPointerDown={onPointerDrag ? (e) => onPointerDrag(e, p) : undefined}
      onClick={() => {
        if (onPointerDrag) return;
        onPick?.(p);
      }}
    >
      <span
        className="lego-card-preview"
        dangerouslySetInnerHTML={{ __html: legoPreviewSvg(p, color) }}
      />
      <span className="lego-card-label">{ru ? p.labelRu : p.labelEn}</span>
    </button>
  );
}

export default function LegoPieceGrid({
  color,
  selectedId,
  onPick,
  onPointerDrag,
  ru,
}) {
  const side = LEGO_PIECES.filter((p) => p.view !== 'top');
  const top = LEGO_PIECES.filter((p) => p.view === 'top');
  return (
    <div className="lego-gallery-wrap">
      <div className="lego-gallery-hdr">{ru ? 'Сбоку' : 'Side'}</div>
      <div className="lego-gallery">
        {side.map((p) => (
          <PieceCard
            key={p.id}
            p={p}
            color={color}
            selectedId={selectedId}
            ru={ru}
            onPointerDrag={onPointerDrag}
            onPick={onPick}
          />
        ))}
      </div>
      <div className="lego-gallery-hdr">{ru ? 'Сверху' : 'Top'}</div>
      <div className="lego-gallery">
        {top.map((p) => (
          <PieceCard
            key={p.id}
            p={p}
            color={color}
            selectedId={selectedId}
            ru={ru}
            onPointerDrag={onPointerDrag}
            onPick={onPick}
          />
        ))}
      </div>
    </div>
  );
}
