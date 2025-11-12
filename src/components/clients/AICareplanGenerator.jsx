import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { X, Sparkles, Loader2, FileText, CheckCircle, Download, Edit } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export default function AICareplanGenerator({ client, onClose }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedPlan, setEditedPlan] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updateClientMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Client.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success("Success", "Care plan saved successfully");
    },
  });

  const generateCarePlan = async () => {
    setIsGenerating(true);
    try {
      // Prepare context for AI
      const context = {
        client_name: client.full_name,
        age: client.date_of_birth ? calculateAge(client.date_of_birth) : "Unknown",
        care_needs: client.care_needs || [],
        mobility: client.mobility || "Not specified",
        medical_notes: client.medical_notes || "None provided",
        funding_type: client.funding_type || "Not specified"
      };

      const prompt = `Generate a comprehensive, professional care plan for the following client:

Client Information:
- Name: ${context.client_name}
- Age: ${context.age}
- Mobility: ${context.mobility}
- Care Needs: ${context.care_needs.join(', ') || 'Not specified'}
- Medical Notes: ${context.medical_notes}
- Funding: ${context.funding_type}

Please create a detailed care plan that includes:
1. Overview and Assessment Summary
2. Care Goals (Short-term and Long-term)
3. Daily Care Activities Schedule
4. Risk Assessment and Management
5. Medication Management (if applicable)
6. Support Requirements
7. Communication Plan
8. Review Schedule

Format the plan professionally with clear sections and actionable items.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        add_context_from_internet: false,
      });

      setGeneratedPlan(result);
      setEditedPlan(result);
      toast.success("Care Plan Generated", "Review and edit before saving");
    } catch (error) {
      console.error("Error generating care plan:", error);
      toast.error("Error", "Failed to generate care plan. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const savePlan = async () => {
    try {
      await updateClientMutation.mutateAsync({
        id: client.id,
        data: {
          care_plan: editedPlan,
          care_plan_last_updated: new Date().toISOString(),
        }
      });
      onClose();
    } catch (error) {
      console.error("Error saving care plan:", error);
      toast.error("Error", "Failed to save care plan");
    }
  };

  const downloadPlan = () => {
    const blob = new Blob([editedPlan], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${client.full_name.replace(/\s+/g, '_')}_Care_Plan.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Downloaded", "Care plan downloaded successfully");
  };

  const calculateAge = (dob) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <Card className="w-full max-w-4xl my-8">
        <CardHeader className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <CardTitle className="text-2xl">AI Care Plan Generator</CardTitle>
                <p className="text-sm text-white/80 mt-1">
                  For {client.full_name}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {!generatedPlan ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <FileText className="w-10 h-10 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Ready to Generate Care Plan?
              </h3>
              <p className="text-gray-600 mb-2 max-w-lg mx-auto">
                Our AI will analyze the client's information and create a comprehensive, 
                professional care plan tailored to their needs.
              </p>
              
              {/* Client Info Preview */}
              <div className="max-w-md mx-auto mt-6 p-4 bg-gray-50 rounded-lg text-left">
                <p className="text-sm font-semibold text-gray-700 mb-3">Client Information:</p>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Care Needs:</span>
                    <Badge variant="outline">{client.care_needs?.length || 0}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Mobility:</span>
                    <Badge variant="outline">{client.mobility || 'Not specified'}</Badge>
                  </div>
                  {client.medical_notes && (
                    <div className="flex justify-between">
                      <span>Medical Notes:</span>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                  )}
                </div>
              </div>

              <Button
                onClick={generateCarePlan}
                disabled={isGenerating}
                className="mt-6 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Generating Care Plan...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Generate Care Plan
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Care Plan Generated</h3>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(!isEditing)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    {isEditing ? 'Preview' : 'Edit'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadPlan}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>

              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> This is an AI-generated care plan. 
                  Please review and edit as needed before saving to ensure accuracy and compliance.
                </p>
              </div>

              {isEditing ? (
                <Textarea
                  value={editedPlan}
                  onChange={(e) => setEditedPlan(e.target.value)}
                  className="min-h-[500px] font-mono text-sm"
                  placeholder="Edit the care plan..."
                />
              ) : (
                <div className="max-h-[500px] overflow-y-auto p-4 bg-gray-50 rounded-lg border">
                  <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800">
                    {editedPlan}
                  </pre>
                </div>
              )}

              <div className="flex gap-3 mt-6 pt-6 border-t">
                <Button
                  variant="outline"
                  onClick={generateCarePlan}
                  disabled={isGenerating}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Regenerate
                </Button>
                <Button
                  onClick={savePlan}
                  disabled={updateClientMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  {updateClientMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Save Care Plan
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}