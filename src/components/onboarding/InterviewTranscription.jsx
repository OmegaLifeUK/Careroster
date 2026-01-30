import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, Loader2, CheckCircle, FileAudio, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/toast";

export default function InterviewTranscription({ record, onUpdate }) {
  const [uploading, setUploading] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      toast.info("Uploading", "Uploading interview recording...");

      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      await base44.entities.PreEmploymentCompliance.update(record.id, {
        interview_recording_url: file_url
      });

      toast.success("Uploaded", "Interview recording uploaded successfully");
      onUpdate();
    } catch (error) {
      toast.error("Upload Failed", error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleTranscribe = async () => {
    try {
      setTranscribing(true);
      toast.info("Processing", "AI is transcribing and analyzing the interview...");

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are analyzing a job interview recording for a care worker position. 

Please:
1. Provide a full transcript of the interview
2. Summarize the key points discussed
3. Extract structured insights

Format your response as JSON with this structure:
{
  "transcript": "full transcript here",
  "summary": "2-3 paragraph summary",
  "strengths": ["strength 1", "strength 2"],
  "concerns": ["concern 1", "concern 2"],
  "experience_highlights": ["highlight 1", "highlight 2"],
  "culture_fit": "assessment of culture fit",
  "recommendation": "hire/reject/interview again with reasoning"
}`,
        file_urls: [record.interview_recording_url],
        response_json_schema: {
          type: "object",
          properties: {
            transcript: { type: "string" },
            summary: { type: "string" },
            strengths: { type: "array", items: { type: "string" } },
            concerns: { type: "array", items: { type: "string" } },
            experience_highlights: { type: "array", items: { type: "string" } },
            culture_fit: { type: "string" },
            recommendation: { type: "string" }
          }
        }
      });

      await base44.entities.PreEmploymentCompliance.update(record.id, {
        interview_transcript: response.transcript,
        interview_summary: response.summary,
        interview_key_points: {
          strengths: response.strengths,
          concerns: response.concerns,
          experience_highlights: response.experience_highlights,
          culture_fit: response.culture_fit,
          recommendation: response.recommendation
        }
      });

      toast.success("Complete", "Interview analyzed successfully");
      onUpdate();
    } catch (error) {
      toast.error("Analysis Failed", error.message);
    } finally {
      setTranscribing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileAudio className="w-5 h-5" />
          Interview Analysis
          <Sparkles className="w-4 h-4 text-yellow-500" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!record.interview_recording_url ? (
          <div>
            <label className="block mb-2">
              <div className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 cursor-pointer transition-colors">
                <Upload className="w-5 h-5 text-gray-400" />
                <span className="text-sm">Upload Interview Recording (Audio/Video)</span>
                {uploading && <Loader2 className="w-4 h-4 animate-spin ml-auto" />}
              </div>
              <input
                type="file"
                accept="audio/*,video/*"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
            <p className="text-xs text-gray-500 mt-2">
              Supported formats: MP3, MP4, WAV, M4A, WebM
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-green-50 rounded border border-green-200">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-sm flex-1">Recording uploaded</span>
              <a 
                href={record.interview_recording_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline"
              >
                View
              </a>
            </div>

            {!record.interview_transcript ? (
              <Button 
                onClick={handleTranscribe} 
                disabled={transcribing}
                className="w-full"
              >
                {transcribing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    AI is analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Transcribe & Analyze with AI
                  </>
                )}
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded border border-blue-200">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-yellow-500" />
                    AI Summary
                  </h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{record.interview_summary}</p>
                </div>

                {record.interview_key_points && (
                  <div className="grid gap-3">
                    <div className="p-3 bg-green-50 rounded border border-green-200">
                      <h5 className="font-semibold text-sm mb-2">Strengths</h5>
                      <ul className="text-sm space-y-1">
                        {record.interview_key_points.strengths?.map((s, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-green-600">✓</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {record.interview_key_points.concerns?.length > 0 && (
                      <div className="p-3 bg-amber-50 rounded border border-amber-200">
                        <h5 className="font-semibold text-sm mb-2">Areas to Consider</h5>
                        <ul className="text-sm space-y-1">
                          {record.interview_key_points.concerns.map((c, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-amber-600">⚠</span>
                              <span>{c}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="p-3 bg-purple-50 rounded border border-purple-200">
                      <h5 className="font-semibold text-sm mb-2">Experience Highlights</h5>
                      <ul className="text-sm space-y-1">
                        {record.interview_key_points.experience_highlights?.map((h, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-purple-600">•</span>
                            <span>{h}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-3 bg-gray-50 rounded border border-gray-200">
                      <h5 className="font-semibold text-sm mb-2">Culture Fit Assessment</h5>
                      <p className="text-sm text-gray-700">{record.interview_key_points.culture_fit}</p>
                    </div>

                    <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-300">
                      <h5 className="font-semibold mb-2 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-yellow-500" />
                        AI Recommendation
                      </h5>
                      <p className="text-sm font-medium text-gray-800">{record.interview_key_points.recommendation}</p>
                    </div>
                  </div>
                )}

                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                    View Full Transcript
                  </summary>
                  <div className="mt-3 p-4 bg-gray-50 rounded border border-gray-200 max-h-96 overflow-y-auto">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                      {record.interview_transcript}
                    </p>
                  </div>
                </details>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}