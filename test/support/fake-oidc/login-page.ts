function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderLoginPage(view: {
  action: string;
  username?: string;
  error?: string;
}): string {
  const action = escapeHtml(view.action);
  const usernameValue =
    view.username === undefined ? "" : ` value="${escapeHtml(view.username)}"`;
  const error =
    view.error === undefined
      ? ""
      : `<p id="input-error" role="alert">${escapeHtml(view.error)}</p>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sign in to ursitoare</title>
<style>
body { margin: 0; background: #fff; color: #1a1a1a; font-family: system-ui, sans-serif; }
main { max-width: 24rem; margin: 4rem auto; padding: 1.5rem; }
h1 { font-size: 1.5rem; }
label { display: block; margin-top: 1rem; }
input { display: block; width: 100%; padding: 0.5rem; box-sizing: border-box; }
button { margin-top: 1.5rem; padding: 0.5rem 1rem; }
input:focus, button:focus, a:focus { outline: 3px solid #0b5fff; outline-offset: 2px; }
#input-error { color: #b00020; }
</style>
</head>
<body>
<main>
<h1>Sign in</h1>
${error}
<form id="kc-form-login" method="post" action="${action}">
<label for="username">Username or email</label>
<input id="username" name="username" type="text" autocomplete="username"${usernameValue}>
<label for="password">Password</label>
<input id="password" name="password" type="password" autocomplete="current-password">
<button id="kc-login" type="submit">Sign In</button>
</form>
</main>
</body>
</html>
`;
}
