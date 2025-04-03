import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import multer from "multer";
import path from "path";
import { uploadMiddleware } from "./multer";
import { 
  images, 
  insertImageSchema, 
  updateImageStatusSchema,
  insertAlbumSchema,
  updateAlbumSchema,
  addImageToAlbumSchema
} from "@shared/schema";
import { sendEmail } from "./email";
import { registerAdminRoutes } from "./routes-admin";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);
  
  // Register admin routes
  registerAdminRoutes(app);

  // Serve static files from the uploads directory
  app.use('/uploads', (req, res, next) => {
    const filePath = path.join(process.cwd(), 'uploads', path.basename(req.path));
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error("Error serving file:", filePath, err);
        next();
      }
    });
  });

  // API routes
  // Get all approved images for the gallery
  app.get("/api/images", async (req, res) => {
    try {
      const approvedImages = await storage.getApprovedImages();
      res.json(approvedImages);
    } catch (error) {
      console.error("Error fetching approved images:", error);
      res.status(500).json({ message: "Failed to fetch images" });
    }
  });

  // Get images uploaded by the current user
  app.get("/api/my-images", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const userImages = await storage.getUserImages(req.user.id);
      res.json(userImages);
    } catch (error) {
      console.error("Error fetching user images:", error);
      res.status(500).json({ message: "Failed to fetch images" });
    }
  });

  // Get images pending moderation (for moderators only)
  app.get("/api/moderation", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isModerator) {
      return res.status(403).json({ message: "Forbidden" });
    }

    try {
      const pendingImages = await storage.getPendingImages();
      res.json(pendingImages);
    } catch (error) {
      console.error("Error fetching pending images:", error);
      res.status(500).json({ message: "Failed to fetch pending images" });
    }
  });

  // Get moderation statistics
  app.get("/api/moderation/stats", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isModerator) {
      return res.status(403).json({ message: "Forbidden" });
    }

    try {
      const stats = await storage.getModerationStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching moderation stats:", error);
      res.status(500).json({ message: "Failed to fetch moderation stats" });
    }
  });

  // Upload a new image
  app.post("/api/images", uploadMiddleware.single("image"), async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!req.file) {
      console.error("No file in request:", req.body, req.files);
      return res.status(400).json({ message: "No image file provided" });
    }

    try {
      console.log("Request body:", req.body);
      console.log("Uploaded file:", req.file);
      
      // Initialize with a proper type that matches our schema
      let dataObject: { 
        title: string; 
        description?: string;
        filename?: string;
      } = {
        title: "Untitled Image"
      };
      
      try {
        if (req.body.data) {
          const parsedData = JSON.parse(req.body.data);
          dataObject = {
            title: parsedData.title || "Untitled Image",
            description: parsedData.description
          };
        } else {
          // Fallback if data wasn't properly sent
          dataObject = { 
            title: req.body.title || "Untitled Image", 
            description: req.body.description || undefined
          };
        }
      } catch (parseError) {
        console.error("Error parsing JSON data:", parseError);
        dataObject = { 
          title: req.body.title || "Untitled Image", 
          description: req.body.description || undefined
        };
      }
      
      console.log("Parsed data:", dataObject);
      
      // Add the filename from req.file to the dataObject before validation
      dataObject.filename = req.file.filename;
      console.log("Data with filename:", dataObject);
      
      const validatedData = insertImageSchema.parse(dataObject);
      
      const imageData = {
        ...validatedData,
        userId: req.user.id
      };

      console.log("Creating image with data:", imageData);
      const newImage = await storage.createImage(imageData);
      console.log("Image created successfully:", newImage);

      // Notify moderators about new image submission
      try {
        const moderators = await storage.getModerators();
        console.log(`Notifying ${moderators.length} moderators`);
        
        // Check if we have any moderators with valid emails
        const moderatorsWithEmail = moderators.filter(mod => mod.email && mod.email.trim() !== "");
        
        if (moderatorsWithEmail.length > 0) {
          console.log(`Sending notifications to ${moderatorsWithEmail.length} moderators with valid emails`);
          
          for (const moderator of moderatorsWithEmail) {
            try {
              await sendEmail({
                to: moderator.email,
                subject: "New Image Pending Review",
                text: `A new image "${newImage.title}" has been submitted for review. Please login to moderate.`,
                html: `
                  <h2>New Image Submission</h2>
                  <p>A new image "${newImage.title}" has been submitted for review.</p>
                  <p>Please login to the <a href="${process.env.BASE_URL || 'http://localhost:5000'}/moderation">moderation dashboard</a> to review it.</p>
                `
              });
              console.log(`Notification sent to moderator: ${moderator.email}`);
            } catch (individualEmailError) {
              console.error(`Failed to send notification to moderator ${moderator.email}:`, individualEmailError);
            }
          }
        } else {
          console.log("No moderators with valid emails found to notify");
        }
      } catch (emailError) {
        console.error("Error in moderator notification process:", emailError);
        // Continue processing even if email fails
      }

      res.status(201).json(newImage);
    } catch (error) {
      console.error("Error uploading image:", error);
      res.status(400).json({ message: "Failed to upload image", error: String(error) });
    }
  });

  // Update image status (approve or reject)
  app.patch("/api/images/:id/status", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isModerator) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const imageId = parseInt(req.params.id);
    if (isNaN(imageId)) {
      return res.status(400).json({ message: "Invalid image ID" });
    }

    try {
      const validatedData = updateImageStatusSchema.parse(req.body);
      
      const image = await storage.getImageById(imageId);
      if (!image) {
        return res.status(404).json({ message: "Image not found" });
      }

      const updatedImage = await storage.updateImageStatus(
        imageId, 
        validatedData.status, 
        req.user.id,
        validatedData.rejectionReason
      );

      // Notify the user about the moderation result
      try {
        const imageOwner = await storage.getUser(image.userId);
        
        if (imageOwner && imageOwner.email && imageOwner.email.trim() !== "") {
          console.log(`Sending moderation result notification to image owner: ${imageOwner.email}`);
          const status = validatedData.status === "approved" ? "approved" : "rejected";
          const reason = validatedData.rejectionReason || "";
          
          await sendEmail({
            to: imageOwner.email,
            subject: `Your Image Has Been ${status.charAt(0).toUpperCase() + status.slice(1)}`,
            text: `Your image "${image.title}" has been ${status}${reason ? `. Reason: ${reason}` : ""}.`,
            html: `
              <h2>Image ${status.charAt(0).toUpperCase() + status.slice(1)}</h2>
              <p>Your image "${image.title}" has been ${status}.</p>
              ${reason ? `<p>Reason: ${reason}</p>` : ""}
              <p>Visit the <a href="${process.env.BASE_URL || 'http://localhost:5000'}/uploads">uploads page</a> to see details.</p>
            `
          });
          console.log(`Notification sent to image owner successfully`);
        } else {
          console.log(`No valid email found for image owner (user ID: ${image.userId})`);
        }
      } catch (emailError) {
        console.error("Error sending notification to image owner:", emailError);
        // Continue processing even if email fails
      }

      res.json(updatedImage);
    } catch (error) {
      console.error("Error updating image status:", error);
      res.status(400).json({ message: "Failed to update image status", error });
    }
  });

  // Verify user account
  app.get("/api/verify/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const user = await storage.verifyUserByToken(token);
      
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired verification token" });
      }
      
      res.json({ message: "Email verified successfully" });
    } catch (error) {
      console.error("Error verifying email:", error);
      res.status(500).json({ message: "Failed to verify email" });
    }
  });

  // Resend verification email
  app.post("/api/resend-verification", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.isVerified) {
        return res.status(400).json({ message: "Email already verified" });
      }

      const token = await storage.generateVerificationToken(user.id);
      
      if (!user.email || user.email.trim() === "") {
        return res.status(400).json({ message: "No valid email address found for user" });
      }
      
      try {
        console.log(`Sending verification email to: ${user.email}`);
        
        await sendEmail({
          to: user.email,
          subject: "Verify Your Email",
          text: `Please verify your email by clicking on this link: ${process.env.BASE_URL || 'http://localhost:5000'}/verify/${token}`,
          html: `
            <h2>Verify Your Email</h2>
            <p>Please click the button below to verify your email address:</p>
            <p>
              <a href="${process.env.BASE_URL || 'http://localhost:5000'}/verify/${token}" 
                 style="background-color: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Verify Email
              </a>
            </p>
          `
        });
        
        console.log("Verification email sent successfully");
      } catch (emailError) {
        console.error("Error sending verification email:", emailError);
        return res.status(500).json({ message: "Failed to send verification email. Please try again later." });
      }

      res.json({ message: "Verification email sent" });
    } catch (error) {
      console.error("Error resending verification:", error);
      res.status(500).json({ message: "Failed to resend verification email" });
    }
  });

  // Get user profile
  app.get("/api/users/:id/profile", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const user = await storage.getUserProfile(userId);
      
      // Return only public profile information
      const publicProfile = {
        id: user.id,
        name: user.name,
        bio: user.bio,
        profilePicture: user.profilePicture,
        website: user.website,
        socialLinks: user.socialLinks
      };
      
      res.json(publicProfile);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ message: "Failed to fetch user profile" });
    }
  });

  // Update user profile
  app.patch("/api/profile", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      // Allow updating only the following fields
      const allowedFields = ['bio', 'profilePicture', 'website', 'socialLinks', 'themePreference'];
      const updateData: any = {};
      
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      }
      
      const updatedUser = await storage.updateUserProfile(req.user.id, updateData);
      
      // Return only profile fields
      const profile = {
        id: updatedUser.id,
        name: updatedUser.name,
        bio: updatedUser.bio,
        profilePicture: updatedUser.profilePicture,
        website: updatedUser.website,
        socialLinks: updatedUser.socialLinks,
        themePreference: updatedUser.themePreference
      };
      
      res.json(profile);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Update image visibility
  app.patch("/api/images/:id/visibility", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const imageId = parseInt(req.params.id);
    if (isNaN(imageId)) {
      return res.status(400).json({ message: "Invalid image ID" });
    }

    try {
      const { isPublic } = req.body;
      if (typeof isPublic !== 'boolean') {
        return res.status(400).json({ message: "isPublic must be a boolean value" });
      }

      const updatedImage = await storage.updateImageVisibility(imageId, req.user.id, isPublic);
      res.json(updatedImage);
    } catch (error) {
      console.error("Error updating image visibility:", error);
      res.status(400).json({ message: String(error) });
    }
  });

  // Get user's albums
  app.get("/api/albums", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const albums = await storage.getUserAlbums(req.user.id);
      res.json(albums);
    } catch (error) {
      console.error("Error fetching albums:", error);
      res.status(500).json({ message: "Failed to fetch albums" });
    }
  });

  // Get public albums
  app.get("/api/public-albums", async (req, res) => {
    try {
      const albums = await storage.getPublicAlbums();
      res.json(albums);
    } catch (error) {
      console.error("Error fetching public albums:", error);
      res.status(500).json({ message: "Failed to fetch public albums" });
    }
  });
  
  // Alias endpoint for compatibility
  app.get("/api/albums/public", async (req, res) => {
    try {
      const albums = await storage.getPublicAlbums();
      res.json(albums);
    } catch (error) {
      console.error("Error fetching public albums:", error);
      res.status(500).json({ message: "Failed to fetch public albums" });
    }
  });

  // Get album by ID
  app.get("/api/albums/:id", async (req, res) => {
    const albumId = parseInt(req.params.id);
    if (isNaN(albumId)) {
      return res.status(400).json({ message: "Invalid album ID" });
    }

    try {
      const album = await storage.getAlbumById(albumId);
      
      if (!album) {
        return res.status(404).json({ message: "Album not found" });
      }
      
      // Check if the album is public or belongs to the authenticated user
      if (!album.isPublic && (!req.isAuthenticated() || req.user.id !== album.userId)) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(album);
    } catch (error) {
      console.error("Error fetching album:", error);
      res.status(500).json({ message: "Failed to fetch album" });
    }
  });

  // Create a new album
  app.post("/api/albums", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const validatedData = insertAlbumSchema.parse(req.body);
      
      const albumData = {
        ...validatedData,
        userId: req.user.id
      };
      
      const newAlbum = await storage.createAlbum(albumData);
      res.status(201).json(newAlbum);
    } catch (error) {
      console.error("Error creating album:", error);
      res.status(400).json({ message: "Failed to create album", error: String(error) });
    }
  });

  // Update an album
  app.patch("/api/albums/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const albumId = parseInt(req.params.id);
    if (isNaN(albumId)) {
      return res.status(400).json({ message: "Invalid album ID" });
    }

    try {
      const validatedData = updateAlbumSchema.parse(req.body);
      const updatedAlbum = await storage.updateAlbum(albumId, req.user.id, validatedData);
      res.json(updatedAlbum);
    } catch (error) {
      console.error("Error updating album:", error);
      res.status(400).json({ message: String(error) });
    }
  });

  // Delete an album
  app.delete("/api/albums/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const albumId = parseInt(req.params.id);
    if (isNaN(albumId)) {
      return res.status(400).json({ message: "Invalid album ID" });
    }

    try {
      await storage.deleteAlbum(albumId, req.user.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting album:", error);
      res.status(400).json({ message: String(error) });
    }
  });

  // Add image to album
  app.post("/api/albums/:id/images", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const albumId = parseInt(req.params.id);
    if (isNaN(albumId)) {
      return res.status(400).json({ message: "Invalid album ID" });
    }

    try {
      const validatedData = addImageToAlbumSchema.parse(req.body);
      await storage.addImageToAlbum(albumId, req.user.id, validatedData.imageId);
      
      // Return the updated album
      const updatedAlbum = await storage.getAlbumById(albumId);
      res.json(updatedAlbum);
    } catch (error) {
      console.error("Error adding image to album:", error);
      res.status(400).json({ message: String(error) });
    }
  });

  // Remove image from album
  app.delete("/api/albums/:albumId/images/:imageId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const albumId = parseInt(req.params.albumId);
    const imageId = parseInt(req.params.imageId);
    
    if (isNaN(albumId) || isNaN(imageId)) {
      return res.status(400).json({ message: "Invalid IDs" });
    }

    try {
      await storage.removeImageFromAlbum(albumId, req.user.id, imageId);
      
      // Return the updated album
      const updatedAlbum = await storage.getAlbumById(albumId);
      res.json(updatedAlbum);
    } catch (error) {
      console.error("Error removing image from album:", error);
      res.status(400).json({ message: String(error) });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
