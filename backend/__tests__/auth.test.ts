import { describe, beforeAll, afterAll, beforeEach, afterEach, it, expect } from '@jest/globals';
import request from 'supertest';
import { app } from '../index.js';
import { PrismaClient, User, UserRole, Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Extend User type to include resetToken fields
type UserWithResetToken = User & {
  resetToken: string | null;
  resetTokenExpiry: Date | null;
};

describe('Authentication Endpoints', () => {
  let testUser: UserWithResetToken;

  beforeAll(async () => {
    await prisma.$connect();
    
    // Create test user
    const hashedPassword = await bcrypt.hash('testPassword123', 10);
    testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        password: hashedPassword,
        name: 'Test Club',
        role: UserRole.ADMIN,
      },
    }) as UserWithResetToken;
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.user.delete({
      where: { id: testUser.id },
    });
    await prisma.$disconnect();
  });

  describe('POST /auth/reset-password/request', () => {
    it('should send reset code for valid email', async () => {
      const response = await request(app.server)
        .post('/auth/reset-password/request')
        .send({ email: testUser.email });
      
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('message', 'If an account exists, a password reset email has been sent');
      
      // Verify reset token was created
      const updatedUser = await prisma.user.findUnique({
        where: { id: testUser.id },
      }) as UserWithResetToken;
      
      expect(updatedUser?.resetToken).toBeTruthy();
      expect(updatedUser?.resetTokenExpiry).toBeTruthy();
    });

    it('should handle invalid email', async () => {
      const response = await request(app.server)
        .post('/auth/reset-password/request')
        .send({ email: 'nonexistent@example.com' });
      
      expect(response.statusCode).toBe(200); // Should still return 200 to prevent email enumeration
      expect(response.body).toHaveProperty('message', 'If an account exists, a password reset email has been sent');
    });

    it('should rate limit excessive requests', async () => {
      const requests = Array(6).fill(null).map(() =>
        request(app.server)
          .post('/auth/reset-password/request')
          .send({ email: testUser.email })
      );
      
      const responses = await Promise.all(requests);
      const tooManyRequests = responses.filter((r) => r.statusCode === 429);
      expect(tooManyRequests.length).toBeGreaterThan(0);
    });
  });

  describe('POST /auth/reset-password/verify', () => {
    beforeEach(async () => {
      // Create a fresh reset token
      await prisma.user.update({
        where: { id: testUser.id },
        data: {
          resetToken: '123456',
          resetTokenExpiry: new Date(Date.now() + 3600000), // 1 hour from now
        } as Prisma.UserUpdateInput,
      });
    });

    afterEach(async () => {
      // Cleanup reset token
      await prisma.user.update({
        where: { id: testUser.id },
        data: {
          resetToken: null,
          resetTokenExpiry: null,
        } as Prisma.UserUpdateInput,
      });
    });

    it('should verify valid reset token', async () => {
      const response = await request(app.server)
        .post('/auth/reset-password/verify')
        .send({
          email: testUser.email,
          token: '123456',
        });
      
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('valid', true);
    });

    it('should reject invalid reset token', async () => {
      const response = await request(app.server)
        .post('/auth/reset-password/verify')
        .send({
          email: testUser.email,
          token: '000000',
        });
      
      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject expired reset token', async () => {
      // Update reset token to be expired
      await prisma.user.update({
        where: { id: testUser.id },
        data: {
          resetTokenExpiry: new Date(Date.now() - 3600000), // 1 hour ago
        } as Prisma.UserUpdateInput,
      });

      const response = await request(app.server)
        .post('/auth/reset-password/verify')
        .send({
          email: testUser.email,
          token: '123456',
        });
      
      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /auth/reset-password/reset', () => {
    beforeEach(async () => {
      // Create a fresh reset token
      await prisma.user.update({
        where: { id: testUser.id },
        data: {
          resetToken: '123456',
          resetTokenExpiry: new Date(Date.now() + 3600000),
        } as Prisma.UserUpdateInput,
      });
    });

    afterEach(async () => {
      // Cleanup reset token
      await prisma.user.update({
        where: { id: testUser.id },
        data: {
          resetToken: null,
          resetTokenExpiry: null,
        } as Prisma.UserUpdateInput,
      });
    });

    it('should reset password with valid token', async () => {
      const newPassword = 'newPassword123';
      
      const response = await request(app.server)
        .post('/auth/reset-password/reset')
        .send({
          email: testUser.email,
          token: '123456',
          password: newPassword,
        });
      
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('message', 'Password reset successful');

      // Verify password was updated
      const updatedUser = await prisma.user.findUnique({
        where: { id: testUser.id },
      });
      
      if (!updatedUser) {
        throw new Error('User not found after password reset');
      }
      
      const passwordValid = await bcrypt.compare(newPassword, updatedUser.password);
      expect(passwordValid).toBe(true);
    });

    it('should reject expired reset token', async () => {
      // Update reset token to be expired
      await prisma.user.update({
        where: { id: testUser.id },
        data: {
          resetTokenExpiry: new Date(Date.now() - 3600000), // 1 hour ago
        } as Prisma.UserUpdateInput,
      });

      const response = await request(app.server)
        .post('/auth/reset-password/reset')
        .send({
          email: testUser.email,
          token: '123456',
          password: 'newPassword123',
        });
      
      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });
}); 