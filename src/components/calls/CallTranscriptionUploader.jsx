import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Upload, 
  Loader2, 
  Phone, 
  FileAudio, 
  Sparkles,
  CheckCircle,
  AlertCircle,
  X,
  Users,
  Lightbulb,
  UserPlus,
  ClipboardList
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { format, addDays } from "date-fns";

export default function CallTranscriptionUploader({ clients = [], onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState("upload"); // upload, details, processing, complete
  const [audioUrl, setAudioUrl] = useState(null);
  const [formData, setFormData] = useState({
    call_date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    caller_name: "",
    caller_phone: "",
    caller_relationship: "",
    related_client_id: "",
    handled_by: "",
    notes: ""
  });
  const [result, setResult] = useState(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch staff for task assignment
  const { data: staff = [] } = useQuery({
    queryKey: ['staff-list'],
    queryFn: () => base44.entities.Staff.filter({ is_active: true }),
  });

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.type.includes('audio') && !selectedFile.name.endsWith('.mp3') && !selectedFile.name.endsWith('.wav') && !selectedFile.name.endsWith('.m4a')) {
        toast.error("Invalid File", "Please upload an audio file (MP3, WAV, M4A)");
        return;
      }
      setFile(selectedFile);
    }
  };

  const uploadFile = async () => {
    if (!file) return;
    
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setAudioUrl(file_url);
      setStep("details");
      toast.success("File Uploaded", "Audio file uploaded successfully");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Upload Failed", "Failed to upload audio file");
    } finally {
      setUploading(false);
    }
  };

  const processTranscription = async () => {
    setStep("processing");
    setProcessing(true);

    try {
      // Get client name if selected
      const clientName = formData.related_client_id 
        ? clients.find(c => c.id === formData.related_client_id)?.full_name 
        : null;

      // Build staff list for AI to suggest assignments
      const staffList = staff.map(s => `${s.id}:${s.full_name}`).join(', ');

      const prompt = `You are a professional transcription and analysis assistant for a care facility. 
Please analyze this audio recording of a phone call and provide a comprehensive analysis.

SPEAKER DETECTION:
- Identify different speakers in the conversation
- Label them (e.g., "Staff Member", "Caller", "Family Member", etc.)
- Provide the transcript with speaker attribution

KEY DECISIONS:
- Identify any decisions made during the call
- Note who made the decision and the context

FOLLOW-UP TASKS:
- Identify actionable follow-up items
- Suggest which staff member should handle each task based on the task type
- Available staff: ${staffList || 'General staff'}

Context:
- Caller: ${formData.caller_name || 'Unknown'}
- Relationship: ${formData.caller_relationship || 'Unknown'}
${clientName ? `- Related to client: ${clientName}` : ''}
${formData.notes ? `- Staff notes: ${formData.notes}` : ''}

IMPORTANT: Listen carefully to the audio and transcribe the actual conversation. If the audio is unclear or in a different language, do your best to transcribe it.

Please provide the response in the following JSON structure:
{
  "speakers": [
    {"speaker_id": "speaker_1", "speaker_label": "Staff Member", "role": "care_facility_staff"},
    {"speaker_id": "speaker_2", "speaker_label": "Mrs. Smith", "role": "family_member"}
  ],
  "speaker_transcript": [
    {"speaker_id": "speaker_1", "text": "Hello, how can I help you?", "timestamp": "00:00"},
    {"speaker_id": "speaker_2", "text": "I'm calling about my mother...", "timestamp": "00:05"}
  ],
  "transcript": "Full transcript of the conversation with speaker labels...",
  "summary": "Brief summary of the call...",
  "key_decisions": [
    {"decision": "Agreed to arrange a care review meeting", "made_by": "Staff Member", "context": "Family requested update on care plan"}
  ],
  "key_topics": ["topic1", "topic2"],
  "follow_up_points": [
    {
      "point": "Action to take",
      "priority": "low|medium|high|urgent",
      "suggested_assignee_id": "staff_id or null",
      "suggested_assignee_name": "Staff Name",
      "due_date": "YYYY-MM-DD",
      "reason": "Why this person should handle it"
    }
  ],
  "sentiment": "positive|neutral|concerned|urgent|complaint"
}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls: [audioUrl],
        response_json_schema: {
          type: "object",
          properties: {
            transcript: { type: "string" },
            summary: { type: "string" },
            key_topics: { type: "array", items: { type: "string" } },
            follow_up_points: { 
              type: "array", 
              items: { 
                type: "object",
                properties: {
                  point: { type: "string" },
                  priority: { type: "string" },
                  due_date: { type: "string" }
                }
              } 
            },
            sentiment: { type: "string" }
          }
        }
      });

      // Check if the result contains an error or unsupported message
      if (!result || !result.transcript || result.transcript.toLowerCase().includes('unsupported') || result.transcript.toLowerCase().includes('cannot process')) {
        throw new Error("The AI could not process this audio file. The format may not be compatible.");
      }

      setResult(result);
      setStep("complete");
    } catch (error) {
      console.error("Transcription error:", error);
      const errorMessage = error?.message || "Unknown error";
      toast.error("Processing Failed", `Failed to transcribe audio: ${errorMessage}`);
      setStep("details");
    } finally {
      setProcessing(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const callData = {
        call_date: formData.call_date,
        caller_name: formData.caller_name,
        caller_phone: formData.caller_phone,
        caller_relationship: formData.caller_relationship || undefined,
        related_client_id: formData.related_client_id || undefined,
        audio_file_url: audioUrl,
        transcript: result.transcript,
        summary: result.summary,
        key_topics: result.key_topics,
        follow_up_points: (result.follow_up_points || []).map(fp => ({
          ...fp,
          completed: false
        })),
        sentiment: result.sentiment,
        handled_by: formData.handled_by,
        notes: formData.notes,
        location: "day_centre",
        status: "transcribed"
      };

      return base44.entities.CallTranscript.create(callData);
    },
    onSuccess: (newRecord) => {
      queryClient.invalidateQueries({ queryKey: ['call-transcripts'] });
      toast.success("Call Saved", "Transcript and follow-up points saved successfully");
      onSuccess?.(newRecord);
      onClose();
    },
    onError: () => {
      toast.error("Error", "Failed to save call transcript");
    }
  });

  const getSentimentBadge = (sentiment) => {
    const styles = {
      positive: "bg-green-100 text-green-700",
      neutral: "bg-gray-100 text-gray-700",
      concerned: "bg-amber-100 text-amber-700",
      urgent: "bg-red-100 text-red-700",
      complaint: "bg-red-100 text-red-700"
    };
    return styles[sentiment] || styles.neutral;
  };

  const getPriorityBadge = (priority) => {
    const styles = {
      low: "bg-gray-100 text-gray-700",
      medium: "bg-blue-100 text-blue-700",
      high: "bg-orange-100 text-orange-700",
      urgent: "bg-red-100 text-red-700"
    };
    return styles[priority] || styles.medium;
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-blue-600" />
            Call Transcription
          </DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-6">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                Upload an audio recording of a phone call. The AI will transcribe it, 
                generate a summary, and identify follow-up actions.
              </p>
            </div>

            <div 
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                file ? 'border-green-300 bg-green-50' : 'border-gray-300 hover:border-blue-400'
              }`}
            >
              {file ? (
                <div className="space-y-3">
                  <FileAudio className="w-12 h-12 mx-auto text-green-600" />
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setFile(null)}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Remove
                  </Button>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <Upload className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                  <p className="font-medium text-gray-700">Click to upload audio file</p>
                  <p className="text-sm text-gray-500 mt-1">MP3, WAV, or M4A (max 25MB)</p>
                  <input
                    type="file"
                    accept="audio/*,.mp3,.wav,.m4a"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button 
                onClick={uploadFile}
                disabled={!file || uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload & Continue
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "details" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Call Date & Time</Label>
                <Input
                  type="datetime-local"
                  value={formData.call_date}
                  onChange={(e) => setFormData({ ...formData, call_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Handled By</Label>
                <Input
                  value={formData.handled_by}
                  onChange={(e) => setFormData({ ...formData, handled_by: e.target.value })}
                  placeholder="Staff member name"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Caller Name</Label>
                <Input
                  value={formData.caller_name}
                  onChange={(e) => setFormData({ ...formData, caller_name: e.target.value })}
                  placeholder="Name of caller"
                />
              </div>
              <div>
                <Label>Caller Phone</Label>
                <Input
                  value={formData.caller_phone}
                  onChange={(e) => setFormData({ ...formData, caller_phone: e.target.value })}
                  placeholder="Phone number"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Caller Relationship</Label>
                <Select 
                  value={formData.caller_relationship} 
                  onValueChange={(v) => setFormData({ ...formData, caller_relationship: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select relationship" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="client">Client</SelectItem>
                    <SelectItem value="family_member">Family Member</SelectItem>
                    <SelectItem value="healthcare_professional">Healthcare Professional</SelectItem>
                    <SelectItem value="social_worker">Social Worker</SelectItem>
                    <SelectItem value="local_authority">Local Authority</SelectItem>
                    <SelectItem value="supplier">Supplier</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Related Client (Optional)</Label>
                <Select 
                  value={formData.related_client_id} 
                  onValueChange={(v) => setFormData({ ...formData, related_client_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>None</SelectItem>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Additional Notes (Optional)</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any context about the call that might help with transcription..."
                rows={2}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("upload")}>Back</Button>
              <Button onClick={processTranscription} className="bg-purple-600 hover:bg-purple-700">
                <Sparkles className="w-4 h-4 mr-2" />
                Transcribe & Analyze
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "processing" && (
          <div className="py-12 text-center">
            <Loader2 className="w-16 h-16 mx-auto mb-4 text-purple-600 animate-spin" />
            <h3 className="text-lg font-semibold mb-2">Processing Audio...</h3>
            <p className="text-gray-600">
              AI is transcribing the call and generating insights.
            </p>
            <p className="text-sm text-gray-500 mt-2">This may take 30-90 seconds depending on call length.</p>
          </div>
        )}

        {step === "complete" && result && (
          <div className="space-y-4">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-medium text-green-800">Transcription Complete</span>
              <Badge className={getSentimentBadge(result.sentiment)}>
                {result.sentiment}
              </Badge>
            </div>

            <Card>
              <CardContent className="p-4">
                <h4 className="font-semibold mb-2">Summary</h4>
                <p className="text-gray-700">{result.summary}</p>
              </CardContent>
            </Card>

            {result.key_topics?.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Key Topics</h4>
                <div className="flex flex-wrap gap-2">
                  {result.key_topics.map((topic, idx) => (
                    <Badge key={idx} variant="outline">{topic}</Badge>
                  ))}
                </div>
              </div>
            )}

            {result.follow_up_points?.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Follow-up Actions</h4>
                <div className="space-y-2">
                  {result.follow_up_points.map((fp, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-2 bg-gray-50 rounded">
                      <AlertCircle className="w-4 h-4 mt-0.5 text-gray-500" />
                      <div className="flex-1">
                        <p className="text-sm">{fp.point}</p>
                        {fp.due_date && (
                          <p className="text-xs text-gray-500">Due: {fp.due_date}</p>
                        )}
                      </div>
                      <Badge className={getPriorityBadge(fp.priority)}>{fp.priority}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <details className="group">
              <summary className="cursor-pointer font-semibold text-sm text-gray-600 hover:text-gray-900">
                View Full Transcript
              </summary>
              <div className="mt-2 p-3 bg-gray-50 rounded text-sm whitespace-pre-wrap max-h-48 overflow-y-auto">
                {result.transcript}
              </div>
            </details>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("details")}>
                ← Back
              </Button>
              <Button 
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Save Call Record
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}