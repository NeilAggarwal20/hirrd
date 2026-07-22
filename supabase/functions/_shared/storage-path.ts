export function resolveResumeObjectPath(
  bucketName: string,
  resumeUrl: string
): string {
  const trimmed = resumeUrl.trim();

  if (!/^https?:\/\//i.test(trimmed)) {
    return trimmed.replace(/^\/+/, "");
  }

  const url = new URL(trimmed);
  const marker = "/object/";
  const markerIndex = url.pathname.indexOf(marker);

  if (markerIndex === -1) {
    throw new Error(
      `resume_url is a URL but doesn't look like a Supabase storage object URL: ${trimmed}`
    );
  }

  const afterObject = url.pathname.slice(markerIndex + marker.length);
  const segments = afterObject.split("/").filter(Boolean);

  const [, bucketInUrl, ...pathSegments] = segments;

  if (bucketInUrl !== bucketName) {
    throw new Error(
      `resume_url points at bucket "${bucketInUrl}", expected "${bucketName}"`
    );
  }

  return decodeURIComponent(pathSegments.join("/"));
}