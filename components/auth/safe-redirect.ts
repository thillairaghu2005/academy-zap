/**
 * Safe redirect-path helper — kept in a separate file so login-form.tsx
 * (component) is a pure React module and Vite/react-refresh Fast Refresh
 * can hot-replace form state across edits without a full reload.
 *
 * Also consumed by register-form.tsx without pulling in the login form component.
 */

/**
 * Accept only a normalized same-origin path. Reject URL parser edge cases
 * such as protocol-relative, backslash, encoded-slash, and control values.
 */
export function safeNext(next: string | undefined): string {
  if (
    !next ||
    next.length > 2048 ||
    !next.startsWith("/") ||
    next.startsWith("//") ||
    next.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(next)
  ) {
    return "/dashboard";
  }

  try {
    const base = "https://zapsters.invalid";
    const target = new URL(next, base);
    const decodedPath = decodeURIComponent(target.pathname);
    if (
      target.origin !== base ||
      decodedPath.startsWith("//") ||
      decodedPath.includes("\\") ||
      /[\u0000-\u001f\u007f]/.test(decodedPath)
    ) {
      return "/dashboard";
    }
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return "/dashboard";
  }
}
