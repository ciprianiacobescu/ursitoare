export function toolNameOf(external: string): string | null {
  const separated = external.replace(/([a-z0-9])([A-Z])/g, "$1_$2");
  const replaced = separated.toLowerCase().replace(/[^a-z0-9_]/g, "_");
  const collapsed = replaced.replace(/_+/g, "_").replace(/^_+|_+$/g, "");
  if (collapsed.length === 0) return null;
  const prefixed = /^[a-z]/.test(collapsed) ? collapsed : `t_${collapsed}`;
  return prefixed.slice(0, 64);
}
