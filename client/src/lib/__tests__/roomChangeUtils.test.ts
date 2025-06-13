
/**
 * File: roomChangeUtils.test.ts
 * Responsibility: Unit tests for room change and navigation utilities
 * Notes: Tests room change handling and query client refetch logic
 */

import { handleRoomChange, handleRoomChangeWithRefetch } from "../roomChangeUtils";
import { queryClient } from "../queryClient";

// Mock queryClient
jest.mock("../queryClient", () => ({
  queryClient: {
    refetchQueries: jest.fn(),
    invalidateQueries: jest.fn()
  }
}));

const mockQueryClient = queryClient as jest.Mocked<typeof queryClient>;

describe("Room Change Utils", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("handleRoomChange", () => {
    it("should invalidate crawler-related queries", () => {
      const crawlerId = 123;
      handleRoomChange(crawlerId);

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["/api/crawlers/" + crawlerId]
      });
    });

    it("should handle different crawler IDs", () => {
      const crawlerId = 456;
      handleRoomChange(crawlerId);

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["/api/crawlers/456"]
      });
    });
  });

  describe("handleRoomChangeWithRefetch", () => {
    it("should call handleRoomChange and refetch specific queries", () => {
      const crawlerId = 123;
      handleRoomChangeWithRefetch(crawlerId);

      // Should call handleRoomChange (invalidateQueries)
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["/api/crawlers/123"]
      });

      // Should refetch current-room data
      expect(mockQueryClient.refetchQueries).toHaveBeenCalledWith({
        queryKey: ["/api/crawlers/123/current-room"]
      });

      // Should refetch tactical data
      expect(mockQueryClient.refetchQueries).toHaveBeenCalledWith({
        queryKey: ["/api/crawlers/123/tactical-data"]
      });
    });

    it("should handle different crawler IDs for refetch", () => {
      const crawlerId = 789;
      handleRoomChangeWithRefetch(crawlerId);

      expect(mockQueryClient.refetchQueries).toHaveBeenCalledWith({
        queryKey: ["/api/crawlers/789/current-room"]
      });

      expect(mockQueryClient.refetchQueries).toHaveBeenCalledWith({
        queryKey: ["/api/crawlers/789/tactical-data"]
      });
    });
  });
});
