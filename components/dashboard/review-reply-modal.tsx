"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Star, MessageSquare, User, MapPin, Calendar } from "lucide-react"

interface ReviewReplyModalProps {
  isOpen: boolean
  onClose: () => void
  review: {
    id: string
    customer: string
    store: string
    rating: number
    review: string
    date: string
    platform: string
    locationAddress?: string
    responded?: boolean
  }
  onReply: (reviewId: string, comment: string) => Promise<boolean>
}

export function ReviewReplyModal({
  isOpen,
  onClose,
  review,
  onReply
}: ReviewReplyModalProps) {
  const [comment, setComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!comment.trim()) {
      alert("Please enter a reply comment")
      return
    }

    setIsSubmitting(true)
    try {
      const success = await onReply(review.id, comment.trim())
      if (success) {
        alert("Reply posted successfully!")
        setComment("")
        onClose()
      } else {
        alert("Failed to post reply. Please try again.")
      }
    } catch (error) {
      console.error("Error posting reply:", error)
      alert("An error occurred while posting the reply")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setComment("")
    onClose()
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
            }`}
          />
        ))}
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Reply to Review
          </DialogTitle>
          <DialogDescription>
            Respond to this customer review. Your reply will be posted publicly on Google My Business.
          </DialogDescription>
        </DialogHeader>

        {/* Review Details */}
        <div className="space-y-4">
          {/* Customer Info */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-500" />
              <span className="font-medium">{review.customer}</span>
            </div>
            <div className="flex items-center gap-2">
              {renderStars(review.rating)}
              <span className="text-sm text-gray-600">({review.rating}/5)</span>
            </div>
          </div>

          {/* Store Info */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="h-4 w-4" />
            <span>{review.store}</span>
            {review.locationAddress && (
              <span className="text-gray-400">• {review.locationAddress}</span>
            )}
          </div>

          {/* Date and Platform */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="h-4 w-4" />
              <span>{review.date}</span>
            </div>
            <Badge variant="outline">{review.platform}</Badge>
          </div>

          {/* Review Text */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm leading-relaxed">{review.review}</p>
          </div>

          {/* Reply Form */}
          <div className="space-y-2">
            <Label htmlFor="reply-comment" className="text-sm font-medium">
              Your Reply
            </Label>
            <Textarea
              id="reply-comment"
              placeholder="Thank you for your feedback! We appreciate your business and look forward to serving you again..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="min-h-[100px] resize-none"
              maxLength={1000}
            />
            <div className="text-xs text-gray-500 text-right">
              {comment.length}/1000 characters
            </div>
          </div>

          {/* Tips */}
          <div className="p-3 bg-blue-50 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Reply Tips:</h4>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• Be professional and courteous</li>
              <li>• Address any specific concerns mentioned</li>
              <li>• Thank the customer for their feedback</li>
              <li>• Keep it concise and relevant</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !comment.trim()}
            className="min-w-[100px]"
          >
            {isSubmitting ? "Posting..." : "Post Reply"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
