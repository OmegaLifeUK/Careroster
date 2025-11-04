import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, CheckCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SmartAssignButton({ shift, carers, clients, shifts, leaveRequests }) {
  const [showDialog, setShowDialog] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recommendation, setRecommendation] = useState(null);

  const queryClient = useQueryClient();

  const analyzeBestCarer = async () => {
    setIsAnalyzing(true);
    try {
      const client = clients.find(c => c.id === shift.client_id);
      const activeCarers = carers.filter(c => c.status === 'active');

      const prompt = `Analyze and recommend the best carer for this shift:

**Shift Details:**
- Client: ${client?.full_name}
- Date: ${shift.date}
- Time: ${shift.start_time} - ${shift.end_time}
- Type: ${shift.shift_type}
- Tasks: ${shift.tasks?.join(', ') || 'General care'}

**Client Information:**
- Care Needs: ${client?.care_needs?.join(', ') || 'General care'}
- Preferred Carers: ${client?.preferred_carers?.map(id => carers.find(c => c.id === id)?.full_name).filter(Boolean).join(', ') || 'None specified'}
- Medical Notes: ${client?.medical_notes || 'None'}

**Available Carers:**
${activeCarers.map(c => `- ${c.full_name}: ${c.employment_type}, Qualifications: ${c.qualifications?.join(', ') || 'None'}`).join('\n')}

**Instructions:**
Analyze each carer considering:
1. Qualifications matching client care needs
2. Preferred carer relationships
3. Availability (check if they have conflicting shifts)
4. Workload balance
5. Continuity of care (previous shifts with this client)

Recommend the top 3 carers with detailed reasoning and confidence scores.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  carer_name: { type: "string" },
                  confidence_score: { type: "number" },
                  reasoning: { type: "string" },
                  pros: { type: "array", items: { type: "string" } },
                  cons: { type: "array", items: { type: "string" } }
                }
              }
            },
            best_match: { type: "string" }
          }
        }
      });

      // Map names back to IDs
      const recommendationsWithIds = response.recommendations.map(rec => {
        const carer = activeCarers.find(c => c.full_name === rec.carer_name);
        return {
          ...rec,
          carer_id: carer?.id,
          carer
        };
      }).filter(r => r.carer_id);

      setRecommendation({
        recommendations: recommendationsWithIds,
        best_match: response.best_match
      });
      setShowDialog(true);
    } catch (error) {
      console.error("Error analyzing carers:", error);
      alert("Failed to analyze carers. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const assignMutation = useMutation({
    mutationFn: async (carerId) => {
      await base44.entities.Shift.update(shift.id, {
        ...shift,
        carer_id: carerId,
        status: "scheduled"
      });

      // Send notification to carer
      const carer = carers.find(c => c.id === carerId);
      const client = clients.find(c => c.id === shift.client_id);
      
      if (carer) {
        await base44.entities.Notification.create({
          recipient_id: carer.email,
          title: "New Shift Assigned",
          message: `You have been assigned to a ${shift.shift_type} shift with ${client?.full_name} on ${shift.date} from ${shift.start_time} to ${shift.end_time}.`,
          type: "shift_assigned",
          priority: "normal",
          is_read: false,
          related_entity_type: "shift",
          related_entity_id: shift.id,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setShowDialog(false);
    },
  });

  return (
    <>
      <Button
        onClick={analyzeBestCarer}
        disabled={isAnalyzing}
        variant="outline"
        className="border-purple-300 text-purple-700 hover:bg-purple-50"
      >
        {isAnalyzing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Analyzing...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            AI Assign
          </>
        )}
      </Button>

      {showDialog && recommendation && (
        <Dialog open onOpenChange={setShowDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                AI Carer Recommendations
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-sm text-purple-900">
                  <strong>Best Match:</strong> {recommendation.best_match}
                </p>
              </div>

              {recommendation.recommendations.map((rec, idx) => (
                <Card key={idx} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${
                        idx === 0 ? 'from-green-400 to-green-500' :
                        idx === 1 ? 'from-blue-400 to-blue-500' :
                        'from-gray-400 to-gray-500'
                      } flex items-center justify-center text-white font-bold text-lg`}>
                        #{idx + 1}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{rec.carer_name}</h3>
                        <p className="text-sm text-gray-500">{rec.carer?.employment_type?.replace('_', ' ')}</p>
                      </div>
                    </div>
                    <Badge className={
                      rec.confidence_score >= 80 ? "bg-green-100 text-green-800" :
                      rec.confidence_score >= 60 ? "bg-blue-100 text-blue-800" :
                      "bg-gray-100 text-gray-800"
                    }>
                      {rec.confidence_score}% Match
                    </Badge>
                  </div>

                  <p className="text-sm text-gray-700 mb-3">{rec.reasoning}</p>

                  <div className="grid md:grid-cols-2 gap-3 mb-3">
                    <div>
                      <p className="text-sm font-medium text-green-700 mb-2">✓ Strengths:</p>
                      <ul className="text-xs text-gray-600 space-y-1">
                        {rec.pros.map((pro, i) => (
                          <li key={i}>• {pro}</li>
                        ))}
                      </ul>
                    </div>
                    {rec.cons && rec.cons.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-orange-700 mb-2">⚠ Considerations:</p>
                        <ul className="text-xs text-gray-600 space-y-1">
                          {rec.cons.map((con, i) => (
                            <li key={i}>• {con}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={() => assignMutation.mutate(rec.carer_id)}
                    disabled={assignMutation.isPending}
                    className={`w-full ${idx === 0 ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                  >
                    {assignMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Assigning...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Assign {rec.carer_name}
                      </>
                    )}
                  </Button>
                </Card>
              ))}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}