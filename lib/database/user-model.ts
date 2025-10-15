import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

// User Role Types
export type UserRole = 'super_admin' | 'owner' | 'manager'

// User Schema
const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['super_admin', 'owner', 'manager'],
    required: true,
    default: 'manager'
  },
  // Brand association - only for owner and manager roles
  brandId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Brand',
    required: function(this: IUser) {
      return this.role === 'owner' || this.role === 'manager'
    }
  },
  // Profile information
  phone: {
    type: String,
    trim: true
  },
  profilePicture: {
    type: String,
    trim: true
  },
  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  // Last login tracking
  lastLoginAt: {
    type: Date
  },
  // GMB tokens (optional - for GMB integration)
  gmbTokens: {
    access_token: String,
    refresh_token: String,
    expires_at: Date
  }
}, {
  timestamps: true
})

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next()
  }
  
  try {
    const salt = await bcrypt.genSalt(10)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (error: any) {
    next(error)
  }
})

// Method to compare password
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password)
  } catch (error) {
    return false
  }
}

// Create indexes (email already has unique: true, so no need for explicit index)
UserSchema.index({ role: 1 })
UserSchema.index({ brandId: 1 })
UserSchema.index({ status: 1 })

// TypeScript interface
export interface IUser extends mongoose.Document {
  email: string
  password: string
  name: string
  role: UserRole
  brandId?: mongoose.Types.ObjectId
  phone?: string
  profilePicture?: string
  status: 'active' | 'inactive' | 'suspended'
  lastLoginAt?: Date
  gmbTokens?: {
    access_token?: string
    refresh_token?: string
    expires_at?: Date
  }
  createdAt: Date
  updatedAt: Date
  comparePassword(candidatePassword: string): Promise<boolean>
}

// Export model
export const User = (mongoose.models.User as mongoose.Model<IUser>) || mongoose.model<IUser>('User', UserSchema)





