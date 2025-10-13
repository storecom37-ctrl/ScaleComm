import { Store } from '@/lib/database/models'
import { Types } from 'mongoose'

export interface VerificationAttempt {
  verificationId?: string
  method: 'PHONE_CALL' | 'POSTCARD' | 'EMAIL' | 'MANUAL' | 'API_CHECK'
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'EXPIRED'
  startedAt: Date
  completedAt?: Date
  previousStatus?: boolean
  source: 'manual_verification' | 'bulk_verification' | 'api_start_verification' | 'api_complete_verification' | 'sync_check'
  details?: {
    phoneNumber?: string
    emailAddress?: string
    verificationCode?: string
    errorMessage?: string
    notes?: string
  }
}

export interface VoiceOfMerchantState {
  complianceState: 'COMPLIANT' | 'NON_COMPLIANT' | 'UNKNOWN'
  lastChecked: Date
}

export class VerificationService {
  
  /**
   * Add a verification attempt to a store's history
   */
  static async addVerificationAttempt(
    storeId: string | Types.ObjectId, 
    attempt: VerificationAttempt
  ): Promise<boolean> {
    try {
      const updateData = {
        $push: {
          'gmbData.verificationHistory': {
            ...attempt,
            createdAt: new Date()
          }
        }
      }

      await Store.findByIdAndUpdate(storeId, updateData)
      return true
    } catch (error) {
      console.error('Error adding verification attempt:', error)
      return false
    }
  }

  /**
   * Update verification status for a store
   */
  static async updateVerificationStatus(
    storeId: string | Types.ObjectId,
    verified: boolean,
    source: VerificationAttempt['source'] = 'sync_check'
  ): Promise<boolean> {
    try {
      // Get current store to check previous status
      const currentStore = await Store.findById(storeId)
      const previousStatus = currentStore?.gmbData?.verified || currentStore?.verified || false

      const updateData = {
        $set: { 
          'gmbData.verified': verified,
          'gmbData.lastSyncAt': new Date(),
          'gmbData.lastVerificationCheck': new Date(),
          verified: verified
        },
        $push: {
          'gmbData.verificationHistory': {
            method: 'API_CHECK',
            status: verified ? 'COMPLETED' : 'FAILED',
            startedAt: new Date(),
            completedAt: new Date(),
            previousStatus: previousStatus,
            source: source,
            createdAt: new Date()
          }
        }
      }

      await Store.findByIdAndUpdate(storeId, updateData)
      return true
    } catch (error) {
      console.error('Error updating verification status:', error)
      return false
    }
  }

  /**
   * Complete a pending verification attempt
   */
  static async completeVerificationAttempt(
    storeId: string | Types.ObjectId,
    verificationId: string,
    success: boolean,
    details?: {
      verificationCode?: string
      errorMessage?: string
      notes?: string
    }
  ): Promise<boolean> {
    try {
      const updateData = {
        $set: {
          'gmbData.verified': success,
          'gmbData.lastVerificationCheck': new Date(),
          verified: success,
          'gmbData.verificationHistory.$[elem].status': success ? 'COMPLETED' : 'FAILED',
          'gmbData.verificationHistory.$[elem].completedAt': new Date(),
          'gmbData.verificationHistory.$[elem].details': details || {}
        }
      }

      const result = await Store.updateOne(
        { 
          _id: storeId,
          'gmbData.verificationHistory.verificationId': verificationId 
        },
        updateData,
        { 
          arrayFilters: [{ 'elem.verificationId': verificationId }]
        }
      )

      return result.modifiedCount > 0
    } catch (error) {
      console.error('Error completing verification attempt:', error)
      return false
    }
  }

  /**
   * Update Voice of Merchant state
   */
  static async updateVoiceOfMerchantState(
    storeId: string | Types.ObjectId,
    state: VoiceOfMerchantState
  ): Promise<boolean> {
    try {
      const updateData = {
        $set: {
          'gmbData.voiceOfMerchantState': state
        }
      }

      await Store.findByIdAndUpdate(storeId, updateData)
      return true
    } catch (error) {
      console.error('Error updating Voice of Merchant state:', error)
      return false
    }
  }

  /**
   * Get verification history for a store
   */
  static async getVerificationHistory(storeId: string | Types.ObjectId): Promise<VerificationAttempt[]> {
    try {
      const store = await Store.findById(storeId).select('gmbData.verificationHistory')
      return store?.gmbData?.verificationHistory || []
    } catch (error) {
      console.error('Error getting verification history:', error)
      return []
    }
  }

  /**
   * Get stores with pending verifications
   */
  static async getStoresWithPendingVerifications(): Promise<any[]> {
    try {
      const stores = await Store.find({
        'gmbData.verificationHistory': {
          $elemMatch: {
            status: 'PENDING'
          }
        }
      }).select('name gmbLocationId gmbData.verificationHistory')

      return stores
    } catch (error) {
      console.error('Error getting stores with pending verifications:', error)
      return []
    }
  }

  /**
   * Get verification statistics for a brand
   */
  static async getVerificationStats(brandId: string | Types.ObjectId): Promise<{
    totalStores: number
    verifiedStores: number
    pendingVerifications: number
    failedVerifications: number
    verificationRate: number
  }> {
    try {
      const totalStores = await Store.countDocuments({ brandId })
      
      const verifiedStores = await Store.countDocuments({ 
        brandId,
        $or: [
          { verified: true },
          { 'gmbData.verified': true }
        ]
      })

      const pendingVerifications = await Store.countDocuments({
        brandId,
        'gmbData.verificationHistory': {
          $elemMatch: {
            status: 'PENDING'
          }
        }
      })

      const failedVerifications = await Store.countDocuments({
        brandId,
        'gmbData.verificationHistory': {
          $elemMatch: {
            status: 'FAILED'
          }
        }
      })

      const verificationRate = totalStores > 0 ? (verifiedStores / totalStores) * 100 : 0

      return {
        totalStores,
        verifiedStores,
        pendingVerifications,
        failedVerifications,
        verificationRate: Math.round(verificationRate * 100) / 100
      }
    } catch (error) {
      console.error('Error getting verification stats:', error)
      return {
        totalStores: 0,
        verifiedStores: 0,
        pendingVerifications: 0,
        failedVerifications: 0,
        verificationRate: 0
      }
    }
  }

  /**
   * Clean up old verification attempts (older than 90 days)
   */
  static async cleanupOldVerificationAttempts(): Promise<number> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - 90)

      const result = await Store.updateMany(
        {},
        {
          $pull: {
            'gmbData.verificationHistory': {
              createdAt: { $lt: cutoffDate },
              status: { $in: ['COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED'] }
            }
          }
        }
      )

      return result.modifiedCount
    } catch (error) {
      console.error('Error cleaning up old verification attempts:', error)
      return 0
    }
  }

  /**
   * Initialize gmbData for a store if it doesn't exist
   */
  static async initializeGmbData(storeId: string | Types.ObjectId): Promise<boolean> {
    try {
      const store = await Store.findById(storeId)
      if (!store) return false

      if (!store.gmbData) {
        const updateData = {
          $set: {
            gmbData: {
              verified: false,
              lastSyncAt: new Date(),
              lastVerificationCheck: new Date(),
              verificationHistory: [],
              voiceOfMerchantState: {
                complianceState: 'UNKNOWN',
                lastChecked: new Date()
              },
              metadata: {}
            }
          }
        }

        await Store.findByIdAndUpdate(storeId, updateData)
      }

      return true
    } catch (error) {
      console.error('Error initializing GMB data:', error)
      return false
    }
  }
}

export default VerificationService
