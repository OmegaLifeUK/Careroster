import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Users, TrendingDown, Target } from "lucide-react";

export default function AITrainingAnalyzer() {
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { data: assignments = [] } = useQuery({
    queryKey: ['training-assignments'],
    queryFn: async () => {
      const data = await base44.entities.TrainingAssignment.list();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const data = await base44.entities.Staff.list();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: modules = [] } = useQuery({
    queryKey: ['training-modules'],
    queryFn: async () => {
      const data = await base44.entities.TrainingModule.list();
      return Array.isArray(data) ? data : [];
    },
  });

  const analyzeTraining = async () => {
    setIsAnalyzing(true);
    try {
      const staffWithAssignments = staff.map(s => {
        const staffAssignments = assignments.filter(a => a.staff_id === s.id);
        return {
          name: s.full_name,
          total_assigned: staffAssignments.length,
          completed: staffAssignments.filter(a => a.completion_status === 'completed').length,
          overdue: staffAssignments.filter(a => a.completion_status !== 'completed' && a.due_date && new Date(a.due_date) < new Date()).length,
          in_progress: staffAssignments.filter(a => a.completion_status === 'in_progress').length,
          not_started: staffAssignments.filter(a => a.completion_status === 'not_started').length,
          assignments: staffAssignments.map(a => ({
            module: modules.find(m => m.id === a.training_module_id)?.module_name,
            status: a.completion_status,
            due_date: a.due_date
          }))
        };
      });

      const prompt = `Analyze this training completion data and identify:
1. Staff members who need additional support or are struggling
2. Common patterns in incomplete/overdue training
3. Training modules that staff find difficult
4. Recommendations for improving training completion rates
5. Staff who are excelling and could mentor others

Training Data:
${JSON.stringify(staffWithAssignments, null, 2)}

Provide actionable insights to improve training outcomes.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            staff_needing_support: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  staff_name: { type: "string" },
                  support_level: { type: "string" },
                  reason: { type: "string" },
                  recommended_actions: { type: "array", items: { type: "string" } }
                }
              }
            },
            common_patterns: {
              type: "array",
              items: { type: "string" }
            },
            difficult_modules: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  module: { type: "string" },
                  issue: { type: "string" },
                  suggestion: { type: "string" }
                }
              }
            },
            recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  category: { type: "string" },
                  recommendation: { type: "string" },
                  expected_impact: { type: "string" }
                }
              }
            },
            high_performers: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  staff_name: { type: "string" },
                  strengths: { type: "string" }
                }
              }
            }
          }
        }
      });

      setAnalysis(result);
    } catch (error) {
      console.error("Analysis error:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const supportLevelColors = {
    urgent: "bg-red-100 text-red-800",
    high: "bg-orange-100 text-orange-800",
    medium: "bg-yellow-100 text-yellow-800",
    low: "bg-blue-100 text-blue-800"
  };

  return (
    <Card>
      <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            AI Training Intelligence
          </CardTitle>
          <Button 
            onClick={analyzeTraining} 
            disabled={isAnalyzing || assignments.length === 0}
            className="bg-gradient-to-r from-purple-600 to-indigo-600"
          >
            {isAnalyzing ? "Analyzing..." : "Run AI Analysis"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {!analysis ? (
          <div className="text-center py-12">
            <Sparkles className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 mb-2">AI-Powered Training Insights</p>
            <p className="text-sm text-gray-400">Click "Run AI Analysis" to identify staff needing support and training patterns</p>
          </div>
        ) : (
          <div className="space-y-6">
            {analysis.staff_needing_support && analysis.staff_needing_support.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <Users className="w-5 h-5 text-red-600" />
                  Staff Needing Additional Support
                </h3>
                <div className="space-y-3">
                  {analysis.staff_needing_support.map((staff, idx) => (
                    <div key={idx} className="p-4 border rounded-lg bg-red-50">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium">{staff.staff_name}</h4>
                        <Badge className={supportLevelColors[staff.support_level?.toLowerCase()] || supportLevelColors.medium}>
                          {staff.support_level} Priority
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-700 mb-3">{staff.reason}</p>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-600">Recommended Actions:</p>
                        {staff.recommended_actions?.map((action, aidx) => (
                          <div key={aidx} className="text-sm text-gray-800 bg-white p-2 rounded">
                            • {action}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analysis.high_performers && analysis.high_performers.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <Target className="w-5 h-5 text-green-600" />
                  High Performers (Potential Mentors)
                </h3>
                <div className="space-y-2">
                  {analysis.high_performers.map((staff, idx) => (
                    <div key={idx} className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <h4 className="font-medium mb-1">{staff.staff_name}</h4>
                      <p className="text-sm text-gray-700">{staff.strengths}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analysis.common_patterns && analysis.common_patterns.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-orange-600" />
                  Common Patterns
                </h3>
                <div className="space-y-2">
                  {analysis.common_patterns.map((pattern, idx) => (
                    <div key={idx} className="p-3 bg-orange-50 border border-orange-200 rounded">
                      <p className="text-sm text-gray-800">• {pattern}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analysis.difficult_modules && analysis.difficult_modules.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-3">Challenging Training Modules</h3>
                <div className="space-y-3">
                  {analysis.difficult_modules.map((module, idx) => (
                    <div key={idx} className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-1">{module.module}</h4>
                      <p className="text-sm text-gray-700 mb-2">Issue: {module.issue}</p>
                      <p className="text-sm text-green-700 bg-green-50 p-2 rounded">
                        💡 {module.suggestion}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analysis.recommendations && analysis.recommendations.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-3">Recommendations for Improvement</h3>
                <div className="space-y-3">
                  {analysis.recommendations.map((rec, idx) => (
                    <div key={idx} className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="mb-2">
                        <Badge variant="outline">{rec.category}</Badge>
                      </div>
                      <p className="text-sm text-gray-800 font-medium mb-2">{rec.recommendation}</p>
                      <p className="text-xs text-gray-600">Expected Impact: {rec.expected_impact}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}