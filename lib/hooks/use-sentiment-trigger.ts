import { useEffect } from 'react'
import { sentimentWorkflow } from '@/lib/services/sentiment-workflow'

interface UseSentimentTriggerProps {
  brandId?: string
  storeId?: string
  type: 'brand' | 'store'
  triggerAnalysis?: boolean
}

export function useSentimentTrigger({ 
  brandId, 
  storeId, 
  type, 
  triggerAnalysis = false 
}: UseSentimentTriggerProps) {
  useEffect(() => {
    if (!triggerAnalysis || (!brandId && !storeId)) {
      return
    }

    const entityId = brandId || storeId
    if (!entityId) return

    const analyzeIfNeeded = async () => {
      try {
        const needsAnalysis = await sentimentWorkflow.needsAnalysis(entityId, type)
        if (needsAnalysis) {
          
          await sentimentWorkflow.analyzeAndSave(entityId, type)
        }
      } catch (error) {
        console.error('Error in auto sentiment analysis:', error)
      }
    }

    analyzeIfNeeded()
  }, [brandId, storeId, type, triggerAnalysis])
}
