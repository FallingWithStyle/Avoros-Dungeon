/**
 * File: errorToast.tsx
 * Responsibility: Error toast notification utility with copy-to-clipboard functionality
 * Notes: Provides standardized error display with user-friendly copy buttons for debugging
 */

import { toast } from "@/hooks/use-toast";

export function showErrorToast(title: string, error: Error | string) {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const fullMessage = `${title}: ${errorMessage}`;
  
  toast({
    title,
    description: (
      <div className="flex items-center gap-2">
        <span>{errorMessage}</span>
        <button
          onClick={() => navigator.clipboard.writeText(fullMessage)}
          className="text-xs bg-red-800 hover:bg-red-700 px-2 py-1 rounded"
          title="Copy error message"
        >
          Copy
        </button>
      </div>
    ),
    variant: "destructive",
  });
}