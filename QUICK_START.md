# Quick Start Guide - RBAC Authentication

## 🚀 Setup in 5 Minutes

### Step 1: Install Dependencies

```bash
cd storecom-dashboard
npm install
```

### Step 2: Set Environment Variables

Create a `.env.local` file in the `storecom-dashboard` directory:

```env
# Database
MONGODB_URI=your-mongodb-connection-string

# JWT Secret (IMPORTANT!)
JWT_SECRET=generate-secure-random-string-here

# Next.js
NEXTAUTH_URL=http://localhost:3000
```

**Generate JWT_SECRET**:
```bash
node -e ".randomBytes(32).toString('hex'))"
```

### Step 3: Start Development Server

```bash
npm run dev
```

### Step 4: Create Super Admin

Open your browser and visit:
```
http://localhost:3000/api/auth/seed-admin
```

Or use curl:
```bash
curl -X POST http://localhost:3000/api/auth/seed-admin
```

### Step 5: Login

1. Navigate to `http://localhost:3000/login`
2. Use super admin credentials:
   - **Email**: `storecom37@gmail.com`
   - **Password**: `Admin@123`
3. ⚠️ **Change password after first login**

## 🎯 User Roles

| Role | Permissions | Access Level |
|------|-------------|--------------|
| **Super Admin** | Full access to everything | Create brands, stores, users, posts. Delete anything. |
| **Owner** | Manage their own brand | Create/edit/delete stores, reply to reviews, create posts for their brand only. |
| **Manager** | View-only access | Can view stores, reviews, and posts for their brand. No create/edit/delete. |

## 📝 Creating Users

### Via Dashboard (Coming Soon)
Super admin can create users through the dashboard.

### Via API

```bash
# Create Owner
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "owner@example.com",
    "password": "Owner@123",
    "name": "Brand Owner",
    "role": "owner",
    "brandId": "your_brand_id_here"
  }'

# Create Manager
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "manager@example.com",
    "password": "Manager@123",
    "name": "Brand Manager",
    "role": "manager",
    "brandId": "your_brand_id_here"
  }'
```

## 🔒 Testing Permissions

1. **Login as Super Admin**
   - Create a brand
   - Create stores
   - All buttons visible

2. **Login as Owner**
   - Edit brand settings
   - Create/edit/delete stores
   - Reply to reviews
   - Create posts
   - Cannot see other brands

3. **Login as Manager**
   - View stores, reviews, posts
   - All action buttons hidden
   - Read-only access

## 🛠️ Development

### Using Permission Guards in Components

```typescript
import { PermissionGuard } from '@/components/auth/permission-guard'

function MyComponent() {
  return (
    <div>
      {/* Button only shows for users with permission */}
      <PermissionGuard action="create_store">
        <Button>Create Store</Button>
      </PermissionGuard>
    </div>
  )
}
```

### Using the Auth Hook

```typescript
import { useAuth } from '@/lib/hooks/use-auth'

function MyComponent() {
  const { user, authenticated, hasPermission, logout } = useAuth()
  
  if (hasPermission('delete_store')) {
    return <DeleteButton />
  }
  
  return <div>Hello {user?.name}</div>
}
```

### Protecting API Routes

```typescript
import { requireAuth, requireRole } from '@/lib/utils/session'

export async function POST(request: NextRequest) {
  // Require authentication
  const session = await requireAuth()
  
  // Or require specific roles
  const session = await requireRole(['super_admin', 'owner'])
  
  // Your logic here
}
```

## 📚 Available Permissions

- `create_brand` - Create new brands
- `edit_brand` - Edit brand details
- `delete_brand` - Delete brands
- `create_store` - Create stores
- `edit_store` - Edit stores
- `delete_store` - Delete stores
- `view_stores` - View stores
- `reply_review` - Reply to reviews
- `delete_review` - Delete reviews
- `create_post` - Create posts
- `edit_post` - Edit posts
- `delete_post` - Delete posts
- `view_reviews` - View reviews
- `view_posts` - View posts

## ⚠️ Important Notes

1. **JWT_SECRET**: Must be set and secure in production
2. **Password Policy**: Enforce strong passwords in production
3. **HTTPS**: Always use HTTPS in production
4. **Super Admin**: Change default password immediately
5. **Brand Association**: Owners and Managers must be associated with a brand

## 🐛 Troubleshooting

**Cannot login?**
- Check MongoDB connection
- Verify user exists: `db.users.find({email: "storecom37@gmail.com"})`
- Check browser console for errors

**Permissions not working?**
- Clear browser cookies
- Check user role in database
- Verify JWT_SECRET is set

**Session not persisting?**
- Check cookies in browser DevTools
- Verify NEXTAUTH_URL matches your URL
- Check JWT_SECRET is set correctly

## 📞 Support

For detailed documentation, see [RBAC_AUTHENTICATION.md](./RBAC_AUTHENTICATION.md)


