import { extractText, getDocumentProxy } from "npm:unpdf@0.11.0";

/** Extracts plain text from a resume PDF's raw bytes. */
export async function extractResumeText(bytes: Uint8Array): Promise<string> {
  const pdf = await getDocumentProxy(bytes);
  const { text } = await extractText(pdf, { mergePages: true });
  return (Array.isArray(text) ? text.join("\n") : text).trim();
}
