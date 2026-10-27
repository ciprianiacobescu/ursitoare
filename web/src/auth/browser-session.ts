// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { ApiClient } from "../api/client.ts";
import type { BrowserSession } from "./session-client.ts";

const unavailableClient: ApiClient = {
  async request<T>(): Promise<T> {
    throw new Error("not implemented");
  },
  async get<T>(): Promise<T> {
    throw new Error("not implemented");
  },
  async post<T>(): Promise<T> {
    throw new Error("not implemented");
  },
  async put<T>(): Promise<T> {
    throw new Error("not implemented");
  },
  async patch<T>(): Promise<T> {
    throw new Error("not implemented");
  },
  async delete<T>(): Promise<T> {
    throw new Error("not implemented");
  },
};

export const browserSession: BrowserSession = {
  api: unavailableClient,
  logout: unavailableClient,
  async signOut() {
    throw new Error("not implemented");
  },
};
