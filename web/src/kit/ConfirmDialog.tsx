import { useEffect, useId, useRef, type ReactNode } from "react";

import { confirmDialogModel, dialogOutcome, type ConfirmDialogProps } from "./confirm.ts";

export function ConfirmDialog(props: ConfirmDialogProps): ReactNode {
  const model = confirmDialogModel(props);
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<Element | null>(null);
  const callbacksRef = useRef({
    onConfirm: props.onConfirm,
    onCancel: props.onCancel,
  });
  callbacksRef.current = {
    onConfirm: props.onConfirm,
    onCancel: props.onCancel,
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) return;
    if (props.open) {
      if (!dialog.open) {
        dialog.returnValue = "";
        openerRef.current = document.activeElement;
        dialog.showModal();
      }
      const target = model.initialFocus === "cancel" ? cancelRef.current : confirmRef.current;
      target?.focus();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [props.open, model.initialFocus]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) return;
    const handleClose = (): void => {
      if (dialogOutcome(dialog.returnValue) === "confirmed") {
        callbacksRef.current.onConfirm();
      } else {
        callbacksRef.current.onCancel();
      }
      const opener = openerRef.current;
      if (opener instanceof HTMLElement && opener.isConnected) {
        opener.focus();
      }
      openerRef.current = null;
    };
    dialog.addEventListener("close", handleClose);
    return () => {
      dialog.removeEventListener("close", handleClose);
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="ui-dialog"
      aria-labelledby={titleId}
      {...(model.description === null ? {} : { "aria-describedby": descriptionId })}
    >
      <form method="dialog">
        <h2 id={titleId}>{model.title}</h2>
        {model.description === null ? null : <p id={descriptionId}>{model.description}</p>}
        <div className="ui-dialog-actions">
          <button ref={cancelRef} type="submit" value="cancel" className="ui-button">
            {model.cancelLabel}
          </button>
          <button ref={confirmRef} type="submit" value="confirm" className="ui-button">
            {model.confirmLabel}
          </button>
        </div>
      </form>
    </dialog>
  );
}
