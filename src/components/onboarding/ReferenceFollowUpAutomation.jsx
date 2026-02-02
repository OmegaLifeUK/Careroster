import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  Send, 
  Sparkles, 
  Mail, 
  AlertCircle,
  CheckCircle,
  Loader2,
  MessageSquare
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { differenceInDays, format, parseISO } from "date-fns";

export default function ReferenceFollowUpAutomation({ 
  dbsRecord, 
  referenceNumber, 
  reference,
  onFollowUpSent 
}) {
  const [generating, setGenerating] = useState(false);
  const [followUpMessage, setFollowUpMessage] = useState(null);
  const { toast } = useToast();

  // Calculate days since request was sent
  const daysSinceRequest = reference?.request_sent && reference?.request_token
    ? differenceInDays(new Date(), parseISO(dbsRecord.created_date))
    : null;

  const isOverdue = daysSinceRequest > 7 && !reference?.response_received;
  const needsFollowUp = reference?.response_received && reference?.response_text && (
    !reference?.ai_sentiment || 
    reference?.response_text?.length < 100 ||
    reference?.ai_sentiment === 'negative'
  );

  const generateFollowUpMutation = useMutation({
    mutationFn: async () => {
      setGenerating(true);

      let prompt = "";
      let followUpType = "";

      if (isOverdue) {
        // No response yet - send reminder
        followUpType = "reminder";
        prompt = `Generate a polite follow-up reminder email for an employment reference that hasn't responded yet.

Reference Request Details:
- Referee Name: ${reference.referee_name}
- Organization: ${reference.referee_organisation}
- Days Since Request: ${daysSinceRequest}

Create a friendly, professional reminder email that:
1. Thanks them for being willing to provide a reference
2. Mentions the original request was sent ${daysSinceRequest} days ago
3. Politely asks if they need a new link or have any questions
4. Provides the form link again
5. Emphasizes the importance of the reference for the candidate's employment

Keep it brief, warm, and not pushy.`;
      } else if (needsFollowUp) {
        // Response received but incomplete/unclear
        followUpType = "clarification";
        const responsePreview = reference.response_text.substring(0, 300);
        prompt = `Analyze this reference response and generate specific follow-up questions to get more complete information.

Reference Response Received:
${responsePreview}${reference.response_text.length > 300 ? '...' : ''}

AI Sentiment: ${reference.ai_sentiment || 'Not analyzed'}
Response Length: ${reference.response_text.length} characters

The response seems incomplete, unclear, or concerning. Generate:
1. A polite acknowledgment of their response
2. 2-4 specific follow-up questions to clarify or expand on their answers
3. Questions should be direct but professional
4. Focus on any gaps, vague statements, or areas that need more detail

Format as a complete email ready to send.`;
      }

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            subject: { type: "string" },
            email_body: { type: "string" },
            follow_up_type: { type: "string" },
            key_points: { type: "array", items: { type: "string" } }
          }
        }
      });

      setFollowUpMessage({ ...result, followUpType });
      setGenerating(false);
      return result;
    },
    onError: (error) => {
      setGenerating(false);
      toast.error("Generation Failed", error.message);
    }
  });

  const sendFollowUpMutation = useMutation({
    mutationFn: async () => {
      if (!followUpMessage || !reference?.referee_contact) {
        throw new Error("Missing email or message");
      }

      // Send the follow-up email
      await base44.integrations.Core.SendEmail({
        to: reference.referee_contact,
        subject: followUpMessage.subject,
        body: `
          <p>${followUpMessage.email_body.replace(/\n/g, '<br/>')}</p>
          ${followUpMessage.followUpType === 'reminder' ? `
            <p style="margin-top: 20px;">
              <a href="${window.location.origin}/#reference-form?token=${reference.request_token}" 
                 style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Complete Reference Form
              </a>
            </p>
          ` : ''}
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;"/>
          <p style="font-size: 12px; color: #6b7280;">
            This is an automated follow-up regarding an employment reference request.
          </p>
        `
      });

      // Update the reference record
      const updateData = { ...dbsRecord };
      updateData[`reference_${referenceNumber}`] = {
        ...reference,
        last_follow_up_sent: new Date().toISOString(),
        follow_up_count: (reference.follow_up_count || 0) + 1,
        follow_up_type: followUpMessage.followUpType
      };

      await base44.entities.DBSAndReferences.update(dbsRecord.id, updateData);
    },
    onSuccess: () => {
      toast.success("Follow-up Sent", "Email sent to referee");
      setFollowUpMessage(null);
      onFollowUpSent?.();
    },
    onError: (error) => {
      toast.error("Send Failed", error.message);
    }
  });

  // Don't show if request hasn't been sent or response is complete and positive
  if (!reference?.request_sent || !reference?.request_token) return null;
  if (reference?.response_received && reference?.ai_sentiment === 'positive' && reference?.response_text?.length > 100) {
    return null;
  }

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <AlertCircle className="w-4 h-4 text-orange-600" />
          {isOverdue ? "Follow-up Needed" : "Response Needs Clarification"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isOverdue && (
          <div className="text-sm">
            <p className="text-orange-900 font-medium">No response received</p>
            <p className="text-orange-700 text-xs">
              Request sent {daysSinceRequest} days ago
            </p>
          </div>
        )}

        {needsFollowUp && (
          <div className="text-sm">
            <p className="text-orange-900 font-medium">Response incomplete or unclear</p>
            <p className="text-orange-700 text-xs">
              AI detected the response may need clarification
            </p>
          </div>
        )}

        {!followUpMessage ? (
          <Button
            onClick={() => generateFollowUpMutation.mutate()}
            disabled={generating}
            size="sm"
            className="w-full bg-orange-600 hover:bg-orange-700"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate AI Follow-up
              </>
            )}
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="bg-white p-3 rounded-lg border border-orange-200">
              <p className="text-xs font-semibold text-gray-700 mb-1">Subject:</p>
              <p className="text-sm font-medium text-gray-900 mb-2">
                {followUpMessage.subject}
              </p>
              
              <p className="text-xs font-semibold text-gray-700 mb-1">Message:</p>
              <div className="text-sm text-gray-700 whitespace-pre-wrap max-h-32 overflow-y-auto">
                {followUpMessage.email_body}
              </div>

              {followUpMessage.key_points?.length > 0 && (
                <div className="mt-2 pt-2 border-t border-orange-200">
                  <p className="text-xs font-semibold text-gray-700 mb-1">Key Points:</p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {followUpMessage.key_points.map((point, i) => (
                      <li key={i}>• {point}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => sendFollowUpMutation.mutate()}
                disabled={sendFollowUpMutation.isPending}
                size="sm"
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {sendFollowUpMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Follow-up
                  </>
                )}
              </Button>
              <Button
                onClick={() => setFollowUpMessage(null)}
                variant="outline"
                size="sm"
              >
                Regenerate
              </Button>
            </div>
          </div>
        )}

        {reference?.follow_up_count > 0 && (
          <div className="text-xs text-orange-700 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {reference.follow_up_count} follow-up{reference.follow_up_count > 1 ? 's' : ''} sent
            {reference.last_follow_up_sent && 
              ` (last: ${format(parseISO(reference.last_follow_up_sent), 'MMM d')})`
            }
          </div>
        )}
      </CardContent>
    </Card>
  );
}