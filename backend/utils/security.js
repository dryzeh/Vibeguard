import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { z } from 'zod';

/**
 * @typedef {Object} EncryptionResult
 * @property {string} encrypted - The encrypted data
 * @property {string} iv - The initialization vector
 */

/**
 * @typedef {Object} SanitizationResult
 * @property {string} email - Sanitized email
 * @property {string} name - Sanitized name
 * @property {string} phone - Sanitized phone number
 */

/**
 * Encryption utilities for secure data handling
 */
export const encryption = {
  /**
   * Encrypt data using AES-256-GCM
   * @param {string} data - Data to encrypt
   * @param {string} key - Encryption key (must be 32 bytes)
   * @returns {EncryptionResult} Encrypted data and IV
   */
  encrypt: (data, key) => {
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
   * @param {string} encrypted - Encrypted data
   * @param {string} key - Encryption key (must be 32 bytes)
   * @param {string} iv - Initialization vector
   * @returns {string} Decrypted data
   */
  decrypt: (encrypted, key, iv) => {
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
   * @param {number} [bytes=32] - Number of bytes to generate
   * @returns {string} Hex-encoded key
   */
  generateKey: (bytes = 32) => {
    return crypto.randomBytes(bytes).toString('hex');
  }
};

/**
 * Password hashing and verification utilities
 */
export const password = {
  /**
   * Hash a password using bcrypt
   * @param {string} plainPassword - Plain text password
   * @returns {Promise<string>} Hashed password
   */
  hash: async (plainPassword) => {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
    return bcrypt.hash(plainPassword, saltRounds);
  },
  
  /**
   * Verify a password against a hash
   * @param {string} plainPassword - Plain text password
   * @param {string} hash - Hashed password
   * @returns {Promise<boolean>} Whether the password matches
   */
  verify: async (plainPassword, hash) => {
    return bcrypt.compare(plainPassword, hash);
  }
};

/**
 * Input sanitization utilities
 */
export const sanitize = {
  /**
   * Sanitize an email address
   * @param {string} email - Email to sanitize
   * @returns {string} Sanitized email
   */
  email: (email) => {
    return email.toLowerCase().trim();
  },
  
  /**
   * Sanitize a name
   * @param {string} name - Name to sanitize
   * @returns {string} Sanitized name
   */
  name: (name) => {
    return name.trim().replace(/[^\p{L}\p{M}\p{Zs}-]/gu, '');
  },
  
  /**
   * Sanitize a phone number
   * @param {string} phone - Phone number to sanitize
   * @returns {string} Sanitized phone number
   */
  phone: (phone) => {
    return phone.replace(/[^\d+]/g, '');
  },
  
  /**
   * Sanitize user input data
   * @param {Object} data - Data to sanitize
   * @returns {SanitizationResult} Sanitized data
   */
  userInput: (data) => {
    const schema = z.object({
      email: z.string().email().transform(sanitize.email),
      name: z.string().min(1).transform(sanitize.name),
      phone: z.string().optional().transform(val => val ? sanitize.phone(val) : undefined)
    });
    
    return schema.parse(data);
  }
};

// Token management
const tokens = {
  generateApiKey() {
    return `ncs_${crypto.randomBytes(32).toString('hex')}`
  },
  
  generateResetToken() {
    return crypto.randomBytes(32).toString('hex')
  }
}

module.exports = { encryption, password, sanitize, tokens } 