import { supabase } from "@/lib/supabase";

function sanitizeFileName(fileName: string): string {
  const ext = fileName.split(".").pop() ?? "";
  const stem = fileName.slice(0, fileName.length - ext.length - 1);
  const safeStem = stem.replace(/[^a-zA-Z0-9-_]/g, "-").slice(0, 60);
  return `${safeStem}-${Date.now()}.${ext}`;
}

export async function uploadCompanyLogo(recruiterId: string, file: File): Promise<string> {
  const path = `${recruiterId}/${sanitizeFileName(file.name)}`;
  const { error } = await supabase.storage.from("company-logos").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from("company-logos").getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteCompanyLogo(path: string): Promise<void> {
  // Accepts either a full public URL or a bare storage path.
  const key = path.includes("/company-logos/") ? path.split("/company-logos/")[1] : path;
  const { error } = await supabase.storage.from("company-logos").remove([key]);
  if (error) throw error;
}

export async function uploadResume(candidateId: string, file: File): Promise<string> {
  const path = `${candidateId}/${sanitizeFileName(file.name)}`;
  const { error } = await supabase.storage.from("resumes").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  // resumes is a private bucket — we store the bare object path (not a
  // public URL) and mint a signed URL on demand when someone needs to
  // view it (see getResumeSignedUrl).
  return path;
}

export async function getResumeSignedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from("resumes").createSignedUrl(path, 60 * 10);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteResume(path: string): Promise<void> {
  const { error } = await supabase.storage.from("resumes").remove([path]);
  if (error) throw error;
}
