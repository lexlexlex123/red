import { useEffect, useState } from 'react';

/** Mobile / compact editor chrome (horizontal thumbs, props sheet, no color bar). */
export const MOBILE_MQ = '(max-width: 900px)';

export function useMobileLayout() {
  const [on, setOn] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(MOBILE_MQ).matches : false
  );
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ);
    const sync = () => setOn(mq.matches);
    sync();
    mq.addEventListener?.('change', sync);
    mq.addListener?.(sync);
    return () => {
      mq.removeEventListener?.('change', sync);
      mq.removeListener?.(sync);
    };
  }, []);
  return on;
}
