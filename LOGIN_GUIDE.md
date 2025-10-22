# Login System Guide

## 🔐 Authentication System Overview

The system supports **dual authentication**:
1. **User Collection** - For Super Admin accounts
2. **Brand Collection** - For Owner and Manager accounts (stored in Brand model)

## 👥 User Roles & Creation

### 1️⃣ Super Admin
- **Created By**: System seed script
- **Email**: `storecom37@gmail.com`
- **Password**: `Admin@123`
- **Can Create**: Owner accounts only
- **Login**: Uses User collection

### 2️⃣ Owner
- **Created By**: Super Admin only
- **Stored In**: Brand collection (`users.owner` field)
- **Can Create**: Manager accounts for their own brand
- **Login**: Uses Brand collection
- **Permissions**: 
  - Create/edit/delete stores
  - Reply to reviews
  - Create/edit/delete posts
  - Edit brand settings

### 3️⃣ Manager  
- **Created By**: Super Admin OR Owner
- **Stored In**: Brand collection (`users.manager` field)
- **Can Create**: Nothing
- **Login**: Uses Brand collection
- **Permissions**: View-only access (no create/edit/delete buttons)

---

## 🚀 Quick Setup

### Step 1: Create Super Admin

```bash
# Visit this URL or use curl
curl -X POST http://localhost:3001/api/auth/seed-admin
```

**Response**:
```
✅ Super admin created successfully
Email: storecom37@gmail.com
Password: Admin@123
```

### Step 2: Login as Super Admin

Navigate to: `http://localhost:3001/login`

**Credentials**:
- Email: `storecom37@gmail.com`
- Password: `Admin@123`

### Step 3: Create a Brand (with Owner)

When super admin creates a brand, they must provide owner credentials in the form:

**Owner Section**:
- Owner Email: `owner@example.com`
- Owner Password: `YourSecurePassword123`

These credentials are stored in the Brand model and can be used to login.

### Step 4: Login as Owner

1. Logout from super admin
2. Go to login page
3. Use the owner credentials you set when creating the brand

**Credentials**:
- Email: `owner@example.com` (the email you entered when creating brand)
- Password: `YourSecurePassword123` (the password you entered)

### Step 5: Owner Creates Manager

Once logged in as owner, you can add a manager to your brand:

**Manager Section** (in brand edit form):
- Manager Email: `manager@example.com`
- Manager Password: `ManagerPassword123`

### Step 6: Login as Manager

1. Logout from owner
2. Go to login page  
3. Use the manager credentials

**Credentials**:
- Email: `manager@example.com`
- Password: `ManagerPassword123`

---

## 📝 How Login Works

### Login Flow

```
1. User enters email & password
2. System checks User collection first (for super_admin)
3. If not found, checks Brand collection (for owner/manager)
4. Validates password using bcrypt
5. Creates JWT session token
6. Sets httpOnly cookie
7. Returns user data
```

### Login API Endpoint

**POST** `/api/auth/login`

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Success Response**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "brand_or_user_id",
      "email": "user@example.com",
      "name": "User or Brand Name",
      "role": "owner",
      "brandId": "brand_id",
      "status": "active"
    }
  }
}
```

---

## 🔑 Default Passwords

When creating brands/users, here are suggested test passwords:

| Role | Email | Password |
|------|-------|----------|
| Super Admin | storecom37@gmail.com | Admin@123 |
| Owner | owner@yourbrand.com | Owner@123 |
| Manager | manager@yourbrand.com | Manager@123 |

⚠️ **Security**: Change all passwords in production!

---

## 🛡️ Permission System

### Super Admin Can:
✅ Everything - full system access
✅ Create brands
✅ Create owner accounts  
✅ Delete anything
✅ View all brands

### Owner Can:
✅ Edit their brand
✅ Create/edit/delete stores (their brand only)
✅ Reply to reviews (their brand only)
✅ Create/edit/delete posts (their brand only)
✅ Create manager accounts (their brand only)
❌ Cannot create brands
❌ Cannot delete reviews
❌ Cannot access other brands

### Manager Can:
✅ View stores (their brand only)
✅ View reviews (their brand only)
✅ View posts (their brand only)
❌ Cannot create/edit/delete anything
❌ All action buttons hidden

---

## 💡 Testing Permissions

### Test as Super Admin:
1. Login with `storecom37@gmail.com`
2. Create multiple brands
3. View all brands
4. Edit/delete any brand
5. Create owner accounts

### Test as Owner:
1. Login with owner credentials
2. Try to create a brand (should fail)
3. Create/edit stores for your brand
4. Reply to reviews
5. Create posts
6. Add a manager to your brand
7. Try to access another brand (should fail)

### Test as Manager:
1. Login with manager credentials
2. View stores, reviews, posts
3. Verify all Create/Edit/Delete buttons are hidden
4. Verify you can only view data

---

## 🐛 Troubleshooting

### Cannot Login
**Problem**: "Invalid email or password"

**Solutions**:
1. Check email is correct (case-insensitive)
2. Verify password matches what was set
3. Check if user exists in database:
   ```javascript
   // For super admin
   db.users.find({email: "storecom37@gmail.com"})
   
   // For owner/manager
   db.brands.find({"users.owner.email": "owner@example.com"})
   ```

### Owner Not Found
**Problem**: Owner credentials don't work

**Solutions**:
1. Verify brand was created with owner credentials
2. Check brand document has `users.owner.email` and `users.owner.password`
3. Ensure password is hashed (starts with `$2a$` or `$2b$`)

### Manager Cannot Login
**Problem**: Manager credentials invalid

**Solutions**:
1. Verify manager was added to brand
2. Check `users.manager.email` exists in brand document
3. Verify password is set and hashed
4. Ensure manager email is unique per brand

### Permission Denied
**Problem**: "Forbidden - Insufficient permissions"

**Solutions**:
1. Check user role in session
2. Verify user is accessing their own brand data
3. Review permission definitions in `/lib/utils/permissions.ts`
4. Clear cookies and login again

---

## 📊 Database Structure

### User Collection (for Super Admin)
```javascript
{
  _id: ObjectId,
  email: "storecom37@gmail.com",
  password: "$2b$10$hashed_password",
  name: "Super Admin",
  role: "super_admin",
  status: "active",
  createdAt: Date,
  updatedAt: Date
}
```

### Brand Collection (for Owner/Manager)
```javascript
{
  _id: ObjectId,
  name: "My Brand",
  slug: "my-brand",
  users: {
    owner: {
      email: "owner@mybrand.com",
      password: "$2b$10$hashed_password"
    },
    manager: {
      email: "manager@mybrand.com",
      password: "$2b$10$hashed_password"
    }
  },
  // ... other brand fields
}
```

---

## 🔒 Security Notes

1. **Passwords are hashed** using bcrypt with 10 salt rounds
2. **Sessions use JWT** with httpOnly cookies
3. **Tokens expire** after 7 days
4. **HTTPS required** in production
5. **Password validation** should be added (min length, complexity)
6. **Rate limiting** should be added to prevent brute force

---

## 📞 Support

- **Documentation**: See `/RBAC_AUTHENTICATION.md` for detailed API docs
- **Quick Start**: See `/QUICK_START.md` for setup guide
- **Issues**: Check browser console and server logs for errors


