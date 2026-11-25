# Proposal: follow-up 1 for add-web-grants

## Why
Requested by CiprianSpot, 2026-11-25T13:35:24Z in FB-001 (behaviour, web/src/tools/servers.ts:192-194, web/src/tools/servers.ts:239-241): shortDigest(null) returns an empty string and the pending branch of the state note interpolates it unconditionally, so the page shows 'Pending surface .' with nothing after it (seen in the add-web-tool-review browser run, 2026-11-25).

    function shortDigest(d: string | null): string {
      return d === null ? "" : d.slice("sha256:".length, "sha256:".length + 12);
    }
      if (s.state === "pending") {
        return `This server has not been approved. Its tools cannot be used yet. Pending surface ${shortDigest(s.pendingDigest)}.`;
      }

Requested by CiprianSpot, 2026-11-25T13:35:24Z in FB-002 (behaviour, web/src/tools/ServersPage.tsx:83-89, web/src/tools/ServersPage.tsx:106-122, web/src/tools/ServersPage.tsx:168-173): The list is a cursor list created once (useMemo with no dependencies) and loaded once; the approve, replace and discovery handlers bump only the detail's reload key, so after approving a drifted server its row still says drifted while the Surface card says approved (seen in the crypto smoke through the UI, 2026-11-25).

      const servers = useMemo(
        () =>
          createCursorList(
            cursorPageFetcher(browserSession.api, SERVERS_PATH, { parseItem: parseToolServer }),
          ),
        [],
      );
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
        void (async () => {
          try {
            await approveToolSurface(browserSession.api, id, body);
            setAction({ phase: "done", text: SURFACE_APPROVED });
            setReloadKey((current) => current + 1);
          } catch (error) {

`add-web-grants` was merged, and a person asked for the changes above in its `feedback.md`. This change carries them out; each task names the finding it answers.

## What Changes
- F-015461da: Feedback FB-001 (behaviour): Server page says 'Pending surface .' when there is no pending surface
- F-7a58d1bb: Feedback FB-002 (behaviour): Server list keeps the old state after approve, replace or discovery

## Impact
The code and the tests of `add-web-grants`.
