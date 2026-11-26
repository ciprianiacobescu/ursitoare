import type { ReactNode } from "react";

import { fillName, TRUST_NAMES, TRUST_WARNING } from "./trust.ts";
import type { DataClass } from "./trust.ts";

export function TrustToggle(props: {
  name: string;
  describedBy: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}): ReactNode {
  return (
    <label className="tools-checkbox">
      <input
        type="checkbox"
        aria-label={fillName(TRUST_NAMES["trustedOf"] ?? "", props.name)}
        aria-describedby={props.describedBy}
        checked={props.checked}
        onChange={(event) => props.onChange(event.target.checked)}
      />
    </label>
  );
}

export function DataClassSelect(props: {
  name: string;
  value: DataClass | null;
  onChange: (value: DataClass | null) => void;
}): ReactNode {
  return (
    <select
      className="ui-input"
      aria-label={fillName(TRUST_NAMES["dataClassOf"] ?? "", props.name)}
      value={props.value ?? ""}
      onChange={(event) => {
        const value = event.target.value;
        props.onChange(value === "public" || value === "private" ? value : null);
      }}
    >
      <option value="">{TRUST_NAMES["notSet"] ?? ""}</option>
      <option value="public">public</option>
      <option value="private">private</option>
    </select>
  );
}

export function TrustNotes(props: {
  warningId: string;
  shown: readonly string[];
  ticks: Readonly<Record<string, boolean>>;
  onTick: (name: string, ticked: boolean) => void;
}): ReactNode {
  return (
    <>
      <p id={props.warningId}>{TRUST_WARNING}</p>
      {props.shown.map((name) => (
        <label className="tools-checkbox" key={name}>
          <input
            type="checkbox"
            checked={props.ticks[name] === true}
            onChange={(event) => props.onTick(name, event.target.checked)}
          />
          {fillName(TRUST_NAMES["ackOf"] ?? "", name)}
        </label>
      ))}
    </>
  );
}
