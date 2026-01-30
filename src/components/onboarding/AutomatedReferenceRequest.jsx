import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Send, CheckCircle, Loader2, Sparkles, ThumbsUp, ThumbsDown, MinusCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/toast";

export default function AutomatedReferenceRequest({ record, refNum, staffName, onUpdate }) {
  const [sending, setSending] = useState(false);
  const { toast } = useToast();
  
  const reference = record[`reference_${refNum}`] || {};
  const hasContactEmail = reference.referee_contact?.includes('@');
  const token = reference.request_token || `${record.id}_ref${refNum}_${Date.now()}`;

  const handleSendRequest = async () => {
    if (!hasContactEmail) {
      toast.error("Invalid Email", "Please provide a valid email address for the referee");
      return;
    }

    try {
      setSending(true);
      toast.info("Sending", "Sending automated reference request...");

      const formUrl = `${window.location.origin}${window.location.pathname}#/ReferenceForm?token=${token}`;

      await base44.integrations.Core.SendEmail({
        to: reference.referee_contact,
        subject: `Reference Request for ${staffName}`,
        body: `Dear ${reference.referee_name || 'Referee'},

We are conducting employment checks for ${staffName} who has listed you as a reference.

Please complete this brief reference form by clicking the link below:

${formUrl}

This should only take 2-3 minutes. Your feedback is confidential and greatly appreciated.

Thank you for your time.

Best regards,
HR Team`
      });

      await base44.entities.DBSAndReferences.update(record.id, {
        [`reference_${refNum}`]: {
          ...reference,
          request_sent: true,
          request_token: token
        }
      });

      toast.success("Sent", "Reference request email sent successfully");
      onUpdate();
    } catch (error) {
      toast.error("Send Failed", error.message);
    } finally {
      setSending(false);
    }
  };

  const getSentimentIcon = () => {
    switch (reference.ai_sentiment) {
      case 'positive':
        return <ThumbsUp className="w-5 h-5 text-green-600" />;
      case 'negative':
        return <ThumbsDown className="w-5 h-5 text-red-600" />;
      case 'neutral':
        return <MinusCircle className="w-5 h-5 text-amber-600" />;
      default:
        return null;
    }
  };

  const getSentimentColor = () => {
    switch (reference.ai_sentiment) {
      case 'positive':
        return 'bg-green-50 border-green-200';
      case 'negative':
        return 'bg-red-50 border-red-200';
      case 'neutral':
        return 'bg-amber-50 border-amber-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <Card className="border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-sm flex items-center gap-2">
            Reference {refNum} {refNum <= 2 && '*'}
            {reference.response_received && (
              <Badge className="bg-green-600">
                <CheckCircle className="w-3 h-3 mr-1" />
                Received
              </Badge>
            )}
            {reference.request_sent && !reference.response_received && (
              <Badge variant="outline" className="border-blue-500 text-blue-700">
                <Mail className="w-3 h-3 mr-1" />
                Sent
              </Badge>
            )}
          </h4>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {hasContactEmail && !reference.request_sent && (
          <div className="p-3 bg-blue-50 rounded border border-blue-200">
            <p className="text-sm text-blue-800 mb-2">
              <Sparkles className="w-4 h-4 inline mr-1" />
              Automate this reference check - we'll send an email with a form for them to complete.
            </p>
            <Button 
              size="sm" 
              onClick={handleSendRequest}
              disabled={sending}
              className="w-full"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Automated Request
                </>
              )}
            </Button>
          </div>
        )}

        {reference.request_sent && !reference.response_received && (
          <div className="p-3 bg-amber-50 rounded border border-amber-200">
            <p className="text-sm text-amber-800">
              <Mail className="w-4 h-4 inline mr-1" />
              Reference request sent to {reference.referee_contact}. Waiting for response...
            </p>
          </div>
        )}

        {reference.response_received && reference.ai_summary && (
          <div className={`p-4 rounded border ${getSentimentColor()}`}>
            <div className="flex items-center gap-2 mb-3">
              {getSentimentIcon()}
              <h5 className="font-semibold">
                AI Analysis: {reference.ai_sentiment?.charAt(0).toUpperCase() + reference.ai_sentiment?.slice(1)} Reference
              </h5>
            </div>
            
            <p className="text-sm mb-3">{reference.ai_summary}</p>
            
            {reference.ai_key_points && reference.ai_key_points.length > 0 && (
              <div>
                <p className="text-xs font-semibold mb-2">Key Points:</p>
                <ul className="text-sm space-y-1">
                  {reference.ai_key_points.map((point, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span>•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <details className="mt-3">
              <summary className="cursor-pointer text-xs font-medium opacity-70 hover:opacity-100">
                View Full Response
              </summary>
              <p className="text-sm mt-2 p-2 bg-white/50 rounded">
                {reference.response_text}
              </p>
            </details>
          </div>
        )}
      </CardContent>
    </Card>
  );
}