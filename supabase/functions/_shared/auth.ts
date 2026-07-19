/**
 * Supabase's platform already verifies the incoming JWT's signature
 * before this function runs (Clerk is registered as this project's
 * third-party auth provider). Decoding it here just reads the `sub`
 * claim — it does not re-verify the signature. Never accept a
 * candidate/user id from the request body instead of this: that
 * would let one candidate request analysis using another's identity.
 */
export function getCallerId(req: Request): string {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const payloadSegment = token.split(".")[1];
  if (!payloadSegment) {
    throw new Error("Missing or malformed bearer token");
  }

  const payload = JSON.parse(base64UrlDecode(payloadSegment)) as { sub?: string };
  if (!payload.sub) {
    throw new Error("Token is missing a sub claim");
  }
  return payload.sub;
}

function base64UrlDecode(segment: string): string {
  const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  return atob(padded);
}
