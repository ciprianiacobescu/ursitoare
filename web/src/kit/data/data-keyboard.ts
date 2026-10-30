import type { KeyBinding } from "../keyboard.ts";

export const DATA_KEYBOARD: Readonly<Record<string, readonly KeyBinding[]>> = {
  DataTable: [
    { keys: "Tab", effect: "Table region, then Load more or Try again." },
    {
      keys: "Enter",
      effect:
        "Activates the button; focus stays on Load more, or moves to the table region or to Try again.",
    },
  ],
  Field: [
    {
      keys: "Tab",
      effect: "Moves between controls; hint and error are read with the control.",
    },
  ],
  Form: [{ keys: "Enter", effect: "Submits from a text input." }],
  SchemaForm: [{ keys: "Tab", effect: "As Form; an Unsupported field has no control." }],
};
