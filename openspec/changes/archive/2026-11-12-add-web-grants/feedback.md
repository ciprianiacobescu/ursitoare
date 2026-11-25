# Feedback — add-web-grants

<!-- l4:feedback v1
Ask for changes here while the unit's branch is open. The easy way is `l4 feedback add` (see `l4 feedback --help`).
An item is read only when its **Status** is `submitted`; `draft` items wait and `withdrawn` items are ignored.
Kinds: refactor · duplication · tests · config · behaviour (see docs/feedback.md).
Do not change item IDs. Commit and push to the l4/… branch: the harness takes submitted items at its next
verification round, turns them into a fix unit and checks that each one was addressed. -->

<!-- l4:feedback-index:start -->
| ID | Status | Kind | Where | Feedback |
|----|--------|------|-------|----------|
| FB-001 | taken | behaviour | web/src/tools/servers.ts:192 | Server page says 'Pending surface .' when there is no pending surface |
| FB-002 | taken | behaviour | web/src/tools/ServersPage.tsx:83 | Server list keeps the old state after approve, replace or discovery |
<!-- l4:feedback-index:end -->

---

## FB-001: Server page says 'Pending surface .' when there is no pending surface

- **Status:** taken
- **Kind:** behaviour
- **Where:** `web/src/tools/servers.ts:192-194`
- **Where:** `web/src/tools/servers.ts:239-241`
- **Lesson:** no
- **By:** CiprianSpot, 2026-11-25T13:35:24Z

### Code
`web/src/tools/servers.ts:192-194`
```typescript
function shortDigest(d: string | null): string {
  return d === null ? "" : d.slice("sha256:".length, "sha256:".length + 12);
}
```
`web/src/tools/servers.ts:239-241`
```typescript
  if (s.state === "pending") {
    return `This server has not been approved. Its tools cannot be used yet. Pending surface ${shortDigest(s.pendingDigest)}.`;
  }
```

### Feedback
shortDigest(null) returns an empty string and the pending branch of the state note interpolates it unconditionally, so the page shows 'Pending surface .' with nothing after it (seen in the add-web-tool-review browser run, 2026-11-25).

### When / Then
- **When:** a server in state pending has no pending surface yet (pendingDigest is null), as an MCP server has after registration and before its first discovery
- **Then:** the Surface card's state note mentions no digest and reads 'This server has not been approved. Its tools cannot be used yet. No surface has been submitted yet.'; with a pending digest it still ends with 'Pending surface ' and the 12-character digest

### Outcome
<!-- written by the harness -->
Taken into add-web-grants-followup-1

---

## FB-002: Server list keeps the old state after approve, replace or discovery

- **Status:** taken
- **Kind:** behaviour
- **Where:** `web/src/tools/ServersPage.tsx:83-89`
- **Where:** `web/src/tools/ServersPage.tsx:106-122`
- **Where:** `web/src/tools/ServersPage.tsx:168-173`
- **Lesson:** no
- **By:** CiprianSpot, 2026-11-25T13:35:24Z

### Code
`web/src/tools/ServersPage.tsx:83-89`
```
  const servers = useMemo(
    () =>
      createCursorList(
        cursorPageFetcher(browserSession.api, SERVERS_PATH, { parseItem: parseToolServer }),
      ),
    [],
  );
```
`web/src/tools/ServersPage.tsx:106-122`
```
  useEffect(() => {
    if (serverId === null) return undefined;
    const controller = new AbortController();
    setDetail({ phase: "loading" });
    setTicked(false);
    void loadServerReview(browserSession.api, serverId, controller.signal).then(
      (review) => {
        if (!controller.signal.aborted) setDetail({ phase: "ready", value: review });
      },
      (error: unknown) => {
        if (!controller.signal.aborted) setDetail({ phase: "error", error });
      },
    );
    return () => {
      controller.abort();
    };
  }, [serverId, reloadKey]);
```
`web/src/tools/ServersPage.tsx:168-173`
```
    void (async () => {
      try {
        await approveToolSurface(browserSession.api, id, body);
        setAction({ phase: "done", text: SURFACE_APPROVED });
        setReloadKey((current) => current + 1);
      } catch (error) {
```

### Feedback
The list is a cursor list created once (useMemo with no dependencies) and loaded once; the approve, replace and discovery handlers bump only the detail's reload key, so after approving a drifted server its row still says drifted while the Surface card says approved (seen in the crypto smoke through the UI, 2026-11-25).

### When / Then
- **When:** an admin approves a pending or drifted surface, replaces a server's document, or discovers its tools again on the tool servers page
- **Then:** the server list on the same page is loaded again and the server's row shows its new state (for example approved), as the Surface card does, without reloading the page

### Outcome
<!-- written by the harness -->
Taken into add-web-grants-followup-1
