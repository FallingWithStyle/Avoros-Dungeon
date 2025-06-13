
/**
 * File: authUtils.test.ts
 * Responsibility: Unit tests for authentication utility functions
 * Notes: Tests login redirect and user state management functions
 */

import { redirectToLogin, isUserLoggedIn, getUserFromStorage } from "../authUtils";

// Mock window.location
const mockLocation = {
  href: ""
};
Object.defineProperty(window, "location", {
  value: mockLocation,
  writable: true
});

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn()
};
Object.defineProperty(window, "localStorage", {
  value: mockLocalStorage
});

describe("Auth Utils", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocation.href = "";
  });

  describe("redirectToLogin", () => {
    it("should redirect to login page", () => {
      redirectToLogin();
      expect(mockLocation.href).toBe("/auth/login");
    });
  });

  describe("isUserLoggedIn", () => {
    it("should return true when user token exists", () => {
      mockLocalStorage.getItem.mockReturnValue("valid-token");
      expect(isUserLoggedIn()).toBe(true);
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith("userToken");
    });

    it("should return false when user token does not exist", () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      expect(isUserLoggedIn()).toBe(false);
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith("userToken");
    });
  });

  describe("getUserFromStorage", () => {
    it("should return parsed user data when valid JSON exists", () => {
      const userData = { id: 1, name: "Test User" };
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(userData));
      
      expect(getUserFromStorage()).toEqual(userData);
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith("userData");
    });

    it("should return null when no user data exists", () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      expect(getUserFromStorage()).toBe(null);
    });

    it("should return null when invalid JSON exists", () => {
      mockLocalStorage.getItem.mockReturnValue("invalid-json");
      expect(getUserFromStorage()).toBe(null);
    });
  });
});
