// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import { useEffect, useState } from "react";

import { createApiClient } from "../api/client.ts";
import { loadMyTeams, nameCache } from "./people.ts";

export function useDisplayNames(userIds: readonly string[]): ReadonlyMap<string, string> {
  const [names, setNames] = useState<ReadonlyMap<string, string>>(() => new Map());
  const key = JSON.stringify(userIds);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const requested = JSON.parse(key) as readonly string[];
    nameCache.resolve(requested, controller.signal).then(
      (next) => {
        if (active) setNames(next);
      },
      () => {},
    );
    return () => {
      active = false;
      controller.abort();
    };
  }, [key]);

  return names;
}

export function useMyTeams(): readonly string[] | null {
  const [teams, setTeams] = useState<readonly string[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    loadMyTeams(createApiClient(), controller.signal).then(
      (next) => {
        if (active) setTeams(next);
      },
      () => {},
    );
    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  return teams;
}
