
/**
 * File: logger.test.ts
 * Responsibility: Unit tests for the error logging functionality
 * Notes: Tests string, Error object, and general error formatting with file write simulation
 */

import { logErrorToFile } from "../logger";
import { appendFile } from "fs/promises";

// Mock fs/promises
jest.mock("fs/promises", () => ({
  appendFile: jest.fn(),
}));

const mockAppendFile = appendFile as jest.MockedFunction<typeof appendFile>;

describe("logErrorToFile", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console.error to prevent noise in test output
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should log string errors with context", async () => {
    const errorMessage = "Test error message";
    const context = "test-context";

    await logErrorToFile(errorMessage, context);

    expect(mockAppendFile).toHaveBeenCalledTimes(1);
    const [filename, content] = mockAppendFile.mock.calls[0];
    
    expect(filename).toBe("dungeon-error.log");
    expect(content).toContain("[test-context]");
    expect(content).toContain("Test error message");
    expect(content).toMatch(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/);
  });

  it("should log string errors without context", async () => {
    const errorMessage = "Test error without context";

    await logErrorToFile(errorMessage);

    expect(mockAppendFile).toHaveBeenCalledTimes(1);
    const [filename, content] = mockAppendFile.mock.calls[0];
    
    expect(filename).toBe("dungeon-error.log");
    expect(content).not.toContain("[test-context]");
    expect(content).toContain("Test error without context");
    expect(content).toMatch(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/);
  });

  it("should replace \\n with actual line breaks in string errors", async () => {
    const errorMessage = "Line 1\\nLine 2\\nLine 3";

    await logErrorToFile(errorMessage);

    expect(mockAppendFile).toHaveBeenCalledTimes(1);
    const [, content] = mockAppendFile.mock.calls[0];
    
    expect(content).toContain("Line 1\nLine 2\nLine 3");
    expect(content).not.toContain("\\n");
  });

  it("should log Error objects with stack trace", async () => {
    const error = new Error("Test error object");
    error.stack = "Error: Test error object\n    at test.js:1:1";

    await logErrorToFile(error, "error-context");

    expect(mockAppendFile).toHaveBeenCalledTimes(1);
    const [, content] = mockAppendFile.mock.calls[0];
    
    expect(content).toContain("[error-context]");
    expect(content).toContain("Error: Test error object");
    expect(content).toContain("at test.js:1:1");
  });

  it("should log TypeError objects correctly", async () => {
    const error = new TypeError("Invalid type");
    error.stack = "TypeError: Invalid type\n    at test.js:2:5";

    await logErrorToFile(error);

    expect(mockAppendFile).toHaveBeenCalledTimes(1);
    const [, content] = mockAppendFile.mock.calls[0];
    
    expect(content).toContain("TypeError: Invalid type");
    expect(content).toContain("at test.js:2:5");
  });

  it("should log objects as JSON", async () => {
    const errorObject = {
      message: "Object error",
      code: 500,
      details: { userId: 123, action: "test" }
    };

    await logErrorToFile(errorObject, "object-context");

    expect(mockAppendFile).toHaveBeenCalledTimes(1);
    const [, content] = mockAppendFile.mock.calls[0];
    
    expect(content).toContain("[object-context]");
    expect(content).toContain('"message": "Object error"');
    expect(content).toContain('"code": 500');
    expect(content).toContain('"userId": 123');
    expect(content).toContain('"action": "test"');
  });

  it("should log null and undefined values", async () => {
    await logErrorToFile(null);
    await logErrorToFile(undefined);

    expect(mockAppendFile).toHaveBeenCalledTimes(2);
    
    const [, nullContent] = mockAppendFile.mock.calls[0];
    const [, undefinedContent] = mockAppendFile.mock.calls[1];
    
    expect(nullContent).toContain("null");
    expect(undefinedContent).toContain("undefined");
  });

  it("should log primitive values", async () => {
    await logErrorToFile(42);
    await logErrorToFile(true);
    await logErrorToFile(false);

    expect(mockAppendFile).toHaveBeenCalledTimes(3);
    
    const [, numberContent] = mockAppendFile.mock.calls[0];
    const [, trueContent] = mockAppendFile.mock.calls[1];
    const [, falseContent] = mockAppendFile.mock.calls[2];
    
    expect(numberContent).toContain("42");
    expect(trueContent).toContain("true");
    expect(falseContent).toContain("false");
  });

  it("should handle circular references in objects", async () => {
    const circularObj: any = { name: "test" };
    circularObj.self = circularObj;

    await logErrorToFile(circularObj);

    expect(mockAppendFile).toHaveBeenCalledTimes(1);
    const [, content] = mockAppendFile.mock.calls[0];
    
    // Should fallback to String() when JSON.stringify fails
    expect(content).toContain("[object Object]");
  });

  it("should fallback to console.error when file write fails", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error");
    mockAppendFile.mockRejectedValueOnce(new Error("File write failed"));

    const errorMessage = "Test error for fallback";
    await logErrorToFile(errorMessage, "fallback-test");

    expect(mockAppendFile).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to write to dungeon-error.log:", expect.any(Error));
    expect(consoleErrorSpy).toHaveBeenCalledWith("Original error:", expect.stringContaining("Test error for fallback"));
  });

  it("should include proper timestamps", async () => {
    const beforeTime = new Date().toISOString();
    
    await logErrorToFile("Timestamp test");
    
    const afterTime = new Date().toISOString();

    expect(mockAppendFile).toHaveBeenCalledTimes(1);
    const [, content] = mockAppendFile.mock.calls[0];
    
    // Extract timestamp from log content
    const timestampMatch = content.match(/^\[(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\]/);
    expect(timestampMatch).toBeTruthy();
    
    if (timestampMatch) {
      const logTimestamp = timestampMatch[1];
      expect(logTimestamp >= beforeTime.substring(0, 19)).toBe(true);
      expect(logTimestamp <= afterTime.substring(0, 19)).toBe(true);
    }
  });

  it("should end log entries with double newline", async () => {
    await logErrorToFile("Test ending");

    expect(mockAppendFile).toHaveBeenCalledTimes(1);
    const [, content] = mockAppendFile.mock.calls[0];
    
    expect(content.endsWith("\n\n")).toBe(true);
  });

  it("should handle Error objects without stack trace", async () => {
    const error = new Error("Error without stack");
    delete error.stack;

    await logErrorToFile(error);

    expect(mockAppendFile).toHaveBeenCalledTimes(1);
    const [, content] = mockAppendFile.mock.calls[0];
    
    expect(content).toContain("Error: Error without stack");
    expect(content).toContain("undefined"); // stack should be undefined
  });
});
