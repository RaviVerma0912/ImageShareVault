import { 
  users, type User, type InsertUser, 
  images, type InsertImage, type Image,
  albums, albumImages,
  type Album, type InsertAlbum, type UpdateAlbum
} from "@shared/schema";
import session from "express-session";
import { db, sqlite } from "./db";
import { eq, and, sql, desc, count } from "drizzle-orm";
import { randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import createMemoryStore from "memorystore";
import fs from "fs";
import path from "path";

// Function to hash passwords (copied from auth.ts to avoid circular dependencies)
const scryptAsync = promisify(scrypt);
export async function hashPassword(password: string) {
  try {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  } catch (error) {
    console.error("Error hashing password:", error);
    throw error;
  }
}

// Create memory store
const MemoryStore = createMemoryStore(session);

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  verifyUserByToken(token: string): Promise<User | undefined>;
  generateVerificationToken(userId: number): Promise<string>;
  getModerators(): Promise<User[]>;
  makeModerator(userId: number): Promise<void>;
  
  // User profile operations
  updateUserProfile(userId: number, data: { 
    bio?: string; 
    profilePicture?: string;
    website?: string;
    socialLinks?: string;
    themePreference?: string;
  }): Promise<User>;
  getUserProfile(userId: number): Promise<User>;
  
  // Admin operations
  getAllUsers(): Promise<User[]>;
  updateUserRole(userId: number, adminId: number, data: { isModerator?: boolean, isAdmin?: boolean }): Promise<User>;
  banUser(userId: number, adminId: number, data: { isBanned: boolean, banReason?: string }): Promise<User>;
  
  // Image operations
  createImage(image: Omit<InsertImage, 'id'> & { userId: number }): Promise<Image>;
  getImageById(id: number): Promise<Image | undefined>;
  getApprovedImages(): Promise<(Image & { user: Pick<User, 'id' | 'name'> })[]>;
  getUserImages(userId: number): Promise<Image[]>;
  updateImageVisibility(imageId: number, userId: number, isPublic: boolean): Promise<Image>;
  getPendingImages(): Promise<(Image & { user: Pick<User, 'id' | 'name' | 'email'> })[]>;
  updateImageStatus(
    imageId: number, 
    status: "approved" | "rejected", 
    moderatorId: number,
    rejectionReason?: string
  ): Promise<Image>;
  getModerationStats(): Promise<{
    pending: number;
    approvedToday: number;
    rejectedToday: number;
  }>;

  // Album operations
  createAlbum(album: InsertAlbum & { userId: number }): Promise<Album>;
  getUserAlbums(userId: number): Promise<Album[]>;
  getAlbumById(id: number): Promise<(Album & { images: (Image & { user: Pick<User, 'id' | 'name'> })[] }) | undefined>;
  updateAlbum(albumId: number, userId: number, data: UpdateAlbum): Promise<Album>;
  deleteAlbum(albumId: number, userId: number): Promise<void>;
  addImageToAlbum(albumId: number, userId: number, imageId: number): Promise<void>;
  removeImageFromAlbum(albumId: number, userId: number, imageId: number): Promise<void>;
  getPublicAlbums(): Promise<(Album & { user: Pick<User, 'id' | 'name'> })[]>;
  
  // Session store
  sessionStore: any;
}

export class DatabaseStorage implements IStorage {
  sessionStore: any;
  
  constructor() {
    // Use memory store for sessions (SQLite doesn't have a dedicated session store)
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // 24 hours (cleanup expired sessions)
    });
    
    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    // Initialize the database schema
    this.initializeSchemaSync();
    
    // Create default admin in an async way
    this.createDefaultAdmin();
  }
  
  // Initialize the database schema if it doesn't exist
  private initializeSchemaSync() {
    try {
      // Enable foreign key support
      sqlite.exec('PRAGMA foreign_keys = ON;');
      
      // Check if tables exist
      const userTableExists = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
      const imageTableExists = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='images'").get();
      const albumTableExists = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='albums'").get();
      const albumImagesTableExists = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='album_images'").get();
      
      // Only create tables if they don't exist
      if (!userTableExists) {
        sqlite.exec(`
          CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            is_verified INTEGER NOT NULL DEFAULT 0,
            verification_token TEXT,
            is_moderator INTEGER NOT NULL DEFAULT 0,
            is_admin INTEGER NOT NULL DEFAULT 0,
            is_banned INTEGER NOT NULL DEFAULT 0,
            ban_reason TEXT,
            banned_by INTEGER,
            banned_at TEXT,
            bio TEXT,
            profile_picture TEXT,
            website TEXT,
            social_links TEXT,
            theme_preference TEXT DEFAULT 'default',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (banned_by) REFERENCES users(id)
          )
        `);
        console.log('Users table created');
      } else {
        // Add new columns if they don't exist
        const columnsInfo = sqlite.prepare("PRAGMA table_info(users)").all();
        const columnNames = columnsInfo.map((col: any) => col.name);
        
        // Check if is_admin column exists
        if (!columnNames.includes('is_admin')) {
          sqlite.exec('ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0');
          console.log('Added is_admin column to users table');
        }
        
        // Check if ban-related columns exist
        if (!columnNames.includes('is_banned')) {
          sqlite.exec('ALTER TABLE users ADD COLUMN is_banned INTEGER NOT NULL DEFAULT 0');
          console.log('Added is_banned column to users table');
        }
        
        if (!columnNames.includes('ban_reason')) {
          sqlite.exec('ALTER TABLE users ADD COLUMN ban_reason TEXT');
          console.log('Added ban_reason column to users table');
        }
        
        if (!columnNames.includes('banned_by')) {
          sqlite.exec('ALTER TABLE users ADD COLUMN banned_by INTEGER REFERENCES users(id)');
          console.log('Added banned_by column to users table');
        }
        
        if (!columnNames.includes('banned_at')) {
          sqlite.exec('ALTER TABLE users ADD COLUMN banned_at TEXT');
          console.log('Added banned_at column to users table');
        }
        
        // Add profile-related columns
        if (!columnNames.includes('bio')) {
          sqlite.exec('ALTER TABLE users ADD COLUMN bio TEXT');
          console.log('Added bio column to users table');
        }
        
        if (!columnNames.includes('profile_picture')) {
          sqlite.exec('ALTER TABLE users ADD COLUMN profile_picture TEXT');
          console.log('Added profile_picture column to users table');
        }
        
        if (!columnNames.includes('website')) {
          sqlite.exec('ALTER TABLE users ADD COLUMN website TEXT');
          console.log('Added website column to users table');
        }
        
        if (!columnNames.includes('social_links')) {
          sqlite.exec('ALTER TABLE users ADD COLUMN social_links TEXT');
          console.log('Added social_links column to users table');
        }
        
        if (!columnNames.includes('theme_preference')) {
          sqlite.exec('ALTER TABLE users ADD COLUMN theme_preference TEXT DEFAULT "default"');
          console.log('Added theme_preference column to users table');
        }
        
        // Make existing admin also an admin
        sqlite.exec(`
          UPDATE users 
          SET is_admin = 1 
          WHERE email = 'admin@example.com'
        `);
      }
      
      if (!imageTableExists) {
        sqlite.exec(`
          CREATE TABLE IF NOT EXISTS images (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            filename TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            user_id INTEGER NOT NULL,
            reviewed_by INTEGER,
            rejection_reason TEXT,
            is_public INTEGER NOT NULL DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (reviewed_by) REFERENCES users(id)
          )
        `);
        console.log('Images table created');
      } else {
        // Add new columns to images table if they don't exist
        const columnsInfo = sqlite.prepare("PRAGMA table_info(images)").all();
        const columnNames = columnsInfo.map((col: any) => col.name);
        
        if (!columnNames.includes('is_public')) {
          sqlite.exec('ALTER TABLE images ADD COLUMN is_public INTEGER NOT NULL DEFAULT 1');
          console.log('Added is_public column to images table');
        }
      }
      
      // Create albums table if it doesn't exist
      if (!albumTableExists) {
        sqlite.exec(`
          CREATE TABLE IF NOT EXISTS albums (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            cover_image_id INTEGER,
            user_id INTEGER NOT NULL,
            is_public INTEGER NOT NULL DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (cover_image_id) REFERENCES images(id) ON DELETE SET NULL
          )
        `);
        console.log('Albums table created');
      }
      
      // Create album_images junction table if it doesn't exist
      if (!albumImagesTableExists) {
        sqlite.exec(`
          CREATE TABLE IF NOT EXISTS album_images (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            album_id INTEGER NOT NULL,
            image_id INTEGER NOT NULL,
            added_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE,
            FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE
          )
        `);
        console.log('Album images junction table created');
      }
      
      // Clean up any invalid user records that have empty name or email
      sqlite.exec(`
        DELETE FROM users WHERE email = '' OR name = '' OR email IS NULL OR name IS NULL;
      `);
      
      console.log('Database schema initialization complete');
    } catch (error) {
      console.error('Error initializing database schema:', error);
    }
  }
  
  // Create a default admin account
  private async createDefaultAdmin() {
    try {
      // First check if the admin already exists
      const adminExists = sqlite.prepare("SELECT * FROM users WHERE email = 'admin@example.com'").get();
      
      if (adminExists) {
        // Make sure existing admin has admin privileges
        sqlite.prepare(`
          UPDATE users 
          SET is_admin = 1, is_moderator = 1 
          WHERE email = 'admin@example.com'
        `).run();
        
        console.log('Admin user already exists - ensured admin privileges');
        return;
      }
      
      // Create a direct password hash for the admin
      const hashedPassword = await hashPassword('password123');
      
      // First, make sure there are no images referencing non-existent users
      sqlite.exec("DELETE FROM images WHERE user_id NOT IN (SELECT id FROM users)");
      
      // For reviewed_by references
      sqlite.exec("UPDATE images SET reviewed_by = NULL WHERE reviewed_by NOT IN (SELECT id FROM users)");
      
      // Now insert the admin user
      const insertAdminStmt = sqlite.prepare(`
        INSERT INTO users (name, email, password, is_verified, is_moderator, is_admin)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      insertAdminStmt.run('Admin', 'admin@example.com', hashedPassword, 1, 1, 1);
      console.log('Admin user created successfully with email: admin@example.com and password: password123');
      
      console.log('Database schema initialized successfully');
    } catch (error) {
      console.error('Error creating default admin:', error);
    }
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const user = sqlite.prepare('SELECT * FROM users WHERE id = ?').get(id);
    return user ? this.transformUser(user) : undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      // Normalize the email input
      const normalizedEmail = (email || '').trim().toLowerCase();
      
      console.log(`Looking up user by email: "${normalizedEmail}"`);
      
      let query: string;
      let params: any[] = [];
      
      if (normalizedEmail === '') {
        // Special case for empty email
        console.log('Searching for user with empty email');
        query = "SELECT * FROM users WHERE email = ''";
      } else {
        // Case-insensitive search
        query = 'SELECT * FROM users WHERE LOWER(email) = ?';
        params = [normalizedEmail];
      }
      
      const user = sqlite.prepare(query).get(...params);
      
      if (user) {
        console.log(`Found user with ID: ${user.id} for email lookup`);
        return this.transformUser(user);
      } else {
        console.log(`No user found for email: "${normalizedEmail}"`);
        return undefined;
      }
    } catch (error) {
      console.error('Error in getUserByEmail:', error);
      throw error;
    }
  }

  async createUser(userData: InsertUser & { is_verified?: number }): Promise<User> {
    try {
      // Validate required fields
      if (!userData.password) {
        console.error('User creation failed: Password cannot be empty');
        throw new Error('Password cannot be empty');
      }
      
      // Normalize data
      const name = userData.name || '';
      const email = (userData.email || '').trim();
      
      console.log(`Creating user: name="${name}", email="${email}"`);
      
      // Insert the user
      const result = sqlite.prepare(`
        INSERT INTO users (name, email, password, is_verified) 
        VALUES (?, ?, ?, ?)
      `).run(
        name, 
        email, 
        userData.password, 
        userData.is_verified || 0
      );
      
      const userId = result.lastInsertRowid;
      console.log(`User created with ID: ${userId}`);
      
      // Get the inserted user
      const user = sqlite.prepare('SELECT * FROM users WHERE id = ?').get(userId);
      if (!user) {
        throw new Error(`Failed to retrieve newly created user with ID: ${userId}`);
      }
      
      return this.transformUser(user);
    } catch (error) {
      console.error('Error in createUser:', error);
      throw error;
    }
  }

  async verifyUserByToken(token: string): Promise<User | undefined> {
    const user = sqlite.prepare('SELECT * FROM users WHERE verification_token = ?').get(token);
    
    if (!user) return undefined;
    
    // Update the user
    sqlite.prepare(`
      UPDATE users 
      SET is_verified = 1, verification_token = NULL 
      WHERE id = ?
    `).run(user.id);
    
    // Get the updated user
    const updatedUser = sqlite.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
    
    return this.transformUser(updatedUser);
  }

  async generateVerificationToken(userId: number): Promise<string> {
    const token = randomBytes(32).toString('hex');
    
    sqlite.prepare(`
      UPDATE users 
      SET verification_token = ? 
      WHERE id = ?
    `).run(token, userId);
    
    return token;
  }

  async getModerators(): Promise<User[]> {
    const moderators = sqlite.prepare('SELECT * FROM users WHERE is_moderator = 1').all();
    return moderators.map((row: any) => this.transformUser(row));
  }
  
  async makeModerator(userId: number): Promise<void> {
    sqlite.prepare(`
      UPDATE users 
      SET is_moderator = 1
      WHERE id = ?
    `).run(userId);
  }
  
  // User profile operations
  async updateUserProfile(userId: number, data: { 
    bio?: string; 
    profilePicture?: string;
    website?: string;
    socialLinks?: string;
    themePreference?: string;
  }): Promise<User> {
    // Check if the user exists
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Build the update query dynamically
    const updates = [];
    const params = [];
    
    if (data.bio !== undefined) {
      updates.push('bio = ?');
      params.push(data.bio);
    }
    
    if (data.profilePicture !== undefined) {
      updates.push('profile_picture = ?');
      params.push(data.profilePicture);
    }
    
    if (data.website !== undefined) {
      updates.push('website = ?');
      params.push(data.website);
    }
    
    if (data.socialLinks !== undefined) {
      updates.push('social_links = ?');
      params.push(data.socialLinks);
    }
    
    if (data.themePreference !== undefined) {
      updates.push('theme_preference = ?');
      params.push(data.themePreference);
    }
    
    if (updates.length > 0) {
      // Add the user ID as the last parameter
      params.push(userId);
      
      // Execute the update
      sqlite.prepare(`
        UPDATE users 
        SET ${updates.join(', ')}
        WHERE id = ?
      `).run(...params);
    }
    
    // Get the updated user
    const updatedUser = await this.getUser(userId);
    if (!updatedUser) {
      throw new Error('Failed to retrieve updated user');
    }
    
    return updatedUser;
  }
  
  async getUserProfile(userId: number): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }
  
  // Admin operations
  async getAllUsers(): Promise<User[]> {
    const users = sqlite.prepare(`
      SELECT * FROM users
      ORDER BY created_at DESC
    `).all();
    
    return users.map((row: any) => this.transformUser(row));
  }
  
  async updateUserRole(userId: number, adminId: number, data: { isModerator?: boolean, isAdmin?: boolean }): Promise<User> {
    // Check if the user exists
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Update the roles
    if (data.isModerator !== undefined || data.isAdmin !== undefined) {
      sqlite.prepare(`
        UPDATE users 
        SET 
          is_moderator = CASE WHEN ? IS NOT NULL THEN ? ELSE is_moderator END,
          is_admin = CASE WHEN ? IS NOT NULL THEN ? ELSE is_admin END
        WHERE id = ?
      `).run(
        data.isModerator !== undefined ? 1 : null,
        data.isModerator === true ? 1 : 0,
        data.isAdmin !== undefined ? 1 : null,
        data.isAdmin === true ? 1 : 0,
        userId
      );
    }
    
    // Get the updated user
    const updatedUser = await this.getUser(userId);
    if (!updatedUser) {
      throw new Error('Failed to retrieve updated user');
    }
    
    return updatedUser;
  }
  
  async banUser(userId: number, adminId: number, data: { isBanned: boolean, banReason?: string }): Promise<User> {
    // Check if the user exists
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Format current date for SQLite
    const currentDate = data.isBanned ? new Date().toISOString() : null;
    
    // Update the ban status
    sqlite.prepare(`
      UPDATE users 
      SET 
        is_banned = ?,
        ban_reason = ?,
        banned_by = ?,
        banned_at = ?
      WHERE id = ?
    `).run(
      data.isBanned ? 1 : 0,
      data.banReason || null,
      data.isBanned ? adminId : null,
      currentDate,
      userId
    );
    
    // Get the updated user
    const updatedUser = await this.getUser(userId);
    if (!updatedUser) {
      throw new Error('Failed to retrieve updated user');
    }
    
    return updatedUser;
  }

  // Image operations
  async createImage(imageData: Omit<InsertImage, 'id'> & { userId: number }): Promise<Image> {
    // Insert the image
    const result = sqlite.prepare(`
      INSERT INTO images (title, description, filename, user_id) 
      VALUES (?, ?, ?, ?)
    `).run(
      imageData.title, 
      imageData.description || null, 
      imageData.filename, 
      imageData.userId
    );
    
    // Get the inserted image
    const image = sqlite.prepare('SELECT * FROM images WHERE id = ?').get(result.lastInsertRowid);
    
    return this.transformImage(image);
  }

  async getImageById(id: number): Promise<Image | undefined> {
    const image = sqlite.prepare('SELECT * FROM images WHERE id = ?').get(id);
    return image ? this.transformImage(image) : undefined;
  }
  
  // Helper to transform SQLite row to User
  private transformUser(row: any): User {
    return {
      id: Number(row.id),
      name: row.name,
      email: row.email,
      password: row.password,
      isVerified: Boolean(row.is_verified),
      verificationToken: row.verification_token,
      isModerator: Boolean(row.is_moderator),
      isAdmin: Boolean(row.is_admin),
      isBanned: Boolean(row.is_banned),
      banReason: row.ban_reason,
      bannedBy: row.banned_by ? Number(row.banned_by) : null,
      bannedAt: row.banned_at,
      bio: row.bio,
      profilePicture: row.profile_picture,
      website: row.website,
      socialLinks: row.social_links,
      themePreference: row.theme_preference || 'default',
      createdAt: row.created_at
    };
  }
  
  // Helper to transform SQLite row to Image
  private transformImage(row: any): Image {
    return {
      id: Number(row.id),
      title: row.title,
      description: row.description,
      filename: row.filename,
      status: row.status,
      userId: Number(row.user_id),
      reviewedBy: row.reviewed_by ? Number(row.reviewed_by) : null,
      rejectionReason: row.rejection_reason,
      isPublic: row.is_public === undefined ? true : Boolean(row.is_public),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  async getApprovedImages(): Promise<(Image & { user: Pick<User, 'id' | 'name'> })[]> {
    // Use raw SQL for SQLite
    const results = sqlite.prepare(`
      SELECT 
        i.*, 
        u.id as user_id, 
        u.name as user_name
      FROM images i
      JOIN users u ON i.user_id = u.id
      WHERE i.status = 'approved'
      ORDER BY i.created_at DESC
    `).all();
    
    // Transform results to the expected format
    return results.map((row: any) => {
      const image = this.transformImage(row);
      return {
        ...image,
        user: {
          id: Number(row.user_id),
          name: row.user_name
        }
      };
    });
  }

  async getUserImages(userId: number): Promise<Image[]> {
    const results = sqlite.prepare(`
      SELECT * FROM images
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).all(userId);
    
    // Transform results to the expected format
    return results.map((row: any) => this.transformImage(row));
  }
  
  async updateImageVisibility(imageId: number, userId: number, isPublic: boolean): Promise<Image> {
    // Check if the image exists and belongs to the user
    const image = await this.getImageById(imageId);
    
    if (!image) {
      throw new Error('Image not found');
    }
    
    if (image.userId !== userId) {
      throw new Error('You do not have permission to update this image');
    }
    
    // Update the image visibility
    const currentDate = new Date().toISOString();
    
    sqlite.prepare(`
      UPDATE images 
      SET 
        is_public = ?,
        updated_at = ?
      WHERE id = ?
    `).run(isPublic ? 1 : 0, currentDate, imageId);
    
    // Get the updated image
    const updatedImage = await this.getImageById(imageId);
    if (!updatedImage) {
      throw new Error('Failed to retrieve updated image');
    }
    
    return updatedImage;
  }

  async getPendingImages(): Promise<(Image & { user: Pick<User, 'id' | 'name' | 'email'> })[]> {
    const results = sqlite.prepare(`
      SELECT 
        i.*, 
        u.id as user_id, 
        u.name as user_name, 
        u.email as user_email
      FROM images i
      JOIN users u ON i.user_id = u.id
      WHERE i.status = 'pending'
      ORDER BY i.created_at DESC
    `).all();
    
    // Transform results to the expected format
    return results.map((row: any) => {
      const image = this.transformImage(row);
      return {
        ...image,
        user: {
          id: Number(row.user_id),
          name: row.user_name,
          email: row.user_email
        }
      };
    });
  }

  async updateImageStatus(
    imageId: number, 
    status: "approved" | "rejected", 
    moderatorId: number,
    rejectionReason?: string
  ): Promise<Image> {
    // Format current date for SQLite
    const currentDate = new Date().toISOString();
    
    // Update the image using raw SQL
    sqlite.prepare(`
      UPDATE images 
      SET 
        status = ?,
        reviewed_by = ?,
        rejection_reason = ?,
        updated_at = ?
      WHERE id = ?
    `).run(status, moderatorId, rejectionReason || null, currentDate, imageId);
    
    // Fetch the updated image
    const image = sqlite.prepare(`
      SELECT * FROM images WHERE id = ?
    `).get(imageId);
    
    if (!image) {
      throw new Error('Image not found after update');
    }
    
    // Transform the result to the expected format
    return this.transformImage(image);
  }

  async getModerationStats(): Promise<{
    pending: number;
    approvedToday: number;
    rejectedToday: number;
  }> {
    // Get today's date at midnight in ISO format for SQLite
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();
    
    // Get counts individually using raw SQLite
    const pending = sqlite.prepare(`
      SELECT COUNT(*) as count FROM images WHERE status = 'pending'
    `).get().count;
    
    const approvedToday = sqlite.prepare(`
      SELECT COUNT(*) as count FROM images 
      WHERE status = 'approved' AND updated_at >= ?
    `).get(todayISO).count;
    
    const rejectedToday = sqlite.prepare(`
      SELECT COUNT(*) as count FROM images 
      WHERE status = 'rejected' AND updated_at >= ?
    `).get(todayISO).count;
    
    return {
      pending: Number(pending || 0),
      approvedToday: Number(approvedToday || 0),
      rejectedToday: Number(rejectedToday || 0)
    };
  }
  
  // Album operations
  async createAlbum(albumData: InsertAlbum & { userId: number }): Promise<Album> {
    const currentDate = new Date().toISOString();
    
    // Insert the album
    const result = sqlite.prepare(`
      INSERT INTO albums (title, description, user_id, is_public, created_at, updated_at) 
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      albumData.title,
      albumData.description || null,
      albumData.userId,
      albumData.isPublic === false ? 0 : 1,
      currentDate,
      currentDate
    );
    
    // Get the inserted album
    const album = sqlite.prepare('SELECT * FROM albums WHERE id = ?').get(result.lastInsertRowid);
    
    return this.transformAlbum(album);
  }
  
  private transformAlbum(row: any): Album {
    return {
      id: Number(row.id),
      title: row.title,
      description: row.description,
      coverImageId: row.cover_image_id ? Number(row.cover_image_id) : null,
      userId: Number(row.user_id),
      isPublic: Boolean(row.is_public),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
  
  async getUserAlbums(userId: number): Promise<Album[]> {
    const results = sqlite.prepare(`
      SELECT * FROM albums
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).all(userId);
    
    // Transform results to the expected format
    return results.map((row: any) => this.transformAlbum(row));
  }
  
  async getAlbumById(id: number): Promise<(Album & { images: (Image & { user: Pick<User, 'id' | 'name'> })[] }) | undefined> {
    // Get the album
    const album = sqlite.prepare('SELECT * FROM albums WHERE id = ?').get(id);
    
    if (!album) {
      return undefined;
    }
    
    // Get images in the album
    const results = sqlite.prepare(`
      SELECT 
        i.*, 
        ai.added_at,
        u.id as user_id, 
        u.name as user_name
      FROM album_images ai
      JOIN images i ON ai.image_id = i.id
      JOIN users u ON i.user_id = u.id
      WHERE ai.album_id = ? AND i.status = 'approved'
      ORDER BY ai.added_at DESC
    `).all(id);
    
    // Transform results to the expected format
    const transformedAlbum = this.transformAlbum(album);
    
    const images = results.map((row: any) => {
      const image = this.transformImage(row);
      return {
        ...image,
        user: {
          id: Number(row.user_id),
          name: row.user_name
        }
      };
    });
    
    return {
      ...transformedAlbum,
      images
    };
  }
  
  async updateAlbum(albumId: number, userId: number, data: UpdateAlbum): Promise<Album> {
    // Check if the album exists and belongs to the user
    const album = await this.getAlbumById(albumId);
    
    if (!album) {
      throw new Error('Album not found');
    }
    
    if (album.userId !== userId) {
      throw new Error('You do not have permission to update this album');
    }
    
    // Build the update query dynamically
    const updates = [];
    const params = [];
    
    if (data.title !== undefined) {
      updates.push('title = ?');
      params.push(data.title);
    }
    
    if (data.description !== undefined) {
      updates.push('description = ?');
      params.push(data.description);
    }
    
    if (data.coverImageId !== undefined) {
      updates.push('cover_image_id = ?');
      params.push(data.coverImageId);
    }
    
    if (data.isPublic !== undefined) {
      updates.push('is_public = ?');
      params.push(data.isPublic ? 1 : 0);
    }
    
    if (updates.length > 0) {
      // Add updated_at and album ID as parameters
      const currentDate = new Date().toISOString();
      updates.push('updated_at = ?');
      params.push(currentDate);
      
      // Add the album ID as the last parameter
      params.push(albumId);
      
      // Execute the update
      sqlite.prepare(`
        UPDATE albums 
        SET ${updates.join(', ')}
        WHERE id = ?
      `).run(...params);
    }
    
    // Get the updated album details (without images)
    const updatedAlbum = sqlite.prepare('SELECT * FROM albums WHERE id = ?').get(albumId);
    
    if (!updatedAlbum) {
      throw new Error('Failed to retrieve updated album');
    }
    
    return this.transformAlbum(updatedAlbum);
  }
  
  async deleteAlbum(albumId: number, userId: number): Promise<void> {
    // Check if the album exists and belongs to the user
    const album = await this.getAlbumById(albumId);
    
    if (!album) {
      throw new Error('Album not found');
    }
    
    if (album.userId !== userId) {
      throw new Error('You do not have permission to delete this album');
    }
    
    // Delete the album (album_images will be deleted through ON DELETE CASCADE)
    sqlite.prepare(`
      DELETE FROM albums WHERE id = ?
    `).run(albumId);
  }
  
  async addImageToAlbum(albumId: number, userId: number, imageId: number): Promise<void> {
    // Check if the album exists and belongs to the user
    const album = await this.getAlbumById(albumId);
    
    if (!album) {
      throw new Error('Album not found');
    }
    
    if (album.userId !== userId) {
      throw new Error('You do not have permission to update this album');
    }
    
    // Check if the image exists and is approved
    const image = await this.getImageById(imageId);
    
    if (!image) {
      throw new Error('Image not found');
    }
    
    if (image.status !== 'approved') {
      throw new Error('Only approved images can be added to albums');
    }
    
    // Check if the image is already in the album
    const existingEntry = sqlite.prepare(`
      SELECT id FROM album_images WHERE album_id = ? AND image_id = ?
    `).get(albumId, imageId);
    
    if (existingEntry) {
      // Image already in album, no need to do anything
      return;
    }
    
    // Add the image to the album
    const currentDate = new Date().toISOString();
    
    sqlite.prepare(`
      INSERT INTO album_images (album_id, image_id, added_at)
      VALUES (?, ?, ?)
    `).run(albumId, imageId, currentDate);
    
    // If this is the first image and there's no cover image, set it as the cover
    if (!album.coverImageId) {
      sqlite.prepare(`
        UPDATE albums
        SET cover_image_id = ?, updated_at = ?
        WHERE id = ? AND cover_image_id IS NULL
      `).run(imageId, currentDate, albumId);
    }
  }
  
  async removeImageFromAlbum(albumId: number, userId: number, imageId: number): Promise<void> {
    // Check if the album exists and belongs to the user
    const album = await this.getAlbumById(albumId);
    
    if (!album) {
      throw new Error('Album not found');
    }
    
    if (album.userId !== userId) {
      throw new Error('You do not have permission to update this album');
    }
    
    // Remove the image from the album
    sqlite.prepare(`
      DELETE FROM album_images
      WHERE album_id = ? AND image_id = ?
    `).run(albumId, imageId);
    
    // If the removed image was the cover image, update the cover image to another image in the album
    if (album.coverImageId === imageId) {
      // Get the first image in the album to use as the new cover
      const firstImage = sqlite.prepare(`
        SELECT image_id
        FROM album_images
        WHERE album_id = ?
        ORDER BY added_at DESC
        LIMIT 1
      `).get(albumId);
      
      const currentDate = new Date().toISOString();
      
      sqlite.prepare(`
        UPDATE albums
        SET cover_image_id = ?, updated_at = ?
        WHERE id = ?
      `).run(firstImage ? firstImage.image_id : null, currentDate, albumId);
    }
  }
  
  async getPublicAlbums(): Promise<(Album & { user: Pick<User, 'id' | 'name'> })[]> {
    // Get all public albums
    const results = sqlite.prepare(`
      SELECT 
        a.*,
        u.id as user_id,
        u.name as user_name
      FROM albums a
      JOIN users u ON a.user_id = u.id
      WHERE a.is_public = 1
      ORDER BY a.created_at DESC
    `).all();
    
    // Transform results to the expected format
    return results.map((row: any) => {
      const album = this.transformAlbum(row);
      return {
        ...album,
        user: {
          id: Number(row.user_id),
          name: row.user_name
        }
      };
    });
  }
}

export const storage = new DatabaseStorage();
