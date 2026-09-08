import React from 'react';

const CHEV_L =
  '<path d="M15 5L8 12l7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>';
const CHEV_R =
  '<path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>';

/** Centered pager like legacy #icon-pager (chevron buttons + «n / total»). */
export default function PickerPager({ page, totalPages, onPrev, onNext, hidden }) {
  if (hidden || totalPages <= 1) return null;
  return (
    <div className="picker-pager" role="navigation" aria-label="Pages">
      <button
        type="button"
        className="picker-pager-btn"
        disabled={page <= 0}
        aria-label="Prev"
        onClick={onPrev}
      >
        <svg className="picker-pager-chev" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" dangerouslySetInnerHTML={{ __html: CHEV_L }} />
      </button>
      <span className="picker-pager-lab">
        {page + 1} / {totalPages}
      </span>
      <button
        type="button"
        className="picker-pager-btn"
        disabled={page >= totalPages - 1}
        aria-label="Next"
        onClick={onNext}
      >
        <svg className="picker-pager-chev" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" dangerouslySetInnerHTML={{ __html: CHEV_R }} />
      </button>
    </div>
  );
}
