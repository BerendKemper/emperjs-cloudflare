const DEFAULT_FRONTEND_ORIGIN = `https://emperjs.com`;

const decodeBase64Url = (value: string): string => {
  const base64 = value.replace(/-/g, `+`).replace(/_/g, `/`);
  const normalized = base64 + `=`.repeat((4 - (base64.length % 4)) % 4);
  return atob(normalized);
};

const parseState = (state: string): string | null => {
  try {
    const json = JSON.parse(decodeBase64Url(state)) as { returnTo?: string };
    if (typeof json.returnTo === `string`) return json.returnTo;
  } catch {
    // ignored, fall back to plain state value
  }

  return state || null;
};

export const getFrontendOrigin = (frontendOrigin?: string): string =>
  frontendOrigin || DEFAULT_FRONTEND_ORIGIN;

export const resolveReturnTo = (
  state: string | null,
  frontendOrigin?: string
): string => {
  const origin = getFrontendOrigin(frontendOrigin);
  if (!state) return origin;

  const returnTo = parseState(state);
  if (!returnTo) return origin;

  if (returnTo.startsWith(`/`)) {
    return new URL(returnTo, origin).toString();
  }

  try {
    const parsed = new URL(returnTo);
    if (parsed.origin === new URL(origin).origin) {
      return parsed.toString();
    }
  } catch {
    return origin;
  }

  return origin;
};
