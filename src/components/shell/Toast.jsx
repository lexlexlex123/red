import React, { useEffect } from 'react';
import { useUiStore } from '../../stores/uiStore';

export default function Toast() {
  const toast = useUiStore((s) => s.toast);
  const clearToast = useUiStore((s) => s.clearToast);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(clearToast, 3200);
    return () => clearTimeout(t);
  }, [toast, clearToast]);

  if (!toast) return null;

  return (
    <div className="toast-host" role="status">
      <div className={`toast ${toast.type || ''}`.trim()}>{toast.msg}</div>
    </div>
  );
}
