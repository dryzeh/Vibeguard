import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { authRateLimit, apiRateLimit } from '../middleware/rateLimit.js';
import { password, sanitize } from '../utils/security.js';
import { sendEmail } from '../utils/email.js';
import { Prisma, UserRole } from '@prisma/client';
import { RoutePlugin, FastifyInstanceWithServices } from '../types/fastify.js';
import { FastifyPluginOptions } from 'fastify';

// Input validation schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  role: z.enum(['ADMIN', 'MANAGER', 'SECURITY', 'STAFF']).default('STAFF'),
  nightclubId: z.string().optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

const resetRequestSchema = z.object({
  email: z.string().email()
});

const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8)
});

const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).optional(),
  deviceId: z.string().optional(),
  lastLocation: z.any().optional()
});

const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8)
});

// Route types
type RegisterBody = z.infer<typeof registerSchema>;
type LoginBody = z.infer<typeof loginSchema>;
type ResetRequestBody = z.infer<typeof resetRequestSchema>;
type ResetPasswordBody = z.infer<typeof resetPasswordSchema>;
type UpdateProfileBody = z.infer<typeof updateProfileSchema>;
type ChangePasswordBody = z.infer<typeof changePasswordSchema>;

interface AuthenticatedRequest extends FastifyRequest {
  user: {
    id: string;
    email: string;
    role: string;
  };
}

const userRoutes: RoutePlugin = function (
  fastify: FastifyInstanceWithServices,
  options: FastifyPluginOptions,
  done: (err?: Error) => void
) {
  // Register new user
  fastify.post<{ Body: RegisterBody }>('/register', {
    preHandler: [apiRateLimit],
    schema: {
      body: zodToJsonSchema(registerSchema)
    }
  }, async (request: FastifyRequest<{ Body: RegisterBody }>, reply: FastifyReply) => {
    const { email, password: plainPassword, name, nightclubId, role } = request.body;

    // Check if user exists
    const existingUser = await fastify.prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return reply.code(400).send({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await password.hash(plainPassword);

    // Create user
    const user = await fastify.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role,
        nightclubId
      }
    });

    // Log action
    await fastify.prisma.auditLog.create({
      data: {
        action: 'USER_REGISTERED',
        entityType: 'USER',
        entityId: user.id,
        metadata: {
          role,
          nightclubId
        }
      }
    });

    // Send welcome email
    await sendEmail({
      to: email,
      subject: 'Welcome to VibeGuard',
      text: `Welcome ${name}! Your account has been created successfully.`
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      nightclubId: user.nightclubId
    };
  });

  // Login user
  fastify.post<{ Body: LoginBody }>('/login', {
    preHandler: [authRateLimit],
    schema: {
      body: zodToJsonSchema(loginSchema)
    }
  }, async (request: FastifyRequest<{ Body: LoginBody }>, reply: FastifyReply) => {
    const { email, password: plainPassword } = request.body;

    // Find user
    const user = await fastify.prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValid = await password.verify(plainPassword, user.password);
    if (!isValid) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = await reply.jwtSign({
      id: user.id,
      email: user.email,
      role: user.role
    });

    // Update last login
    await fastify.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    return { token };
  });

  // Request password reset
  fastify.post<{ Body: ResetRequestBody }>('/reset-password/request', {
    preHandler: [authRateLimit],
    schema: {
      body: zodToJsonSchema(resetRequestSchema)
    }
  }, async (request, reply) => {
    const { email } = request.body;

    // Find user
    const user = await fastify.prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      // Don't reveal if user exists
      return { message: 'If an account exists, a password reset email has been sent' };
    }

    // Generate reset token
    const token = await password.generateResetToken();
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour

    // Save token
    await fastify.prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: token,
        resetTokenExpiry: expiresAt
      } as Prisma.UserUpdateInput
    });

    // Send reset email
    await sendEmail({
      to: email,
      subject: 'Reset Your Password',
      text: `Click here to reset your password: ${process.env.FRONTEND_URL}/reset-password?token=${token}`
    });

    return { message: 'If an account exists, a password reset email has been sent' };
  });

  // Reset password
  fastify.post<{ Body: ResetPasswordBody }>('/reset-password/reset', {
    preHandler: [authRateLimit],
    schema: {
      body: zodToJsonSchema(resetPasswordSchema)
    }
  }, async (request, reply) => {
    const { token, password: newPassword } = request.body;

    // Find user with valid token
    const user = await fastify.prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date()
        }
      } as Prisma.UserWhereInput
    });

    if (!user) {
      return reply.code(400).send({ error: 'Invalid or expired reset token' });
    }

    // Hash new password
    const hashedPassword = await password.hash(newPassword);

    // Update password and clear reset token
    await fastify.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null
      } as Prisma.UserUpdateInput
    });

    return { message: 'Password has been reset successfully' };
  });

  // Protected routes
  fastify.register(async function (fastify) {
    fastify.addHook('preHandler', apiRateLimit);
    
    // Update user profile
    fastify.put<{ Body: UpdateProfileBody }>('/profile', {
      onRequest: [fastify.authenticate],
      schema: {
        body: zodToJsonSchema(updateProfileSchema)
      }
    }, async (request, reply) => {
      const { name, email, currentPassword, newPassword, deviceId, lastLocation } = request.body;
      const userId = (request.user as { id: string })?.id;

      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      // Get user
      const user = await fastify.prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }

      // Verify current password
      if (currentPassword && !await password.verify(currentPassword, user.password)) {
        return reply.code(401).send({ error: 'Current password is incorrect' });
      }

      // Hash new password
      const hashedPassword = newPassword ? await password.hash(newPassword) : user.password;

      // Update user
      const updatedUser = await fastify.prisma.user.update({
        where: { id: userId },
        data: {
          name,
          email: email ? sanitize.email(email) : undefined,
          password: hashedPassword,
          deviceId,
          lastLocation
        }
      });

      // Log action
      await fastify.prisma.auditLog.create({
        data: {
          action: 'PROFILE_UPDATED',
          entityType: 'USER',
          entityId: updatedUser.id,
          userId: updatedUser.id,
          metadata: { updatedFields: ['name', 'email', 'password', 'deviceId', 'lastLocation'] }
        }
      });

      return {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        deviceId: updatedUser.deviceId,
        lastLocation: updatedUser.lastLocation
      };
    });

    // Change password
    fastify.put<{ Body: ChangePasswordBody }>('/password', {
      onRequest: [fastify.authenticate],
      schema: {
        body: zodToJsonSchema(changePasswordSchema)
      }
    }, async (request, reply) => {
      const { currentPassword, newPassword } = request.body;
      const userId = (request.user as { id: string })?.id;

      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      // Get user
      const user = await fastify.prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }

      // Verify current password
      const isValid = await password.verify(currentPassword, user.password);
      if (!isValid) {
        return reply.code(401).send({ error: 'Current password is incorrect' });
      }

      // Hash new password
      const hashedPassword = await password.hash(newPassword);

      // Update password
      await fastify.prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword }
      });

      // Log action
      await fastify.prisma.auditLog.create({
        data: {
          action: 'PASSWORD_UPDATED',
          entityType: 'USER',
          entityId: user.id,
          userId: user.id
        }
      });

      return { message: 'Password updated successfully' };
    });
  });

  done();
};

export default userRoutes; 