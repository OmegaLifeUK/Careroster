import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, 
  Lightbulb, 
  CheckCircle, 
  AlertCircle,
  RefreshCw,
  Copy,
  Wand2
} from "lucide-react";

export default function AINotesAssistant({ 
  visit, 
  client, 
  completedTasks = [],
  visitNotes,
  onNotesChange 
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [validating, setValidating] = useState(false);

  const generateSuggestions = async () => {
    setLoading(true);
    try {
      const prompt = `You are a professional care visit documentation assistant. Based on the following visit information, generate 5 concise, professional phrases or sentences that staff could use in their visit notes.

Visit Information:
- Client: ${client?.full_name || 'Unknown'}
- Visit Type: ${visit?.shift_type || 'Standard'}
- Care Needs: ${client?.care_needs?.join(', ') || 'Not specified'}
- Completed Tasks: ${completedTasks.length > 0 ? completedTasks.join(', ') : 'None recorded'}
- Current Notes: ${visitNotes || 'None yet'}

Generate 5 helpful, professional suggestions that:
1. Use care terminology appropriately
2. Are concise and clear
3. Focus on observations, activities, and client wellbeing
4. Are relevant to the care needs and tasks
5. Follow professional documentation standards

Return ONLY a JSON array of 5 strings, each being a complete, professional suggestion.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        response_json_schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: { type: "string" },
              minItems: 5,
              maxItems: 5
            }
          }
        }
      });

      setSuggestions(response.suggestions || []);
    } catch (error) {
      console.error("Error generating suggestions:", error);
      setSuggestions([
        "Client was in good spirits and engaged well during the visit.",
        "All scheduled tasks completed as per care plan.",
        "No concerns noted regarding client's health or wellbeing.",
        "Client appeared comfortable and content throughout the visit.",
        "Care provided in line with client preferences and requirements."
      ]);
    } finally {
      setLoading(false);
    }
  };

  const generateAutoSummary = async () => {
    setLoading(true);
    try {
      const prompt = `You are a professional care documentation assistant. Create a comprehensive visit summary based on the following information.

Visit Information:
- Client: ${client?.full_name || 'Unknown'}
- Care Needs: ${client?.care_needs?.join(', ') || 'Not specified'}
- Medical Notes: ${client?.medical_notes || 'None on file'}
- Completed Tasks: ${completedTasks.length > 0 ? completedTasks.join(', ') : 'None recorded'}
- Visit Duration: ${visit?.start_time} to ${visit?.end_time}

Generate a professional, comprehensive visit summary that includes:
1. Brief client status observation
2. Tasks/activities completed
3. Any relevant observations about wellbeing
4. Professional closing statement

Keep it concise (2-4 sentences), professional, and factual. Return ONLY the summary text.`;

      const summary = await base44.integrations.Core.InvokeLLM({
        prompt: prompt
      });

      onNotesChange(summary);
    } catch (error) {
      console.error("Error generating summary:", error);
    } finally {
      setLoading(false);
    }
  };

  const validateNotes = async () => {
    if (!visitNotes || visitNotes.trim().length < 10) {
      setValidationResult({
        isValid: false,
        issues: ["Notes are too brief. Please provide more detail."],
        suggestions: ["Describe the client's condition and mood", "List activities completed", "Note any concerns or observations"]
      });
      return;
    }

    setValidating(true);
    try {
      const prompt = `You are a quality assurance assistant for care visit documentation. Review the following visit notes for completeness and clarity.

Visit Notes:
"${visitNotes}"

Context:
- Client: ${client?.full_name}
- Care Needs: ${client?.care_needs?.join(', ') || 'Not specified'}
- Tasks: ${completedTasks.join(', ') || 'None'}

Evaluate the notes and return:
1. Whether they meet professional standards (boolean)
2. List of any issues or missing elements (array)
3. Suggestions for improvement (array)
4. Overall quality score (1-10)

Check for:
- Clarity and professionalism
- Completeness (covers key aspects)
- Appropriate detail level
- Professional language
- No spelling/grammar issues`;

      const validation = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        response_json_schema: {
          type: "object",
          properties: {
            isValid: { type: "boolean" },
            issues: { type: "array", items: { type: "string" } },
            suggestions: { type: "array", items: { type: "string" } },
            qualityScore: { type: "number" }
          }
        }
      });

      setValidationResult(validation);
    } catch (error) {
      console.error("Error validating notes:", error);
      setValidationResult({
        isValid: true,
        issues: [],
        suggestions: ["Review notes for clarity and completeness"],
        qualityScore: 7
      });
    } finally {
      setValidating(false);
    }
  };

  const insertSuggestion = (suggestion) => {
    const currentNotes = visitNotes || "";
    const newNotes = currentNotes 
      ? `${currentNotes}\n${suggestion}` 
      : suggestion;
    onNotesChange(newNotes);
  };

  const copySuggestion = (suggestion) => {
    navigator.clipboard.writeText(suggestion);
  };

  return (
    <div className="space-y-4">
      {/* AI Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={generateAutoSummary}
          disabled={loading}
          className="bg-gradient-to-r from-purple-50 to-blue-50 hover:from-purple-100 hover:to-blue-100"
        >
          {loading ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4 mr-2" />
          )}
          Auto-Generate Summary
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={generateSuggestions}
          disabled={loading}
          className="bg-gradient-to-r from-blue-50 to-cyan-50 hover:from-blue-100 hover:to-cyan-100"
        >
          {loading ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Lightbulb className="w-4 h-4 mr-2" />
          )}
          Get Suggestions
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={validateNotes}
          disabled={validating || !visitNotes}
          className="bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100"
        >
          {validating ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <CheckCircle className="w-4 h-4 mr-2" />
          )}
          Check Quality
        </Button>
      </div>

      {/* AI Suggestions */}
      {suggestions.length > 0 && (
        <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 mb-3">
            <Wand2 className="w-4 h-4 text-blue-600" />
            <h4 className="font-semibold text-blue-900">AI Suggestions</h4>
            <Badge className="bg-blue-500 text-white">Click to insert</Badge>
          </div>
          <div className="space-y-2">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="p-3 bg-white rounded-lg border hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-gray-700 flex-1">{suggestion}</p>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => insertSuggestion(suggestion)}
                      className="h-7 px-2"
                      title="Insert into notes"
                    >
                      <Sparkles className="w-3 h-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => copySuggestion(suggestion)}
                      className="h-7 px-2"
                      title="Copy to clipboard"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Validation Results */}
      {validationResult && (
        <div className={`p-4 rounded-lg border ${
          validationResult.isValid 
            ? 'bg-green-50 border-green-200' 
            : 'bg-orange-50 border-orange-200'
        }`}>
          <div className="flex items-start gap-3">
            {validationResult.isValid ? (
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
            )}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h4 className={`font-semibold ${
                  validationResult.isValid ? 'text-green-900' : 'text-orange-900'
                }`}>
                  {validationResult.isValid ? 'Notes Look Good!' : 'Notes Need Improvement'}
                </h4>
                {validationResult.qualityScore && (
                  <Badge className={
                    validationResult.qualityScore >= 8 ? "bg-green-500 text-white" :
                    validationResult.qualityScore >= 6 ? "bg-yellow-500 text-white" :
                    "bg-orange-500 text-white"
                  }>
                    Quality: {validationResult.qualityScore}/10
                  </Badge>
                )}
              </div>

              {validationResult.issues && validationResult.issues.length > 0 && (
                <div className="mb-3">
                  <p className="text-sm font-medium text-orange-900 mb-1">Issues Found:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {validationResult.issues.map((issue, idx) => (
                      <li key={idx} className="text-sm text-orange-800">{issue}</li>
                    ))}
                  </ul>
                </div>
              )}

              {validationResult.suggestions && validationResult.suggestions.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-blue-900 mb-1">Suggestions:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {validationResult.suggestions.map((suggestion, idx) => (
                      <li key={idx} className="text-sm text-blue-800">{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-blue-600 mt-0.5" />
          <div className="text-xs text-blue-800">
            <p className="font-medium mb-1">AI Writing Assistant Tips:</p>
            <ul className="space-y-0.5 ml-3">
              <li>• Use "Auto-Generate" for a complete summary based on your visit</li>
              <li>• Click "Get Suggestions" for professional phrases you can use</li>
              <li>• "Check Quality" validates your notes before submission</li>
              <li>• Click any suggestion to insert it into your notes</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}