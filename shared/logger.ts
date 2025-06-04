import { appendFile } from "fs/promises";

export async function logErrorToFile(error: unknown, context = "") {
  const now = new Date().toISOString();
  let errMsg = `[${now}]`;
  if (context) errMsg += ` [${context}]`;
  if (error instanceof Error) {
    errMsg += ` ${error.name}: ${error.message}\n${error.stack}\n\n`;
  } else {
    errMsg += ` ${JSON.stringify(error)}\n\n`;
  }
  try {
    await appendFile("dungeon-error.log", errMsg);
  } catch (e) {
    // Fallback: if file can't be written, print to console.
    console.error("Failed to write to dungeon-error.log:", e);
    console.error("Original error:", errMsg);
  }
}