
/**
 * File: vector.test.ts
 * Responsibility: Unit tests for 2D vector mathematics operations
 * Notes: Tests vector addition, subtraction, magnitude, normalization, and distance calculations
 */

import { 
  addVectors, 
  subtractVectors, 
  magnitude, 
  normalize, 
  distance, 
  dotProduct, 
  scaleVector 
} from "../vector";

describe("Vector Utils", () => {
  describe("addVectors", () => {
    it("should add two vectors correctly", () => {
      const v1 = { x: 3, y: 4 };
      const v2 = { x: 1, y: 2 };
      const result = addVectors(v1, v2);
      
      expect(result).toEqual({ x: 4, y: 6 });
    });

    it("should handle negative values", () => {
      const v1 = { x: -2, y: 3 };
      const v2 = { x: 1, y: -5 };
      const result = addVectors(v1, v2);
      
      expect(result).toEqual({ x: -1, y: -2 });
    });

    it("should handle zero vectors", () => {
      const v1 = { x: 0, y: 0 };
      const v2 = { x: 5, y: 3 };
      const result = addVectors(v1, v2);
      
      expect(result).toEqual({ x: 5, y: 3 });
    });
  });

  describe("subtractVectors", () => {
    it("should subtract two vectors correctly", () => {
      const v1 = { x: 5, y: 7 };
      const v2 = { x: 2, y: 3 };
      const result = subtractVectors(v1, v2);
      
      expect(result).toEqual({ x: 3, y: 4 });
    });

    it("should handle negative results", () => {
      const v1 = { x: 1, y: 2 };
      const v2 = { x: 3, y: 5 };
      const result = subtractVectors(v1, v2);
      
      expect(result).toEqual({ x: -2, y: -3 });
    });
  });

  describe("magnitude", () => {
    it("should calculate vector magnitude correctly", () => {
      const vector = { x: 3, y: 4 };
      const result = magnitude(vector);
      
      expect(result).toBe(5); // 3-4-5 triangle
    });

    it("should handle zero vector", () => {
      const vector = { x: 0, y: 0 };
      const result = magnitude(vector);
      
      expect(result).toBe(0);
    });

    it("should handle negative values", () => {
      const vector = { x: -3, y: -4 };
      const result = magnitude(vector);
      
      expect(result).toBe(5);
    });
  });

  describe("normalize", () => {
    it("should normalize a vector to unit length", () => {
      const vector = { x: 3, y: 4 };
      const result = normalize(vector);
      
      expect(result.x).toBeCloseTo(0.6);
      expect(result.y).toBeCloseTo(0.8);
      expect(magnitude(result)).toBeCloseTo(1);
    });

    it("should handle zero vector", () => {
      const vector = { x: 0, y: 0 };
      const result = normalize(vector);
      
      expect(result).toEqual({ x: 0, y: 0 });
    });

    it("should handle already normalized vector", () => {
      const vector = { x: 1, y: 0 };
      const result = normalize(vector);
      
      expect(result).toEqual({ x: 1, y: 0 });
    });
  });

  describe("distance", () => {
    it("should calculate distance between two points", () => {
      const p1 = { x: 0, y: 0 };
      const p2 = { x: 3, y: 4 };
      const result = distance(p1, p2);
      
      expect(result).toBe(5);
    });

    it("should handle same points", () => {
      const p1 = { x: 5, y: 3 };
      const p2 = { x: 5, y: 3 };
      const result = distance(p1, p2);
      
      expect(result).toBe(0);
    });

    it("should handle negative coordinates", () => {
      const p1 = { x: -1, y: -1 };
      const p2 = { x: 2, y: 3 };
      const result = distance(p1, p2);
      
      expect(result).toBe(5); // sqrt(9 + 16) = 5
    });
  });

  describe("dotProduct", () => {
    it("should calculate dot product correctly", () => {
      const v1 = { x: 2, y: 3 };
      const v2 = { x: 4, y: 1 };
      const result = dotProduct(v1, v2);
      
      expect(result).toBe(11); // (2*4) + (3*1) = 8 + 3 = 11
    });

    it("should handle perpendicular vectors", () => {
      const v1 = { x: 1, y: 0 };
      const v2 = { x: 0, y: 1 };
      const result = dotProduct(v1, v2);
      
      expect(result).toBe(0);
    });

    it("should handle negative values", () => {
      const v1 = { x: -2, y: 3 };
      const v2 = { x: 1, y: -4 };
      const result = dotProduct(v1, v2);
      
      expect(result).toBe(-14); // (-2*1) + (3*-4) = -2 + -12 = -14
    });
  });

  describe("scaleVector", () => {
    it("should scale vector by positive factor", () => {
      const vector = { x: 2, y: 3 };
      const result = scaleVector(vector, 2.5);
      
      expect(result).toEqual({ x: 5, y: 7.5 });
    });

    it("should scale vector by negative factor", () => {
      const vector = { x: 4, y: -2 };
      const result = scaleVector(vector, -0.5);
      
      expect(result).toEqual({ x: -2, y: 1 });
    });

    it("should handle zero scale factor", () => {
      const vector = { x: 5, y: 3 };
      const result = scaleVector(vector, 0);
      
      expect(result).toEqual({ x: 0, y: 0 });
    });
  });
});
