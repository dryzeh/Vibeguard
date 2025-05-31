import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { z } from 'zod';

export interface EncryptionResult {
  encrypted: string;
  iv: string;
}

export interface SanitizationResult {
  email: string;
  name: string;
  phone?: string;
}

export interface Coordinates {
  x: number;
  y: number;
}

export interface UserInput {
  email: string;
  name: string;
  phone?: string;
}

/**
 * Encryption utilities for secure data handling
 */
export const encryption = {
  /**
   * Encrypt data using AES-256-GCM
   */
  encrypt(data: string, key: string): EncryptionResult {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted: encrypted + authTag.toString('hex'),
      iv: iv.toString('hex')
    };
  },
  
  /**
   * Decrypt data using AES-256-GCM
   */
  decrypt(encrypted: string, key: string, iv: string): string {
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      Buffer.from(key, 'hex'),
      Buffer.from(iv, 'hex')
    );
    
    const authTag = Buffer.from(encrypted.slice(-32), 'hex');
    const encryptedData = encrypted.slice(0, -32);
    
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  },
  
  /**
   * Generate a secure random key
   */
  generateKey(bytes: number = 32): string {
    return crypto.randomBytes(bytes).toString('hex');
  }
};

const SALT_ROUNDS = 10;

/**
 * Password hashing and verification utilities
 */
export const password = {
  /**
   * Hash a plain text password
   * @param plainPassword The plain text password to hash
   * @returns Promise that resolves to the hashed password
   */
  async hash(plainPassword: string): Promise<string> {
    return bcrypt.hash(plainPassword, SALT_ROUNDS);
  },
  
  /**
   * Verify a plain text password against a hash
   * @param plainPassword The plain text password to verify
   * @param hash The hash to verify against
   * @returns Promise that resolves to true if the password matches
   */
  async verify(plainPassword: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hash);
  },
  
  /**
   * Generate a secure reset token
   * @returns Promise that resolves to a secure reset token
   */
  async generateResetToken(): Promise<string> {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(32, (err, buffer) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(buffer.toString('hex'));
      });
    });
  }
};

/**
 * Input sanitization utilities
 */
export const sanitize = {
  /**
   * Sanitize an email address
   */
  email(email: string): string {
    return email.toLowerCase().trim();
  },
  
  /**
   * Sanitize a name
   */
  name(name: string): string {
    return name.trim().replace(/[^\p{L}\p{M}\p{Zs}-]/gu, '');
  },
  
  /**
   * Sanitize a phone number
   */
  phone(phone: string): string {
    return phone.replace(/[^\d+]/g, '');
  },
  
  /**
   * Sanitize user input data
   */
  userInput(data: UserInput): SanitizationResult {
    const schema = z.object({
      email: z.string().email().transform(sanitize.email),
      name: z.string().min(1).transform(sanitize.name),
      phone: z.string().optional().transform(val => val ? sanitize.phone(val) : undefined)
    });
    
    return schema.parse(data);
  },

  /**
   * Sanitize user data by removing sensitive fields
   * @param user The user object to sanitize
   * @returns A sanitized version of the user object
   */
  user<T extends { password?: string; resetToken?: string; resetTokenExpiry?: Date }>(user: T): Omit<T, 'password' | 'resetToken' | 'resetTokenExpiry'> {
    const { password: _, resetToken: __, resetTokenExpiry: ___, ...sanitized } = user;
    return sanitized;
  }
};

/**
 * Token management utilities
 */
export const tokens = {
  /**
   * Generate a new API key
   */
  generateApiKey(): string {
    return `ncs_${crypto.randomBytes(32).toString('hex')}`;
  },
  
  /**
   * Generate a password reset token
   */
  generateResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}; 