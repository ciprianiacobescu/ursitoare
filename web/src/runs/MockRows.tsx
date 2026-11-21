import { useId, type ReactNode } from "react";

import { Button } from "../ui/button.tsx";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible.tsx";
import { answerLabel } from "./mock-rows.ts";
import type { MockNode, MockRow } from "./mock-rows.ts";

export interface MockRowsProps {
  nodes: readonly MockNode[];
  rows: readonly MockRow[];
  answerErrors: Readonly<Record<string, string>>;
  openIds?: readonly string[];
  notes?: Readonly<Record<string, string>>;
  onAnswer: (nodeId: string, index: number, value: string) => void;
  onAdd: (nodeId: string) => void;
  onRemove: (nodeId: string, index: number) => void;
}

export function MockRows(props: MockRowsProps): ReactNode {
  const idPrefix = useId();
  return (
    <div className="flex flex-col gap-2">
      {props.nodes.map((node) => {
        const answers = props.rows.find((row) => row.nodeId === node.nodeId)?.answers ?? [];
        const shown = answers.length === 0 ? [""] : answers;
        return (
          <Collapsible
            key={`${node.nodeId}:${props.openIds?.includes(node.nodeId) === true}`}
            {...(props.openIds?.includes(node.nodeId) ? { defaultOpen: true } : {})}
            className="rounded-md border border-border"
          >
            <div className="flex items-center justify-between gap-2 px-3 py-2">
              <CollapsibleTrigger className="text-left font-medium">{`Answers for ${node.nodeId}`}</CollapsibleTrigger>
              <span className="text-sm text-muted-foreground">
                {answers.length} {answers.length === 1 ? "answer" : "answers"}
                {node.uses === "" ? "" : ` · ${node.uses}`}
              </span>
            </div>
            <CollapsibleContent className="px-3 pb-3">
              {props.notes?.[node.nodeId] === undefined ? null : (
                <p className="ui-field-error">{props.notes[node.nodeId]}</p>
              )}
              {shown.map((answer, index) => {
                const label = answerLabel(node.nodeId, index);
                const error = props.answerErrors[label] ?? null;
                const id = `${idPrefix}-${node.nodeId}-${index}`;
                return (
                  <div className="ui-field" key={id}>
                    <div className="flex items-start gap-2">
                      <label className="ui-field-label" htmlFor={id}>
                        {label}
                      </label>
                      <Button
                        size="sm"
                        className="ml-auto"
                        aria-label={`Remove output ${index + 1} for ${node.nodeId}`}
                        onClick={() => props.onRemove(node.nodeId, index)}
                      >
                        Remove
                      </Button>
                    </div>
                    <textarea
                      id={id}
                      className="ui-input"
                      rows={3}
                      value={answer}
                      {...(error === null ? {} : { "aria-invalid": true, "aria-describedby": `${id}-error` })}
                      onChange={(event) => props.onAnswer(node.nodeId, index, event.target.value)}
                    />
                    {error === null ? null : (
                      <p id={`${id}-error`} className="ui-field-error">
                        <span className="ui-visually-hidden">Error: </span>
                        {error}
                      </p>
                    )}
                  </div>
                );
              })}
              <Button size="sm" aria-label={`Add an answer for ${node.nodeId}`} onClick={() => props.onAdd(node.nodeId)}>
                Add an answer
              </Button>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
}
