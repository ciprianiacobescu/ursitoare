Declarations this change takes or copies cells from, copied from main@3daa5c35 and checked line by line (page line numbers are counted on main; U15c has deleted each page's stylesheet import line before this unit starts). This unit edits only the seven page files, `admin.css` and `tools.css`.

```ts
// web/src/admin/users.ts:5-14, :16-23, :25-30, :96-103, :105-135
interface AccountRow { userId: string; kind: "human" | "service"; displayName: string; email: string | null; state: "active" | "disabled"; roles: string[]; teams: string[]; localRoles: string[] }
type AccountAction = { kind: "none"; note: string } | { kind: "disable" | "enable"; buttonLabel: string; confirm: ConfirmSpec | null; done: string }
interface AccountCells { name: string; email: string; state: string; rolesTeams: string }
function accountCells(account: AccountRow): AccountCells   // state: "Active" or "Disabled"
function accountAction(account: AccountRow, selfId: string | null): AccountAction   // active: confirm.action "Disable user"; disabled: confirm null
// web/src/admin/shared.ts:5-9, :15
interface ConfirmSpec { title: string; description: string; action: string }
function clip(text: string, max = 80): string
// web/src/admin/mappings.ts:8-14, :25-30, :98-105, :186-199
interface MappingRow { issuer: string; group: string; roleId: string | null; teamId: string | null; reviewedBy: string }
interface MappingCells { group: string; grants: string; issuer: string; reviewedBy: string }
function mappingCells(m: MappingRow): MappingCells   // reviewedBy: clip(m.reviewedBy); this unit's cell is clip(personLabel(names, m.reviewedBy))
function removeMappingConfirm(m: MappingRow): ConfirmSpec   // action "Remove mapping" (:181)
// web/src/admin/teams.ts:33-39
function deleteTeamConfirm(teamId: string): ConfirmSpec   // action "Delete team"
// web/src/admin/audit.ts:8-15, :17-24, :108
interface AuditEvent { seq: string; at: string; eventType: string; actor: { kind: string; id: string }; target: { kind: string; id: string } | null; payload: Record<string, unknown> }
interface AuditCells { seq: string; time: string; type: string; actor: string; target: string; details: string }   // actor `${kind}: ${id}`, time `YYYY-MM-DD HH:mm:ss UTC`
// web/src/admin/pages.ts:48, web/src/tools/pages.ts:41, :71, :100, :125
const ADMIN_TABLES: Readonly<Record<"users" | "roles" | "teams" | "mappings" | "audit", DataTableSpec>>   // captions "Users", "Roles", "Teams", "Group mappings", "Audit events"
const TOOL_TABLES: Readonly<Record<"servers" | "tools" | "grants", DataTableSpec>>   // captions "Tool servers", "Tools", "Grants"
const TOOL_NAMES: Readonly<Record<string, string>>   // surfaceHeading "Surface", grantForm "New grant", deployHint "Grant changes take effect when you deploy the policy.", cedarField "Hand-written Cedar"
function regionState<T>(load: RegionLoad<T>, isEmpty?: (value: T) => boolean): { view: "loading" | "error" | "empty" | "ready"; actionsDisabled: boolean }
function actionState(a: ActionPhase): { disabled: boolean; status: { role: "status" | "alert"; text: string } | null }
// web/src/tools/servers.ts:7-24 (fields used: id, origin, state: "pending" | "approved" | "drifted", registeredBy: string), :196-198
function serverRowText(s: ToolServerView): string   // `${s.id} · ${s.origin} · ${s.state}`
// web/src/tools/grants.ts:6-12, :61-63
interface GrantView { id: string; subject: string; tool: string; scope: string; status: "active" | "needs_reconfirm" | "revoked" }
function grantRowText(g: GrantView): string   // `${g.subject} · ${g.tool} · ${g.scope} · ${g.status}`; subject `role author` or `user u_bob`
// web/src/kit/data/data-table.ts:5-16
interface DataTableSpec { caption: string; columns: readonly DataColumn[]; emptyTitle?: string; emptyDescription?: string }
// web/src/kit/confirm.ts:3-10, :76
interface ConfirmDialogProps { open: boolean; title: string; description?: string; action: string; destructive?: boolean; onConfirm: () => void; onCancel: () => void }   // initialFocus "cancel" when destructive
// web/src/kit/contrast.ts:18-21, :146, :166
interface SourceHit { line: number; text: string }
function findRawColours(css: string): SourceHit[]
function findInlineStyleUse(source: string): SourceHit[]
```

Page facts: `ConfirmDialog` is used at `UsersPage.tsx:140` (no `destructive`), `TeamsPage.tsx:202` (`destructive` at :207), `MappingsPage.tsx:304` (:309) and `ServersPage.tsx:258` (not destructive). `GrantsPage.tsx:153-168` revokes on the click, with no dialog. `MappingsPage.tsx:117` already calls `list.subscribe(sync)` for the default issuer.
