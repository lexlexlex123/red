function _normalizeCurvePoints(pts, closed) {
  if (!pts || pts.length < 2) return;
  pts.forEach((pt, i) => {
    const isFirst = i === 0;
    const isLast = i === pts.length - 1;
    if (closed) {
      // Closed curve: all points need both handles
      // If missing cp1, create it by reflecting cp2
      if (pt.cp1x == null && pt.cp2x != null) {
        pt.cp1x = pt.x * 2 - pt.cp2x;
        pt.cp1y = pt.y * 2 - pt.cp2y;
      }
      // If missing cp2, create it by reflecting cp1
      if (pt.cp2x == null && pt.cp1x != null) {
        pt.cp2x = pt.x * 2 - pt.cp1x;
        pt.cp2y = pt.y * 2 - pt.cp1y;
      }
      // If both missing, create default handles
      if (pt.cp1x == null && pt.cp2x == null) {
        const prev = pts[(i - 1 + pts.length) % pts.length];
        const next = pts[(i + 1) % pts.length];
        const dx = (next.x - prev.x) * 0.25;
        const dy = (next.y - prev.y) * 0.25;
        pt.cp1x = pt.x - dx; pt.cp1y = pt.y - dy;
        pt.cp2x = pt.x + dx; pt.cp2y = pt.y + dy;
      }
    } else {
      // Open curve: first point has no cp1, last point has no cp2
      if (isFirst) { delete pt.cp1x; delete pt.cp1y; }
      if (isLast)  { delete pt.cp2x; delete pt.cp2y; }
      // Middle points: ensure both handles exist
      if (!isFirst && !isLast) {
        if (pt.cp1x == null && pt.cp2x != null) {
          pt.cp1x = pt.x * 2 - pt.cp2x; pt.cp1y = pt.y * 2 - pt.cp2y;
        }
        if (pt.cp2x == null && pt.cp1x != null) {
          pt.cp2x = pt.x * 2 - pt.cp1x; pt.cp2y = pt.y * 2 - pt.cp1y;
        }
      }
      // First point only needs cp2
      if (isFirst && pt.cp2x == null) {
        const next = pts[1];
        pt.cp2x = pt.x + (next.x - pt.x) * 0.4;
        pt.cp2y = pt.y + (next.y - pt.y) * 0.4;
      }
      // Last point only needs cp1
      if (isLast && pt.cp1x == null) {
        const prev = pts[pts.length - 2];
        pt.cp1x = pt.x + (prev.x - pt.x) * 0.4;
        pt.cp1y = pt.y + (prev.y - pt.y) * 0.4;
      }
    }
  });
}

// Default curve points: S-curve with 3 nodes and smooth bezier handles
function _defaultCurvePoints() {
  return [
    { x: 0.1, y: 0.7, type: 'smooth', cp2x: 0.2, cp2y: 0.3 },
    { x: 0.5, y: 0.3, type: 'smooth', cp1x: 0.3, cp1y: 0.3, cp2x: 0.7, cp2y: 0.3 },
    { x: 0.9, y: 0.7, type: 'smooth', cp1x: 0.8, cp1y: 0.3 }
  ];
}