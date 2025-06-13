
/**
 * File: avatarUtils.test.ts
 * Responsibility: Unit tests for avatar generation and display utilities
 * Notes: Tests avatar URL generation and fallback display logic
 */

import { generateAvatarUrl, getAvatarDisplay, getInitials } from "../avatarUtils";

describe("Avatar Utils", () => {
  describe("generateAvatarUrl", () => {
    it("should generate DiceBear avatar URL with correct parameters", () => {
      const userId = 123;
      const result = generateAvatarUrl(userId);
      
      expect(result).toBe("https://api.dicebear.com/7.x/adventurer/svg?seed=123");
    });

    it("should handle string user IDs", () => {
      const userId = "user-456";
      const result = generateAvatarUrl(userId);
      
      expect(result).toBe("https://api.dicebear.com/7.x/adventurer/svg?seed=user-456");
    });
  });

  describe("getAvatarDisplay", () => {
    it("should return avatar URL when user has ID", () => {
      const user = { id: 123, name: "John Doe" };
      const result = getAvatarDisplay(user);
      
      expect(result).toBe("https://api.dicebear.com/7.x/adventurer/svg?seed=123");
    });

    it("should return null when user has no ID", () => {
      const user = { name: "John Doe" };
      const result = getAvatarDisplay(user);
      
      expect(result).toBe(null);
    });

    it("should handle null user", () => {
      const result = getAvatarDisplay(null);
      expect(result).toBe(null);
    });
  });

  describe("getInitials", () => {
    it("should return initials from full name", () => {
      expect(getInitials("John Doe")).toBe("JD");
    });

    it("should handle single name", () => {
      expect(getInitials("John")).toBe("J");
    });

    it("should handle multiple names", () => {
      expect(getInitials("John Michael Doe")).toBe("JD");
    });

    it("should handle empty string", () => {
      expect(getInitials("")).toBe("");
    });

    it("should handle names with extra spaces", () => {
      expect(getInitials("  John   Doe  ")).toBe("JD");
    });

    it("should return uppercase initials", () => {
      expect(getInitials("john doe")).toBe("JD");
    });
  });
});
