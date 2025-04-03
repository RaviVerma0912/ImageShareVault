import { sqliteTable, text, integer, blob } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").default(""),
  email: text("email").default("").unique(),
  password: text("password").notNull(),
  isVerified: integer("is_verified", { mode: "boolean" }).notNull().default(false),
  verificationToken: text("verification_token"),
  isModerator: integer("is_moderator", { mode: "boolean" }).notNull().default(false),
  isAdmin: integer("is_admin", { mode: "boolean" }).notNull().default(false),
  isBanned: integer("is_banned", { mode: "boolean" }).notNull().default(false),
  banReason: text("ban_reason"),
  bannedBy: integer("banned_by").references(() => users.id),
  bannedAt: text("banned_at"),
  bio: text("bio"),
  profilePicture: text("profile_picture"),
  website: text("website"),
  socialLinks: text("social_links"), // JSON string of social media links
  themePreference: text("theme_preference").default("default"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// SQLite doesn't have enums, so we define a string with validation
export const VALID_IMAGE_STATUSES = ["pending", "approved", "rejected"] as const;
export type ImageStatus = typeof VALID_IMAGE_STATUSES[number];

export const images = sqliteTable("images", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description"),
  filename: text("filename").notNull(),
  status: text("status", { enum: VALID_IMAGE_STATUSES }).notNull().default("pending"),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  reviewedBy: integer("reviewed_by").references(() => users.id),
  rejectionReason: text("rejection_reason"),
  isPublic: integer("is_public", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Albums table
export const albums = sqliteTable("albums", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description"),
  coverImageId: integer("cover_image_id").references(() => images.id),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  isPublic: integer("is_public", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Junction table for images in albums
export const albumImages = sqliteTable("album_images", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  albumId: integer("album_id").notNull().references(() => albums.id, { onDelete: "cascade" }),
  imageId: integer("image_id").notNull().references(() => images.id, { onDelete: "cascade" }),
  addedAt: text("added_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertUserSchema = createInsertSchema(users)
  .omit({ id: true, verificationToken: true, isModerator: true, createdAt: true })
  .extend({
    name: z.string().optional().default(""),
    email: z.string().optional().default(""),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
    isVerified: z.boolean().optional().default(true)
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"]
  });

export const insertImageSchema = createInsertSchema(images)
  .omit({ 
    id: true, 
    status: true, 
    userId: true, 
    reviewedBy: true, 
    rejectionReason: true, 
    isPublic: true,
    createdAt: true, 
    updatedAt: true 
  });
  
export const insertAlbumSchema = createInsertSchema(albums)
  .omit({
    id: true,
    userId: true,
    coverImageId: true,
    createdAt: true,
    updatedAt: true
  });
  
export const updateAlbumSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  coverImageId: z.number().optional(),
  isPublic: z.boolean().optional(),
});

export const addImageToAlbumSchema = z.object({
  imageId: z.number(),
});

export const updateImageStatusSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  rejectionReason: z.string().optional(),
});

// Admin schemas
export const updateUserRoleSchema = z.object({
  isModerator: z.boolean().optional(),
  isAdmin: z.boolean().optional()
});

export const banUserSchema = z.object({
  isBanned: z.boolean(),
  banReason: z.string().optional(),
});

export type InsertUser = Omit<z.infer<typeof insertUserSchema>, "confirmPassword">;
export type User = typeof users.$inferSelect;
export type InsertImage = z.infer<typeof insertImageSchema>;
export type Image = typeof images.$inferSelect;
export type UpdateImageStatus = z.infer<typeof updateImageStatusSchema>;
export type UpdateUserRole = z.infer<typeof updateUserRoleSchema>;
export type BanUser = z.infer<typeof banUserSchema>;

export type InsertAlbum = z.infer<typeof insertAlbumSchema>;
export type Album = typeof albums.$inferSelect;
export type UpdateAlbum = z.infer<typeof updateAlbumSchema>;
export type AddImageToAlbum = z.infer<typeof addImageToAlbumSchema>;
export type AlbumImage = typeof albumImages.$inferSelect;
