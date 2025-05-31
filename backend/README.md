# VibeGuard Backend

The backend service for the VibeGuard security management system, built with Fastify, PostgreSQL, and WebSocket support.

## Features

- Real-time emergency alerts and updates via WebSocket
- Secure authentication with JWT
- Role-based access control
- Rate limiting and security features
- Email notifications
- Audit logging
- Admin dashboard support
- Multi-floor management
- Zone and sensor management
- Emergency response handling

## Prerequisites

- Node.js 18.x or later
- PostgreSQL 14.x or later
- SMTP server for email notifications

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   cd backend
   npm install
   ```

3. Create a `.env` file in the backend directory with the following variables:

   ```env
   # Server Configuration
   PORT=3001
   HOST=0.0.0.0
   NODE_ENV=development

   # Database Configuration
   DATABASE_URL="postgresql://user:password@localhost:5432/vibeguard?schema=public"
   DB_MAX_CONNECTIONS=10
   DB_IDLE_TIMEOUT=30000

   # JWT Configuration
   JWT_SECRET=your-secure-jwt-secret-key-here
   JWT_EXPIRES_IN=24h
   JWT_REFRESH_EXPIRES_IN=7d

   # Security Configuration
   BCRYPT_ROUNDS=12
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX=100
   CORS_ORIGIN=http://localhost:3000,http://localhost:3001

   # Email Configuration
   EMAIL_ENABLED=true
   EMAIL_PROVIDER=smtp
   SMTP_HOST=smtp.example.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-smtp-username
   SMTP_PASS=your-smtp-password
   EMAIL_FROM=noreply@vibeguard.com

   # Logging Configuration
   LOG_LEVEL=info
   LOG_FORMAT=json
   LOG_FILE=logs/app.log

   # Feature Flags
   ENABLE_RATE_LIMITING=true
   ENABLE_EMAIL_NOTIFICATIONS=true
   ENABLE_REAL_TIME_UPDATES=true
   ENABLE_AUDIT_LOGGING=true

   # Emergency Handling Configuration
   EMERGENCY_ALERT_TIMEOUT=300000
   EMERGENCY_CLEANUP_INTERVAL=86400000
   MAX_ACTIVE_EMERGENCIES=100

   # WebSocket Configuration
   WS_PING_INTERVAL=30000
   WS_PING_TIMEOUT=10000
   WS_MAX_PAYLOAD=65536

   # Admin Configuration
   ADMIN_DEFAULT_PASSWORD=ChangeMe123!
   ADMIN_MAX_LOGIN_ATTEMPTS=5
   ADMIN_LOCKOUT_DURATION=900000
   ```

4. Set up the database:
   ```bash
   npx prisma migrate dev
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

## Environment Variables

### Required Variables

- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret key for JWT token generation
- `SMTP_HOST`: SMTP server hostname
- `SMTP_USER`: SMTP server username
- `SMTP_PASS`: SMTP server password

### Optional Variables

#### Server Configuration
- `PORT`: Server port (default: 3001)
- `HOST`: Server host (default: 0.0.0.0)
- `NODE_ENV`: Environment (development/production)

#### Database Configuration
- `DB_MAX_CONNECTIONS`: Maximum database connections (default: 10)
- `DB_IDLE_TIMEOUT`: Database connection idle timeout in ms (default: 30000)

#### JWT Configuration
- `JWT_EXPIRES_IN`: Token expiration time (default: 24h)
- `JWT_REFRESH_EXPIRES_IN`: Refresh token expiration time (default: 7d)

#### Security Configuration
- `BCRYPT_ROUNDS`: Password hashing rounds (default: 12)
- `RATE_LIMIT_WINDOW_MS`: Rate limit window in ms (default: 900000)
- `RATE_LIMIT_MAX`: Maximum requests per window (default: 100)
- `CORS_ORIGIN`: Allowed CORS origins (comma-separated)

#### Email Configuration
- `EMAIL_ENABLED`: Enable email notifications (default: true)
- `EMAIL_PROVIDER`: Email provider (default: smtp)
- `SMTP_PORT`: SMTP server port (default: 587)
- `SMTP_SECURE`: Use TLS (default: false)
- `EMAIL_FROM`: Sender email address

#### Logging Configuration
- `LOG_LEVEL`: Logging level (default: info)
- `LOG_FORMAT`: Log format (json/pretty)
- `LOG_FILE`: Log file path

#### Feature Flags
- `ENABLE_RATE_LIMITING`: Enable rate limiting (default: true)
- `ENABLE_EMAIL_NOTIFICATIONS`: Enable email notifications (default: true)
- `ENABLE_REAL_TIME_UPDATES`: Enable WebSocket updates (default: true)
- `ENABLE_AUDIT_LOGGING`: Enable audit logging (default: true)

#### Emergency Handling
- `EMERGENCY_ALERT_TIMEOUT`: Alert timeout in ms (default: 300000)
- `EMERGENCY_CLEANUP_INTERVAL`: Cleanup interval in ms (default: 86400000)
- `MAX_ACTIVE_EMERGENCIES`: Maximum active emergencies (default: 100)

#### WebSocket Configuration
- `WS_PING_INTERVAL`: Ping interval in ms (default: 30000)
- `WS_PING_TIMEOUT`: Ping timeout in ms (default: 10000)
- `WS_MAX_PAYLOAD`: Maximum message size in bytes (default: 65536)

#### Admin Configuration
- `ADMIN_DEFAULT_PASSWORD`: Default admin password
- `ADMIN_MAX_LOGIN_ATTEMPTS`: Maximum login attempts (default: 5)
- `ADMIN_LOCKOUT_DURATION`: Account lockout duration in ms (default: 900000)

## API Documentation

### Authentication

#### POST /api/auth/login
Login with email and password.

Request:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "token": "jwt-token",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "User Name",
    "role": "SECURITY_STAFF",
    "nightclubId": "nightclub-id"
  }
}
```

### User Management

#### POST /api/users/register
Register a new user.

Request:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "User Name",
  "role": "SECURITY_STAFF",
  "nightclubId": "nightclub-id"
}
```

#### GET /api/users/profile
Get user profile (requires authentication).

#### PUT /api/users/profile
Update user profile (requires authentication).

Request:
```json
{
  "name": "New Name",
  "currentPassword": "current-password",
  "newPassword": "new-password"
}
```

### Emergency Management

#### POST /api/emergencies
Create a new emergency (requires authentication).

Request:
```json
{
  "braceletId": "bracelet-id",
  "zoneId": "zone-id",
  "type": "MEDICAL",
  "description": "Emergency description"
}
```

#### GET /api/emergencies/active
Get active emergencies (requires authentication).

#### PUT /api/emergencies/:id
Update emergency status (requires authentication).

Request:
```json
{
  "status": "RESOLVED",
  "resolution": "Emergency resolved"
}
```

### WebSocket Events

Connect to `/ws` endpoint to receive real-time updates.

Events:
- `EMERGENCY_CREATED`: New emergency created
- `EMERGENCY_UPDATED`: Emergency status updated
- `ALERT_CREATED`: New alert created
- `ALERT_UPDATED`: Alert status updated
- `BRACELET_LOCATION`: Bracelet location update
- `ZONE_STATUS`: Zone status update

## Development

### Available Scripts

- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm start`: Start production server
- `npm test`: Run tests
- `npm run lint`: Run linter
- `npm run format`: Format code
- `npm run migrate`: Run database migrations
- `npm run seed`: Seed database with test data

### Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test -- path/to/test.js

# Run tests with coverage
npm test -- --coverage
```

### Database Migrations

```bash
# Create a new migration
npx prisma migrate dev --name migration-name

# Apply migrations
npx prisma migrate deploy

# Reset database
npx prisma migrate reset
```

## Production Deployment

1. Set `NODE_ENV=production` in `.env`
2. Update all sensitive environment variables
3. Build the application:
   ```bash
   npm run build
   ```
4. Start the production server:
   ```bash
   npm start
   ```

### Production Considerations

- Use a proper process manager (PM2, Docker, etc.)
- Set up SSL/TLS
- Configure proper logging
- Set up monitoring and alerts
- Use a production-grade database
- Implement proper backup strategies
- Set up CI/CD pipelines

## Security

- All passwords are hashed using bcrypt
- JWT tokens are used for authentication
- Rate limiting is enabled by default
- CORS is configured for security
- Input validation is implemented
- Audit logging is available
- SQL injection protection via Prisma
- XSS protection via sanitization

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 