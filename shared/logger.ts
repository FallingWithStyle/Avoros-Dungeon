/**
 * File: logger.ts
 * Responsibility: Provides centralized error logging functionality to dungeon-error.log file
 * Notes: Handles string, Error objects, and general error formatting with fallback to console
 */
import { appendFile } from "fs/promises";

/**
 * Logs a message or error to dungeon-error.log, always writing actual newlines.
 * If error is a string with \n, replaces \n with real line breaks.
 * If error is an Error, logs stack and message.
 * Falls back to console.error on file write failure.
 */
export async function logErrorToFile(error: unknown, context = "") {
  const now = new Date().toISOString();
  let errMsg = `[${now}]`;
  if (context) errMsg += ` [${context}]`;

  if (typeof error === "string") {
    // Replace any \n with actual line breaks
    errMsg += ` ${error.replace(/\\n/g, "\n")}\n\n`;
  } else if (error instanceof Error) {
    errMsg += ` ${error.name}: ${error.message}\n${error.stack}\n\n`;
  } else {
    // For objects, don't stringify with escaped \n, show as-is
    let stringified: string;
    if (typeof error === "object" && error !== null) {
      try {
        stringified = JSON.stringify(error, null, 2);
      } catch (jsonError) {
        // Handle circular references and other JSON.stringify errors
        stringified = String(error);
      }
    } else {
      stringified = String(error);
    }
    errMsg += ` ${stringified}\n\n`;
  }

  try {
    await appendFile("dungeon-error.log", errMsg);
  } catch (e) {
    // Fallback: if file can't be written, print to console.
    console.error("Failed to write to dungeon-error.log:", e);
    console.error("Original error:", errMsg);
  }
}