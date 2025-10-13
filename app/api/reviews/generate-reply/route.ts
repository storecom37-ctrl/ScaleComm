import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

interface GenerateReplyRequest {
  reviewText: string
  rating: number
  customerName: string
  storeName: string
  platform: string
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateReplyRequest = await request.json()
    const { reviewText, rating, customerName, storeName, platform } = body

    // Validate required fields
    if (!reviewText || !rating || !storeName) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if Gemini API key is configured
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'AI service not configured' },
        { status: 500 }
      )
    }

    // Create the AI prompt for generating a professional reply
    const prompt = `
You are a professional customer service representative for "${storeName}". Generate a professional, courteous reply to this customer review.

Review Details:
- Customer: ${customerName || 'Anonymous'}
- Rating: ${rating}/5 stars
- Review: "${reviewText}"
- Platform: ${platform}

Guidelines for the reply:
1. Be professional and courteous
2. Thank the customer for their feedback
3. Address any specific concerns mentioned in the review
4. For low ratings (1-2 stars), acknowledge the issue and offer to resolve it
5. For high ratings (4-5 stars), express genuine appreciation
6. For medium ratings (3 stars), thank them and ask for suggestions
7. Keep the reply concise (50-150 words)
8. End with a positive note about serving them again
9. Use appropriate tone based on the rating

Generate a professional reply that would be suitable for public posting on ${platform}:
`

    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
      const result = await model.generateContent(prompt)
      const response = await result.response
      const aiReply = response.text().trim()

      // Clean up the reply (remove quotes if AI wrapped them)
      const cleanReply = aiReply.replace(/^["']|["']$/g, '').trim()

      return NextResponse.json({
        success: true,
        reply: cleanReply,
        metadata: {
          rating,
          platform,
          generatedAt: new Date().toISOString(),
          wordCount: cleanReply.split(' ').length
        }
      })

    } catch (aiError) {
      console.error('Gemini AI Error:', aiError)
      
      // Provide a fallback reply based on rating
      let fallbackReply = ""
      if (rating >= 4) {
        fallbackReply = `Thank you for the ${rating}-star review, ${customerName || 'valued customer'}! We're thrilled you had a great experience at ${storeName}. We appreciate your business and look forward to serving you again soon!`
      } else if (rating >= 3) {
        fallbackReply = `Thank you for your ${rating}-star review, ${customerName || 'valued customer'}. We appreciate your feedback about ${storeName} and would love to hear more about your experience so we can continue improving our service.`
      } else {
        fallbackReply = `Thank you for your feedback, ${customerName || 'valued customer'}. We sincerely apologize that your experience at ${storeName} didn't meet your expectations. We'd like to discuss this with you further - please contact us directly so we can make this right.`
      }
      
      return NextResponse.json({
        success: true,
        reply: fallbackReply,
        metadata: {
          rating,
          platform,
          generatedAt: new Date().toISOString(),
          wordCount: fallbackReply.split(' ').length,
          fallback: true
        }
      })
    }

  } catch (error) {
    console.error('Generate Reply API Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
