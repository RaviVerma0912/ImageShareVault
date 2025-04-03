import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser, insertUserSchema } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

/**
 * Hash a password with a random salt
 */
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

/**
 * Compare a supplied password with a stored hash+salt
 */
async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  // Debug log (without exposing actual passwords)
  console.log(`Comparing passwords - supplied length: ${supplied?.length || 0}, stored length: ${stored?.length || 0}`);
  
  try {
    // Basic validation
    if (!stored || !stored.includes('.')) {
      console.log('Invalid stored password format');
      return false;
    }
    
    const [storedHash, salt] = stored.split('.');
    if (!storedHash || !salt) {
      console.log('Missing hash or salt component');
      return false;
    }
    
    // Hash the supplied password with the same salt
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    const storedBuf = Buffer.from(storedHash, 'hex');
    
    // Compare using constant-time comparison (to prevent timing attacks)
    const result = timingSafeEqual(suppliedBuf, storedBuf);
    console.log(`Password comparison result: ${result ? 'match' : 'no match'}`);
    return result;
  } catch (error) {
    console.error('Error comparing passwords:', error);
    return false;
  }
}

export function setupAuth(app: Express): void {
  // Session configuration
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "image-gallery-secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax"
    }
  };

  // Configure session and passport middleware
  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Local strategy for username/password authentication
  passport.use(
    new LocalStrategy(
      { usernameField: "email" },
      async (email, password, done) => {
        console.log(`Login attempt with email: "${email}"`);
        
        try {
          // Find user by email
          const user = await storage.getUserByEmail(email);
          
          // If no user found, authentication fails
          if (!user) {
            console.log(`No user found with email: "${email}"`);
            return done(null, false, { message: "Incorrect email or password" });
          }
          
          console.log(`Found user with ID: ${user.id}`);
          
          // Check if user is banned
          if (user.isBanned) {
            console.log(`User ID ${user.id} is banned. Reason: ${user.banReason || 'No reason provided'}`);
            return done(null, false, { 
              message: `Your account has been banned. ${user.banReason ? `Reason: ${user.banReason}` : ''}` 
            });
          }
          
          // Verify password
          const isPasswordValid = await comparePasswords(password, user.password);
          if (!isPasswordValid) {
            console.log('Password verification failed');
            return done(null, false, { message: "Incorrect email or password" });
          }
          
          console.log('Authentication successful');
          return done(null, user);
        } catch (error) {
          console.error('Authentication error:', error);
          return done(error);
        }
      }
    )
  );

  // User serialization for session storage (store only user ID in session)
  passport.serializeUser((user, done) => {
    console.log(`Serializing user: ${user.id}`);
    done(null, user.id);
  });

  // User deserialization (retrieve full user from database using ID)
  passport.deserializeUser(async (id: number, done) => {
    console.log(`Deserializing user: ${id}`);
    try {
      const user = await storage.getUser(id);
      if (!user) {
        console.log(`User not found for ID: ${id}`);
        return done(null, false);
      }
      done(null, user);
    } catch (error) {
      console.error('Deserialization error:', error);
      done(error);
    }
  });

  // Registration endpoint
  app.post("/api/register", async (req: Request, res: Response, next: NextFunction) => {
    console.log('Registration attempt:', JSON.stringify(req.body));
    
    try {
      // Validate request body against schema
      const userData = insertUserSchema.parse(req.body);
      
      // Password is required
      if (!userData.password) {
        return res.status(400).json({ message: "Password is required" });
      }
      
      // Remove confirmPassword field
      const { confirmPassword, ...userToInsert } = userData;
      
      // Check for existing email 
      if (userData.email && userData.email.trim() !== '') {
        const existingUser = await storage.getUserByEmail(userData.email);
        if (existingUser) {
          console.log(`Registration failed: Email already in use: ${userData.email}`);
          return res.status(400).json({ message: "Email already in use" });
        }
      }

      // Hash the password
      const hashedPassword = await hashPassword(userData.password);
      
      // Create the user
      const user = await storage.createUser({
        ...userToInsert,
        password: hashedPassword,
        is_verified: 1 // Auto-verify users
      });

      console.log(`User registered successfully: ID ${user.id}`);

      // Log the user in automatically
      req.login(user, (err) => {
        if (err) {
          console.error('Error logging in after registration:', err);
          return next(err);
        }
        
        // Return user data (excluding sensitive fields)
        const { password, verificationToken, ...safeUser } = user;
        res.status(201).json(safeUser);
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      
      // Handle validation errors
      if (error.errors) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Login endpoint
  app.post("/api/login", (req: Request, res: Response, next: NextFunction) => {
    console.log('Login attempt:', JSON.stringify(req.body));
    
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        console.error('Login error:', err);
        return next(err);
      }
      
      if (!user) {
        console.log('Login failed:', info?.message || 'Unknown reason');
        return res.status(401).json({ 
          message: info?.message || "Authentication failed" 
        });
      }
      
      // Complete login by establishing session
      req.login(user, (err) => {
        if (err) {
          console.error('Session creation error:', err);
          return next(err);
        }
        
        console.log(`User logged in: ID ${user.id}`);
        
        // Return user data (excluding sensitive fields)
        const { password, verificationToken, ...safeUser } = user;
        res.json(safeUser);
      });
    })(req, res, next);
  });

  // Logout endpoint
  app.post("/api/logout", (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated()) {
      console.log(`User logging out: ID ${req.user.id}`);
    }
    
    req.logout((err) => {
      if (err) {
        console.error('Logout error:', err);
        return next(err);
      }
      console.log('Logout successful');
      res.sendStatus(200);
    });
  });

  // Get current user endpoint
  app.get("/api/user", (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    
    console.log(`Returning user data for ID: ${req.user.id}`);
    
    // Return user data (excluding sensitive fields)
    const { password, verificationToken, ...safeUser } = req.user;
    res.json(safeUser);
  });
}
