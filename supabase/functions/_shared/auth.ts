import { createRemoteJWKSet, jwtVerify } from "npm:jose@5";

export async function getCallerId(req: Request): Promise<string> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) {
    throw new Error("Missing bearer token");
  }

  const segments = token.split(".");
  if (segments.length !== 3) {
    throw new Error("Malformed bearer token");
  }

  const payloadSegment = segments[1];
  const payload = JSON.parse(base64UrlDecode(payloadSegment)) as { sub?: string; iss?: string };
  if (!payload.iss) {
    throw new Error("Token is missing an iss claim");
  }

  const issUrl = new URL(payload.iss);
  const hostname = issUrl.hostname;
  const isValidClerkDomain = hostname.endsWith(".clerk.accounts.dev") ||
                             (Deno.env.get("CLERK_JWT_ISSUER") && payload.iss === Deno.env.get("CLERK_JWT_ISSUER"));

  if (!isValidClerkDomain) {
    throw new Error(`Unauthorized: Issuer ${payload.iss} is not a valid Clerk domain`);
  }

  const jwksUrl = new URL("/.well-known/jwks.json", payload.iss);
  const JWKS = createRemoteJWKSet(jwksUrl);

  const { payload: verifiedPayload } = await jwtVerify(token, JWKS, {
    issuer: payload.iss,
  });

  if (!verifiedPayload.sub) {
    throw new Error("Token is missing a sub claim");
  }
  return verifiedPayload.sub;
}

function base64UrlDecode(segment: string): string {
  const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  return atob(padded);
}

