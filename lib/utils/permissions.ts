import { UserRole } from '../database/user-model'

// Permission definitions for each role
export const PERMISSIONS = {
  super_admin: {
    // Brands
    createBrand: true,
    editBrand: true,
    deleteBrand: true,
    viewAllBrands: true,
    
    // Stores
    createStore: true,
    editStore: true,
    deleteStore: true,
    viewAllStores: true,
    
    // Reviews
    replyToReview: true,
    deleteReview: true,
    viewAllReviews: true,
    
    // Posts
    createPost: true,
    editPost: true,
    deletePost: true,
    viewAllPosts: true,
    
    // Users
    createUser: true,
    editUser: true,
    deleteUser: true,
    viewAllUsers: true,
    
    // System
    viewSystemSettings: true,
    editSystemSettings: true
  },
  
  owner: {
    // Brands (only their own)
    createBrand: false,
    editBrand: true, // Only their own brand
    deleteBrand: false,
    viewAllBrands: false,
    
    // Stores (only for their brand)
    createStore: true,
    editStore: true,
    deleteStore: true,
    viewAllStores: false, // Only their brand's stores
    
    // Reviews (only their brand's)
    replyToReview: true,
    deleteReview: false,
    viewAllReviews: false,
    
    // Posts (only their brand's)
    createPost: true,
    editPost: true,
    deletePost: true,
    viewAllPosts: false,
    
    // Users
    createUser: false,
    editUser: false,
    deleteUser: false,
    viewAllUsers: false,
    
    // System
    viewSystemSettings: false,
    editSystemSettings: false
  },
  
  manager: {
    // Brands
    createBrand: false,
    editBrand: false,
    deleteBrand: false,
    viewAllBrands: false,
    
    // Stores (view only)
    createStore: false,
    editStore: false,
    deleteStore: false,
    viewAllStores: false,
    
    // Reviews (view only)
    replyToReview: false,
    deleteReview: false,
    viewAllReviews: false,
    
    // Posts (view only)
    createPost: false,
    editPost: false,
    deletePost: false,
    viewAllPosts: false,
    
    // Users
    createUser: false,
    editUser: false,
    deleteUser: false,
    viewAllUsers: false,
    
    // System
    viewSystemSettings: false,
    editSystemSettings: false
  }
}

// Helper function to check if user has permission
export function hasPermission(role: UserRole, permission: keyof typeof PERMISSIONS.super_admin): boolean {
  return PERMISSIONS[role]?.[permission] || false
}

// Helper function to check if user can access resource
export function canAccessBrand(userRole: UserRole, userBrandId: string | undefined, targetBrandId: string): boolean {
  if (userRole === 'super_admin') return true
  if (userRole === 'owner' || userRole === 'manager') {
    return userBrandId === targetBrandId
  }
  return false
}

// Check if role can perform action
export function canPerformAction(role: UserRole, action: string): boolean {
  const actionMap: Record<string, keyof typeof PERMISSIONS.super_admin> = {
    'create_brand': 'createBrand',
    'edit_brand': 'editBrand',
    'delete_brand': 'deleteBrand',
    'create_store': 'createStore',
    'edit_store': 'editStore',
    'delete_store': 'deleteStore',
    'reply_review': 'replyToReview',
    'delete_review': 'deleteReview',
    'create_post': 'createPost',
    'edit_post': 'editPost',
    'delete_post': 'deletePost'
  }
  
  const permission = actionMap[action]
  return permission ? hasPermission(role, permission) : false
}

// Get all permissions for a role
export function getRolePermissions(role: UserRole) {
  return PERMISSIONS[role] || PERMISSIONS.manager
}





