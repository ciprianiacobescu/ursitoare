import { useEffect, useSyncExternalStore, type ReactNode } from "react";

import { focusAfterDismiss, toastQueue } from "./toast.ts";

export function ToastRegion(): ReactNode {
  const items = useSyncExternalStore(toastQueue.subscribe, toastQueue.list);
  const nextExpiry = toastQueue.nextExpiry();

  useEffect(() => {
    if (nextExpiry === null) return undefined;
    const delay = Math.max(0, nextExpiry - Date.now());
    const timer = setTimeout(() => {
      toastQueue.expire();
    }, delay);
    return () => {
      clearTimeout(timer);
    };
  }, [nextExpiry]);

  const dismiss = (id: string, index: number): void => {
    const remainingIds = toastQueue
      .list()
      .filter((item) => item.id !== id)
      .map((item) => item.id);
    toastQueue.dismiss(id);
    const target = focusAfterDismiss(remainingIds, index);
    if (target.kind === "main") {
      document.getElementById("main")?.focus();
    } else {
      document.getElementById(`toast-${target.id}-dismiss`)?.focus();
    }
  };

  return (
    <div className="ui-toasts" aria-live="polite" aria-atomic="false">
      {items.map((item, index) => (
        <div key={item.id} className="ui-toast">
          <p id={`toast-${item.id}-text`}>{item.message}</p>
          <button
            type="button"
            className="ui-button"
            id={`toast-${item.id}-dismiss`}
            aria-describedby={`toast-${item.id}-text`}
            onClick={() => dismiss(item.id, index)}
          >
            Dismiss
          </button>
        </div>
      ))}
    </div>
  );
}
