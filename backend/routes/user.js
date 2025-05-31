const { z } = require('zod');
const { password, sanitize } = require('../utils/security');
const { sendEmail } = require('../utils/email');

// Input validation schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  nightclubId: z.string().optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'SECURITY', 'STAFF']).default('STAFF')
});

const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).optional(),
  deviceId: z.string().optional(),
  lastLocation: z.any().optional()
});

const resetPasswordRequestSchema = z.object({
  email: z.string().email()
});

const resetPasswordSchema = z.object({
  token: z.string(),
  newPassword: z.string().min(8)
});

const userRoutes = async (fastify, options) => {
  // Register new user
  fastify.post('/users/register', async (request, reply) => {
    try {
      const data = registerSchema.parse(request.body);
      
      // Check if user already exists
      const existingUser = await fastify.prisma.user.findUnique({
        where: { email: sanitize.email(data.email) }
      });
      
      if (existingUser) {
        return reply.code(400).send({ error: 'Email already registered' });
      }
      
      // Hash password
      const hashedPassword = await password.hash(data.password);
      
      // Create user
      const user = await fastify.prisma.user.create({
        data: {
          ...data,
          password: hashedPassword,
          email: sanitize.email(data.email)
        }
      });
      
      // Log the action
      await fastify.prisma.auditLog.create({
        data: {
          action: 'USER_REGISTERED',
          entityType: 'User',
          entityId: user.id,
          metadata: { role: user.role }
        }
      });
      
      // Send welcome email if configured
      if (fastify.config.features.emailVerification) {
        await sendEmail({
          to: user.email,
          subject: 'Welcome to VibeGuard',
          template: 'welcome',
          data: { name: user.name }
        });
      }
      
      return { id: user.id, email: user.email, role: user.role };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid input', details: error.errors });
      }
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get user profile
  fastify.get('/users/profile', { onRequest: [fastify.authenticate] }, async (request) => {
    const user = await fastify.prisma.user.findUnique({
      where: { id: request.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        deviceId: true,
        lastLocation: true,
        nightclub: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    return user;
  });

  // Update user profile
  fastify.put('/users/profile', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    try {
      const data = updateProfileSchema.parse(request.body);
      
      // If updating password, verify current password
      if (data.newPassword) {
        const user = await fastify.prisma.user.findUnique({
          where: { id: request.user.id }
        });
        
        if (!data.currentPassword || !await password.verify(user.password, data.currentPassword)) {
          return reply.code(401).send({ error: 'Current password is incorrect' });
        }
        
        data.password = await password.hash(data.newPassword);
        delete data.currentPassword;
        delete data.newPassword;
      }
      
      // Update user
      const user = await fastify.prisma.user.update({
        where: { id: request.user.id },
        data: {
          ...data,
          email: data.email ? sanitize.email(data.email) : undefined
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          deviceId: true,
          lastLocation: true
        }
      });
      
      // Log the action
      await fastify.prisma.auditLog.create({
        data: {
          action: 'PROFILE_UPDATED',
          entityType: 'User',
          entityId: user.id,
          userId: user.id,
          metadata: { updatedFields: Object.keys(data) }
        }
      });
      
      return user;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid input', details: error.errors });
      }
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Request password reset
  fastify.post('/users/reset-password/request', async (request, reply) => {
    try {
      const { email } = resetPasswordRequestSchema.parse(request.body);
      const sanitizedEmail = sanitize.email(email);
      
      const user = await fastify.prisma.user.findUnique({
        where: { email: sanitizedEmail }
      });
      
      if (!user) {
        // Don't reveal if email exists
        return { message: 'If your email is registered, you will receive a password reset link' };
      }
      
      // Generate reset token
      const token = fastify.jwt.sign(
        { id: user.id, action: 'reset-password' },
        { expiresIn: '1h' }
      );
      
      // Store token in database
      await fastify.prisma.user.update({
        where: { id: user.id },
        data: {
          metadata: {
            resetToken: token,
            resetTokenExpires: new Date(Date.now() + 3600000) // 1 hour
          }
        }
      });
      
      // Send reset email
      if (fastify.config.features.passwordReset) {
        await sendEmail({
          to: user.email,
          subject: 'Reset Your Password',
          template: 'reset-password',
          data: {
            name: user.name,
            resetLink: `${fastify.config.frontendUrl}/reset-password?token=${token}`
          }
        });
      }
      
      return { message: 'If your email is registered, you will receive a password reset link' };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid input', details: error.errors });
      }
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Reset password with token
  fastify.post('/users/reset-password', async (request, reply) => {
    try {
      const { token, newPassword } = resetPasswordSchema.parse(request.body);
      
      // Verify token
      const decoded = fastify.jwt.verify(token);
      if (decoded.action !== 'reset-password') {
        return reply.code(400).send({ error: 'Invalid token' });
      }
      
      const user = await fastify.prisma.user.findUnique({
        where: { id: decoded.id }
      });
      
      if (!user || !user.metadata?.resetToken || user.metadata.resetToken !== token) {
        return reply.code(400).send({ error: 'Invalid or expired token' });
      }
      
      if (new Date(user.metadata.resetTokenExpires) < new Date()) {
        return reply.code(400).send({ error: 'Token has expired' });
      }
      
      // Update password
      const hashedPassword = await password.hash(newPassword);
      await fastify.prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          metadata: {
            resetToken: null,
            resetTokenExpires: null
          }
        }
      });
      
      // Log the action
      await fastify.prisma.auditLog.create({
        data: {
          action: 'PASSWORD_RESET',
          entityType: 'User',
          entityId: user.id,
          userId: user.id
        }
      });
      
      return { message: 'Password has been reset successfully' };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid input', details: error.errors });
      }
      if (error.name === 'JsonWebTokenError') {
        return reply.code(400).send({ error: 'Invalid token' });
      }
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}

export default userRoutes; 