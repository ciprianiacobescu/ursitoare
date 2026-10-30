export interface KeyBinding {
  keys: string;
  effect: string;
}

export const KEYBOARD: Readonly<Record<string, readonly KeyBinding[]>> = {
  EmptyState: [
    { keys: "Tab", effect: "Reaches the action given as children; the component takes no focus." },
  ],
  LoadingState: [
    { keys: "none", effect: "Not interactive; announced politely, takes no focus." },
  ],
  ErrorPanel: [
    { keys: "Tab", effect: "Moves to the Copy decision id button when a decision id is shown." },
    { keys: "Enter or Space", effect: "Copies the decision id." },
  ],
  ConfirmDialog: [
    { keys: "Tab and Shift+Tab", effect: "Cycle through the dialog buttons; the rest of the page is inert." },
    { keys: "Enter or Space", effect: "Activates the focused button." },
    { keys: "Escape", effect: "Cancels; focus returns to the opener." },
  ],
  ToastRegion: [
    { keys: "Tab", effect: "Reaches the Dismiss buttons, which come last in page order." },
    { keys: "Enter or Space", effect: "Dismisses the toast; focus moves to the next toast or to the main area." },
  ],
} satisfies Record<string, readonly KeyBinding[]>;
