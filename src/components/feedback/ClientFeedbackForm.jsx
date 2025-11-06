import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { MessageSquare, Star, CheckCircle } from "lucide-react";

export default function ClientFeedbackForm({ client, onClose }) {
  const [formData, setFormData] = useState({
    client_id: client?.id || "",
    submitted_by: client?.full_name || "",
    submitted_by_relationship: "self",
    feedback_type: "general",
    category: "care_quality",
    rating: 5,
    subject: "",
    comments: "",
    contact_email: "",
    contact_phone: "",
    wants_callback: false,
    is_anonymous: false,
  });
  const [submitted, setSubmitted] = useState(false);

  const submitFeedbackMutation = useMutation({
    mutationFn: async (data) => {
      const feedback = await base44.entities.ClientFeedback.create({
        ...data,
        status: "new",
        priority: data.feedback_type === "complaint" ? "high" : "medium",
      });

      // Create notification for management
      await base44.entities.DomCareNotification.create({
        recipient_id: "admin",
        title: `New ${data.feedback_type}: ${data.subject}`,
        message: `${data.submitted_by} submitted ${data.feedback_type} feedback. Rating: ${data.rating}/5`,
        type: "general",
        priority: data.feedback_type === "complaint" ? "high" : "normal",
        is_read: false,
        related_entity_id: feedback.id,
        related_entity_type: "feedback",
      });

      return feedback;
    },
    onSuccess: () => {
      setSubmitted(true);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    submitFeedbackMutation.mutate(formData);
  };

  if (submitted) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h2>
          <p className="text-gray-600 mb-6">
            Your feedback has been submitted successfully. We appreciate you taking the time to share your thoughts with us.
          </p>
          {formData.wants_callback && (
            <p className="text-sm text-blue-600 mb-4">
              A member of our team will contact you shortly.
            </p>
          )}
          {onClose && (
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50">
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          We Value Your Feedback
        </CardTitle>
        <p className="text-sm text-gray-500 mt-1">
          Please share your experience with our care services
        </p>
      </CardHeader>

      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="submitted_by">Your Name *</Label>
              <Input
                id="submitted_by"
                value={formData.submitted_by}
                onChange={(e) => setFormData({ ...formData, submitted_by: e.target.value })}
                required
                placeholder="Enter your name"
              />
            </div>

            <div>
              <Label htmlFor="relationship">Your Relationship to Client</Label>
              <Select
                value={formData.submitted_by_relationship}
                onValueChange={(value) => setFormData({ ...formData, submitted_by_relationship: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="self">Client (Self)</SelectItem>
                  <SelectItem value="family">Family Member</SelectItem>
                  <SelectItem value="guardian">Guardian</SelectItem>
                  <SelectItem value="representative">Representative</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="feedback_type">Feedback Type *</Label>
              <Select
                value={formData.feedback_type}
                onValueChange={(value) => setFormData({ ...formData, feedback_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compliment">Compliment</SelectItem>
                  <SelectItem value="complaint">Complaint</SelectItem>
                  <SelectItem value="suggestion">Suggestion</SelectItem>
                  <SelectItem value="concern">Concern</SelectItem>
                  <SelectItem value="general">General Feedback</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff_performance">Staff Performance</SelectItem>
                  <SelectItem value="care_quality">Care Quality</SelectItem>
                  <SelectItem value="communication">Communication</SelectItem>
                  <SelectItem value="punctuality">Punctuality</SelectItem>
                  <SelectItem value="professionalism">Professionalism</SelectItem>
                  <SelectItem value="facilities">Facilities</SelectItem>
                  <SelectItem value="safety">Safety</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Overall Rating *</Label>
            <div className="flex gap-2 mt-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setFormData({ ...formData, rating: star })}
                  className="focus:outline-none"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= formData.rating
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    }`}
                  />
                </button>
              ))}
              <span className="ml-2 text-sm text-gray-600 self-center">
                {formData.rating}/5
              </span>
            </div>
          </div>

          <div>
            <Label htmlFor="subject">Subject *</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              required
              placeholder="Brief summary of your feedback"
            />
          </div>

          <div>
            <Label htmlFor="comments">Your Feedback *</Label>
            <Textarea
              id="comments"
              value={formData.comments}
              onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
              required
              placeholder="Please provide details..."
              rows={6}
            />
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Contact Information (Optional)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <Label htmlFor="contact_email">Email</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  placeholder="your.email@example.com"
                />
              </div>
              <div>
                <Label htmlFor="contact_phone">Phone</Label>
                <Input
                  id="contact_phone"
                  type="tel"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  placeholder="Your phone number"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="wants_callback"
                  checked={formData.wants_callback}
                  onCheckedChange={(checked) => setFormData({ ...formData, wants_callback: checked })}
                />
                <Label htmlFor="wants_callback" className="cursor-pointer">
                  I would like someone to contact me about this feedback
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="is_anonymous"
                  checked={formData.is_anonymous}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_anonymous: checked })}
                />
                <Label htmlFor="is_anonymous" className="cursor-pointer">
                  Submit this feedback anonymously
                </Label>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <Button
              type="submit"
              disabled={submitFeedbackMutation.isPending}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {submitFeedbackMutation.isPending ? "Submitting..." : "Submit Feedback"}
            </Button>
            {onClose && (
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}