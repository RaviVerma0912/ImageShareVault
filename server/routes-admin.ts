import { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { updateUserRoleSchema, banUserSchema } from "../shared/schema";
import { z } from "zod";

// Middleware to check if user is admin
const isAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check if user is logged in
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    // Get the user from the database to get fresh data
    const user = await storage.getUser(req.user.id);
    
    // Check if user is admin
    if (!user?.isAdmin) {
      return res.status(403).json({ message: "Admin privileges required" });
    }
    
    next();
  } catch (error) {
    console.error("Error in isAdmin middleware:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export function registerAdminRoutes(app: Express) {
  // Get all users (admin only)
  app.get("/api/admin/users", isAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error getting users:", error);
      res.status(500).json({ message: "Failed to get users" });
    }
  });

  // Update user role (make user moderator/admin)
  app.patch("/api/admin/users/:userId/role", isAdmin, async (req, res) => {
    try {
      const userId = Number(req.params.userId);
      const adminId = req.user!.id;
      
      // Validate request body
      const validationResult = updateUserRoleSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid data", 
          errors: validationResult.error.format() 
        });
      }
      
      // Check if attempting to update own role
      if (userId === adminId) {
        return res.status(400).json({ message: "Cannot modify your own role" });
      }
      
      const data = validationResult.data;
      const updatedUser = await storage.updateUserRole(userId, adminId, data);
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // Ban/unban user
  app.patch("/api/admin/users/:userId/ban", isAdmin, async (req, res) => {
    try {
      const userId = Number(req.params.userId);
      const adminId = req.user!.id;
      
      // Validate request body
      const validationResult = banUserSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid data", 
          errors: validationResult.error.format() 
        });
      }
      
      // Check if attempting to ban yourself
      if (userId === adminId) {
        return res.status(400).json({ message: "Cannot ban yourself" });
      }
      
      const data = validationResult.data;
      const updatedUser = await storage.banUser(userId, adminId, data);
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error banning user:", error);
      res.status(500).json({ message: "Failed to update user ban status" });
    }
  });
}