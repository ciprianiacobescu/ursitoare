# Delivered shapes taken by add-keycloak-realm

Declarations from main@31968a29 (`file:line`; `…` elides unused members), each read in the file named. Every unit named here is merged and archived: U09 `add-fake-oidc` (the fake), U10 `add-identity-model` (`route.ts`), U12 `add-oidc-login` (`login.ts`, `logout.ts`, `callback.ts`, `id-token.ts`), U17 `add-roles-and-memberships` (`sync.ts`, `bootstrap.ts`, `names.ts`); none is in this plan. The in-plan names (`planSecrets`, `SECRET_FILES`, `ENV_KEYS`) are in the Interfaces given of `add-init-secrets`.

```ts
// test/support/fake-oidc (U09)
fake-oidc/seed.ts:3        export const ORGANIZATIONS = ["org-a", "org-b"] as const;
fake-oidc/seed.ts:51-56    export const USERS: readonly SeedUser[]   // alice org-a [ursitoare-authors, team-finance]; bob org-a [ursitoare-approvers, team-finance]; carol org-a [ursitoare-admins]; mallory org-b [ursitoare-authors]
fake-oidc/seed.ts:58-61    export const CLIENTS: readonly SeedClient[]   // { clientId: "ursitoare-engine", confidential: true }, { clientId: "ursitoare-mcp", confidential: false }
fake-oidc/types.ts:25-32   export type MintOptions = Readonly<{ user?: string; clientId?: string; kind?: "id" | "access"; flaw?: MintFlaw; nonce?: string; scope?: string }>
fake-oidc/types.ts:43-52   export interface FakeOidc { readonly issuer: string; readonly url: string; clientSecret(clientId: string): string; passwordOf(username: string): string; mintToken(opts: MintOptions): string; …; close(): Promise<void> }
fake-oidc/server.ts:308    export async function startFakeOidc(opts: { port?: number; host?: string; now?: () => Date; redirectUri?: string } = {}): Promise<FakeOidc>   // port defaults to 0 and host to 127.0.0.1 (server.ts:252, :257); the tests close it in `t.after`
fake-oidc/jwt.ts:14-18     export type DecodedJwt = Readonly<{ header: Record<string, unknown>; payload: Record<string, unknown>; signature: Buffer }>
fake-oidc/jwt.ts:69        export function decodeJwt(token: string): DecodedJwt
fake-oidc/index.ts         re-exports startFakeOidc, decodeJwt, oidcContract (the test imports USERS and CLIENTS from ./seed.ts)
```

What the fake emits and what its contract asserts (the realm's claims are compared with these):

- `fake-oidc/tokens.ts:26` `DEFAULT_SCOPE = "openid profile email organization"`; `:28-30` `hasOrganization(scope)` is true when the scope list holds `organization`.
- `fake-oidc/tokens.ts:32-54` `commonClaims`: `iss`, `sub`, `azp` (the client id), `iat`, `exp`, `email`, `email_verified`, `name`, `preferred_username`, `groups: [...user.groups]` (plain names), and `organization: [user.organization]` only when the scope holds `organization`. `:60-70` an ID token adds `typ: "ID"`, `aud` (the client id), `auth_time`, `nonce`.
- `fake-oidc/contract.ts:8-16` `OidcContractCredentials` (`clientId`, `clientSecret`, `redirectUri`, `username`, `password`, `organization`, `groups`); `:267-298` `checkClaims`: `organization` deep-equals `[credentials.organization]`; `groups` is an array holding every credential group and no entry starting with `/`.
- `fake-oidc/contract.ts:393-410` `checkLogout`: sends `post_logout_redirect_uri = credentials.redirectUri` with the ID token as hint and expects a 302 whose `Location` starts with that URI and keeps `state`; `fake-oidc/session.ts:131-135` accepts a target held in the client's redirect URIs or in its post-logout URIs.
- `fake-oidc/contract.ts:416-476` `oidcContract(baseUrl, credentials)` has ten rows (names in `test-plan.md` § STACK-ONLY and U61c); the login form it reads is `<form id="kc-form-login" …>` (`:110-119`) and one POST carries `username` and `password` (`:121-132`).

```ts
// src/identity (U12, U17), exported from src/identity/index.ts
identity/rbac/sync.ts:48       export function groupsFromIdToken(idToken: string): string[]   // decodes the payload without verifying; keeps unique well-formed non-empty names of at most 255 characters (max 1000); [] when `groups` is not an array
identity/route.ts:12-26        export function organizationFromClaim(organization: unknown): string   // a one-entry array or a string; [] or 2+ entries or a non-string throws IdentityError IDENTITY_NO_ORGANIZATION / IDENTITY_AMBIGUOUS_ORGANIZATION
identity/rbac/bootstrap.ts:66  export function bootstrapAdminGroup(env: Readonly<Record<string, string | undefined>>): string   // `URSITOARE_BOOTSTRAP_ADMIN_GROUP` or DEFAULT_BOOTSTRAP_ADMIN_GROUP
identity/rbac/names.ts:15      export const DEFAULT_BOOTSTRAP_ADMIN_GROUP: string = "ursitoare-admins"   // re-exported at identity/index.ts:58-62
```

What the engine sends and reads (the realm values trace to these lines): `identity/oidc/login.ts:20` `SCOPE = "openid profile email organization"`, `:62` and `callback.ts:90` `redirectUri = ${publicBaseUrl}/auth/oidc/callback`, `:93` `code_challenge_method=S256`; `logout.ts:12`, `:37` `signInUrl = ${publicBaseUrl}/sign-in`, `:79-81` `id_token_hint`, `post_logout_redirect_uri`, `client_id`; `id-token.ts:98-142` `iss` equals the issuer, `aud` holds the client id, `sub` is 1 to `MAX_SUBJECT_LENGTH` characters, `organization` passes through unchecked, `email`, `name`, `preferred_username` are optional text.
