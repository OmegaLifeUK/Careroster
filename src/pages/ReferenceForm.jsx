import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/toast";

export default function ReferenceForm() {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [record, setRecord] = useState(null);
  const [refNum, setRefNum] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    relationship: "",
    duration_months: "",
    job_title: "",
    responsibilities: "",
    performance_rating: "",
    strengths: "",
    areas_for_development: "",
    attendance_reliability: "",
    work_with_vulnerable: "",
    concerns: "",
    recommend: ""
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
    const tokenParam = urlParams.get('token');
    
    if (tokenParam) {
      setToken(tokenParam);
      loadRecord(tokenParam);
    } else {
      setLoading(false);
    }
  }, []);

  const loadRecord = async (tokenValue) => {
    try {
      const allRecords = await base44.entities.DBSAndReferences.list();
      
      for (const rec of allRecords) {
        for (let i = 1; i <= 3; i++) {
          const ref = rec[`reference_${i}`];
          if (ref?.request_token === tokenValue) {
            if (ref.response_received) {
              setSubmitted(true);
            }
            setRecord(rec);
            setRefNum(i);
            setLoading(false);
            return;
          }
        }
      }
      
      toast.error("Invalid Token", "This reference link is not valid");
      setLoading(false);
    } catch (error) {
      toast.error("Error", "Could not load reference request");
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.recommend || !formData.performance_rating) {
      toast.error("Required Fields", "Please complete all required fields");
      return;
    }

    try {
      setSubmitting(true);
      toast.info("Processing", "AI is analyzing your response...");

      const responseText = `
Relationship: ${formData.relationship}
Duration: ${formData.duration_months} months
Job Title: ${formData.job_title}
Responsibilities: ${formData.responsibilities}
Performance: ${formData.performance_rating}
Strengths: ${formData.strengths}
Areas for Development: ${formData.areas_for_development}
Attendance: ${formData.attendance_reliability}
Work with Vulnerable People: ${formData.work_with_vulnerable}
Concerns: ${formData.concerns || 'None'}
Recommendation: ${formData.recommend}
      `.trim();

      const aiAnalysis = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this employment reference and provide:
1. Overall sentiment (positive/neutral/negative)
2. A brief 2-3 sentence summary
3. 3-4 key points

Reference:
${responseText}

Format as JSON:
{
  "sentiment": "positive|neutral|negative",
  "summary": "brief summary here",
  "key_points": ["point 1", "point 2", "point 3"]
}`,
        response_json_schema: {
          type: "object",
          properties: {
            sentiment: { type: "string" },
            summary: { type: "string" },
            key_points: { type: "array", items: { type: "string" } }
          }
        }
      });

      const reference = record[`reference_${refNum}`];
      await base44.entities.DBSAndReferences.update(record.id, {
        [`reference_${refNum}`]: {
          ...reference,
          response_received: true,
          response_text: responseText,
          received_date: new Date().toISOString().split('T')[0],
          ai_sentiment: aiAnalysis.sentiment,
          ai_summary: aiAnalysis.summary,
          ai_key_points: aiAnalysis.key_points,
          satisfactory: aiAnalysis.sentiment === 'positive'
        }
      });

      setSubmitted(true);
      toast.success("Submitted", "Thank you for completing the reference");
    } catch (error) {
      toast.error("Submission Failed", error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!token || !record) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Invalid Link</h2>
            <p className="text-gray-600">This reference link is not valid or has expired.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Thank You!</h2>
            <p className="text-gray-600">Your reference has been submitted successfully.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const reference = record[`reference_${refNum}`];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div className="max-w-2xl mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Employment Reference Request</CardTitle>
            <p className="text-sm text-gray-600 mt-2">
              Reference for: <span className="font-semibold">{reference?.referee_name || 'Candidate'}</span>
            </p>
            <p className="text-sm text-gray-600">
              Organisation: <span className="font-semibold">{reference?.referee_organisation}</span>
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Your Relationship to Candidate *</Label>
              <Input
                value={formData.relationship}
                onChange={(e) => setFormData(prev => ({ ...prev, relationship: e.target.value }))}
                placeholder="e.g., Line Manager, Supervisor"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Duration of Working Relationship (months) *</Label>
                <Input
                  type="number"
                  value={formData.duration_months}
                  onChange={(e) => setFormData(prev => ({ ...prev, duration_months: e.target.value }))}
                  placeholder="12"
                />
              </div>
              <div>
                <Label>Candidate's Job Title *</Label>
                <Input
                  value={formData.job_title}
                  onChange={(e) => setFormData(prev => ({ ...prev, job_title: e.target.value }))}
                  placeholder="e.g., Care Assistant"
                />
              </div>
            </div>

            <div>
              <Label>Brief Description of Responsibilities</Label>
              <Textarea
                value={formData.responsibilities}
                onChange={(e) => setFormData(prev => ({ ...prev, responsibilities: e.target.value }))}
                placeholder="What were their main duties?"
                rows={2}
              />
            </div>

            <div>
              <Label>Overall Performance Rating *</Label>
              <Select value={formData.performance_rating} onValueChange={(v) => setFormData(prev => ({ ...prev, performance_rating: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excellent">Excellent</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="satisfactory">Satisfactory</SelectItem>
                  <SelectItem value="needs_improvement">Needs Improvement</SelectItem>
                  <SelectItem value="poor">Poor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Key Strengths</Label>
              <Textarea
                value={formData.strengths}
                onChange={(e) => setFormData(prev => ({ ...prev, strengths: e.target.value }))}
                placeholder="What were their notable strengths?"
                rows={2}
              />
            </div>

            <div>
              <Label>Areas for Development</Label>
              <Textarea
                value={formData.areas_for_development}
                onChange={(e) => setFormData(prev => ({ ...prev, areas_for_development: e.target.value }))}
                placeholder="Any areas where they could improve?"
                rows={2}
              />
            </div>

            <div>
              <Label>Attendance & Reliability *</Label>
              <Select value={formData.attendance_reliability} onValueChange={(v) => setFormData(prev => ({ ...prev, attendance_reliability: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excellent">Excellent - always punctual and reliable</SelectItem>
                  <SelectItem value="good">Good - occasional absences</SelectItem>
                  <SelectItem value="average">Average - some reliability concerns</SelectItem>
                  <SelectItem value="poor">Poor - frequent absences or lateness</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Suitability for Working with Vulnerable People *</Label>
              <Select value={formData.work_with_vulnerable} onValueChange={(v) => setFormData(prev => ({ ...prev, work_with_vulnerable: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="highly_suitable">Highly Suitable</SelectItem>
                  <SelectItem value="suitable">Suitable</SelectItem>
                  <SelectItem value="unsure">Unsure</SelectItem>
                  <SelectItem value="not_suitable">Not Suitable</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Any Concerns or Additional Comments</Label>
              <Textarea
                value={formData.concerns}
                onChange={(e) => setFormData(prev => ({ ...prev, concerns: e.target.value }))}
                placeholder="Optional - any concerns or additional information"
                rows={2}
              />
            </div>

            <div>
              <Label>Would you recommend this person for employment in care work? *</Label>
              <Select value={formData.recommend} onValueChange={(v) => setFormData(prev => ({ ...prev, recommend: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="strongly_recommend">Strongly Recommend</SelectItem>
                  <SelectItem value="recommend">Recommend</SelectItem>
                  <SelectItem value="recommend_with_reservations">Recommend with Reservations</SelectItem>
                  <SelectItem value="do_not_recommend">Do Not Recommend</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-blue-600"
              size="lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Submit Reference
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}