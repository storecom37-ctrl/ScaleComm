# Role-Based Access Control (RBAC) Authentication System

## Overview

This document describes the implementation of a comprehensive Role-Based Access Control (RBAC) system with three user roles: **Super Admin**, **Owner**, and **Manager**.

## User Roles & Permissions

### 1. Super Admin (`super_admin`)
- **Email**: storecom37@gmail.com
- **Default Password**: Admin@123 (⚠️ Change after first login)

**Permissions**:
- ✅ Create, edit, and delete brands
- ✅ Create, edit, and delete stores across all brands
- ✅ Reply to and delete reviews
- ✅ Create, edit, and delete posts
- ✅ Create and manage users
- ✅ Access all system settings
- ✅ View all data across all brands

### 2. Owner (`owner`)
- Associated with a specific brand
- Can be created by Super Admin

**Permissions**:
- ✅ Edit their own brand (cannot create new brands)
- ✅ Create, edit, and delete stores for their brand
- ✅ Reply to reviews for their brand
- ✅ Create, edit, and delete posts for their brand
- ❌ Cannot delete reviews
- ❌ Cannot access other brands' data
- ❌ Cannot manage users
- ❌ Cannot access system settings

### 3. Manager (`manager`)
- Associated with a specific brand
- View-only access
- Can be created by Super Admin

**Permissions**:
- ✅ View stores for their brand
- ✅ View reviews for their brand
- ✅ View posts for their brand
- ❌ Cannot create, edit, or delete anything
- ❌ All action buttons are hidden

## Setup Instructions

### 1. Install Dependencies

```bash
cd storecom-dashboard
npm install
```

The following packages are required and should already be in package.json:
- `bcryptjs` - Password hashing
- `jsonwebtoken` - JWT token generation
- `@types/bcryptjs` - TypeScript types for bcryptjs
- `@types/jsonwebtoken` - TypeScript types for jsonwebtoken

### 2. Environment Variables

Add the following to your `.env` or `.env.local` file:

```env
# JWT Secret (REQUIRED - Change this to a secure random string)
JWT_SECRET=your-secure-random-secret-key-min-32-characters

# Database
MONGODB_URI=your-mongodb-connection-string

# Next.js
NEXTAUTH_URL=http://localhost:3000
```

⚠️ **Important**: Generate a strong JWT_SECRET using:
```bash
node -e ".randomBytes(32).toString('hex'))"
```

### 3. Create Super Admin Account

Run this command to create the super admin account:

```bash
# Via API (Development only)
curl -X POST http://localhost:3000/api/auth/seed-admin
```

Or manually in your database:
1. Connect to your MongoDB database
2. Run the seed script:
```bash
npm run seed-admin
```

### 4. First Login

1. Navigate to `http://localhost:3000/login`
2. Use the super admin credentials:
   - Email: `storecom37@gmail.com`
   - Password: `Admin@123`
3. **⚠️ Important**: Change the password immediately after first login

## API Endpoints

### Authentication

#### POST `/api/auth/login`
Login with email and password

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "email": "user@example.com",
      "name": "User Name",
      "role": "super_admin",
      "brandId": "...",
      "status": "active"
    }
  }
}
```

#### POST `/api/auth/logout`
Logout current user

**Response**:
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

#### GET `/api/auth/session`
Get current session data

**Response**:
```json
{
  "success": true,
  "authenticated": true,
  "data": {
    "user": {
      "id": "...",
      "email": "user@example.com",
      "name": "User Name",
      "role": "super_admin"
    }
  }
}
```

#### POST `/api/auth/register`
Register new user (Super Admin only)

**Request Body**:
```json
{
  "email": "newuser@example.com",
  "password": "securePassword123",
  "name": "New User",
  "role": "owner",
  "brandId": "brand_id_here",
  "phone": "1234567890"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "email": "newuser@example.com",
      "name": "New User",
      "role": "owner",
      "brandId": "...",
      "status": "active"
    }
  }
}
```

## Frontend Usage

### Using the `useAuth` Hook

```typescript
import { useAuth } from '@/lib/hooks/use-auth'

function MyComponent() {
  const { user, loading, authenticated, login, logout, hasPermission } = useAuth()
  
  // Check if user is authenticated
  if (!authenticated) {
    return <div>Please login</div>
  }
  
  // Check specific permission
  if (hasPermission('create_store')) {
    return <CreateStoreButton />
  }
  
  return <div>Hello {user?.name}</div>
}
```

### Using Permission Guard Component

```typescript
import { PermissionGuard } from '@/components/auth/permission-guard'

function MyComponent() {
  return (
    <div>
      <PermissionGuard action="create_store">
        <CreateStoreButton />
      </PermissionGuard>
      
      <PermissionGuard 
        action="delete_store"
        fallback={<div>You don't have permission</div>}
      >
        <DeleteStoreButton />
      </PermissionGuard>
    </div>
  )
}
```

### Protecting API Routes

```typescript
import { requireAuth, requireRole } from '@/lib/utils/session'

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const session = await requireAuth()
    
    // Or require specific role
    const session = await requireRole(['super_admin', 'owner'])
    
    // Check brand access
    if (session.role !== 'super_admin' && session.brandId !== targetBrandId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }
    
    // Your logic here
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 401 }
    )
  }
}
```

## Permission Actions

The following permission actions are available:

- `view_brand` - View brand details
- `edit_brand` - Edit brand details
- `create_brand` - Create new brands (super_admin only)
- `delete_brand` - Delete brands (super_admin only)
- `view_stores` - View stores
- `create_store` - Create new stores
- `edit_store` - Edit stores
- `delete_store` - Delete stores
- `view_reviews` - View reviews
- `reply_review` - Reply to reviews
- `delete_review` - Delete reviews (super_admin only)
- `view_posts` - View posts
- `create_post` - Create new posts
- `edit_post` - Edit posts
- `delete_post` - Delete posts

## Security Best Practices

1. **JWT Secret**: Always use a strong, random JWT_SECRET in production
2. **Password Policy**: Enforce strong passwords (min 8 chars, uppercase, lowercase, numbers)
3. **HTTPS**: Always use HTTPS in production
4. **Cookie Security**: Cookies are set as httpOnly and secure in production
5. **Password Hashing**: Passwords are hashed using bcrypt with 10 salt rounds
6. **Session Expiry**: Sessions expire after 7 days

## Database Schema

### User Model

```typescript
{
  email: string (unique, required)
  password: string (hashed, required)
  name: string (required)
  role: 'super_admin' | 'owner' | 'manager' (required)
  brandId: ObjectId (required for owner/manager)
  phone: string (optional)
  profilePicture: string (optional)
  status: 'active' | 'inactive' | 'suspended'
  lastLoginAt: Date
  createdAt: Date
  updatedAt: Date
}
```

## Troubleshooting

### Cannot Login
- Check if user exists in database
- Verify password is correct
- Check if user status is 'active'
- Check browser console for errors

### Permission Denied
- Verify user role in database
- Check if user is associated with correct brand
- Review permission definitions in `/lib/utils/permissions.ts`

### Session Not Persisting
- Check if JWT_SECRET is set in environment variables
- Verify cookies are being set (check browser DevTools > Application > Cookies)
- Ensure NEXTAUTH_URL matches your current URL

## Testing

### Test Accounts

Create test accounts for each role:

```bash
# Super Admin (already created)
Email: storecom37@gmail.com
Password: Admin@123

# Create Owner (via API or super admin dashboard)
POST /api/auth/register
{
  "email": "owner@example.com",
  "password": "Owner@123",
  "name": "Brand Owner",
  "role": "owner",
  "brandId": "your_brand_id"
}

# Create Manager (via API or super admin dashboard)
POST /api/auth/register
{
  "email": "manager@example.com",
  "password": "Manager@123",
  "name": "Brand Manager",
  "role": "manager",
  "brandId": "your_brand_id"
}
```

## Maintenance

### Adding New Permissions

1. Update `/lib/utils/permissions.ts`:
```typescript
export const PERMISSIONS = {
  super_admin: {
    // Add new permission
    newPermission: true
  },
  owner: {
    newPermission: true
  },
  manager: {
    newPermission: false
  }
}
```

2. Add action mapping in `canPerformAction`:
```typescript
const actionMap: Record<string, keyof typeof PERMISSIONS.super_admin> = {
  'new_action': 'newPermission'
}
```

### Changing User Role

Only super admins can change user roles via API or database directly.

## Support

For issues or questions:
1. Check this documentation
2. Review the code in `/lib/utils/session.ts` and `/lib/utils/permissions.ts`
3. Check the authentication API routes in `/app/api/auth/`
4. Contact the development team


