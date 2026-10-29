import type { FakeOidc } from "./fake-oidc/index.ts";

function formAction(html: string, pageUrl: string): string {
  const match = /<form\b[^>]*\baction="([^"]*)"/i.exec(html);
  if (match === null) throw new Error("the fake login page has no form action");
  const raw = match[1] ?? "";
  return new URL(raw.replaceAll("&amp;", "&"), pageUrl).toString();
}

export async function completeFakeLogin(
  fake: FakeOidc,
  authorizationUrl: string,
  username: string,
): Promise<string> {
  const page = await fetch(authorizationUrl, { redirect: "manual" });
  if (page.status !== 200) throw new Error("the fake login page did not load");
  const action = formAction(await page.text(), authorizationUrl);

  const body = new URLSearchParams({
    username,
    password: fake.passwordOf(username),
  });
  const login = await fetch(action, {
    method: "POST",
    redirect: "manual",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (login.status !== 302) throw new Error("the fake login did not redirect");
  const location = login.headers.get("location");
  if (location === null) throw new Error("the fake login redirect has no location");
  return location;
}
