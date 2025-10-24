/**
 * Script to seed super admin user
 * Run this script once to create the super admin account
 */

import connectDB from '../database/connection'
import { User } from '../database/user-model'

export async function seedSuperAdmin() {
  try {
    await connectDB()

    const superAdminEmail = 'storecom37@gmail.com'

    // Check if super admin already exists
    const existingAdmin = await User.findOne({ email: superAdminEmail })

    if (existingAdmin) {
      
      return {
        success: true,
        message: 'Super admin already exists',
        user: {
          email: existingAdmin.email,
          role: existingAdmin.role
        }
      }
    }

    // Create super admin user
    const superAdmin = new User({
      email: superAdminEmail,
      password: 'Admin@123', // Change this password after first login
      name: 'Super Admin',
      role: 'super_admin',
      status: 'active'
    })

    await superAdmin.save()

    
    
    
    

    return {
      success: true,
      message: 'Super admin created successfully',
      user: {
        email: superAdmin.email,
        role: superAdmin.role
      }
    }
  } catch (error) {
    console.error('❌ Error seeding super admin:', error)
    return {
      success: false,
      error: 'Failed to seed super admin'
    }
  }
}

// Run if called directly
if (require.main === module) {
  seedSuperAdmin().then(() => {
    process.exit(0)
  }).catch((error) => {
    console.error(error)
    process.exit(1)
  })
}


