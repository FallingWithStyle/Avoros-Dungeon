
/**
 * File: auth.ts
 * Responsibility: User authentication and profile management API routes
 * Notes: Handles user profile retrieval and authentication-related endpoints
 */
import type { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";

export function registerAuthRoutes(app: Express) {
  // Auth routes
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Logout route
  app.get("/api/logout", (req: any, res) => {
    try {
      // Clear any session data
      if (req.session) {
        req.session.destroy((err: any) => {
          if (err) {
            console.error("Error destroying session:", err);
          }
        });
      }
      
      // Clear cookies
      res.clearCookie("connect.sid");
      res.clearCookie("session");
      
      // Redirect to landing page
      res.redirect("/");
    } catch (error) {
      console.error("Error during logout:", error);
      res.redirect("/");
    }
  });
}
