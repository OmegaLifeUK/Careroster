import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, AlertCircle, Lightbulb, Shield } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export default function AIIncidentAnalyzer({ incident }) {
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingTasks, setIsGeneratingTasks] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const data = await base44.entities.Staff.list();
      return Array.isArray(data) ? data : [];
    },
  });

  const analyzeIncident = async () => {
    setIsAnalyzing(true);
    try {
      const prompt = `Analyze this incident report and provide:
1. Potential root causes (immediate and underlying)
2. Contributing factors
3. Preventative measures to avoid similar incidents
4. Immediate action recommendations
5. Long-term systemic improvements

Incident Details:
- Type: ${incident.incident_type}
- Severity: ${incident.severity}
- Description: ${incident.description}
- Location: ${incident.location || 'Not specified'}
- Time: ${incident.incident_date}
${incident.staff_involved ? `- Staff Involved: ${incident.staff_involved.join(', ')}` : ''}
${incident.witnesses ? `- Witnesses: ${incident.witnesses}` : ''}
${incident.immediate_actions ? `- Immediate Actions Taken: ${incident.immediate_actions}` : ''}

Provide a comprehensive root cause analysis with actionable recommendations.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            root_causes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  cause_type: { type: "string" },
                  description: { type: "string" },
                  likelihood: { type: "string" }
                }
              }
            },
            contributing_factors: {
              type: "array",
              items: { type: "string" }
            },
            preventative_measures: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  measure: { type: "string" },
                  timeframe: { type: "string" },
                  responsibility: { type: "string" }
                }
              }
            },
            immediate_actions: {
              type: "array",
              items: { type: "string" }
            },
            systemic_improvements: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  area: { type: "string" },
                  improvement: { type: "string" },
                  impact: { type: "string" }
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

  const generateTasks = async () => {
    if (!analysis) return;
    
    setIsGeneratingTasks(true);
    try {
      const tasksToCreate = [];

      // Immediate actions
      analysis.immediate_actions?.forEach(action => {
        tasksToCreate.push({
          title: `Immediate Action: ${action.substring(0, 50)}`,
          description: action,
          source_type: 'incident_ai',
          source_entity_id: incident.id,
          priority: 'urgent',
          status: 'pending',
          due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          assigned_to_staff_id: staff[0]?.id,
          assigned_by: 'AI Analysis'
        });
      });

      // Preventative measures
      analysis.preventative_measures?.forEach(measure => {
        const daysToAdd = measure.timeframe?.includes('immediate') ? 7 :
                         measure.timeframe?.includes('short') ? 14 : 30;
        
        tasksToCreate.push({
          title: measure.measure.substring(0, 100),
          description: `${measure.measure}\n\nTimeframe: ${measure.timeframe}\nResponsibility: ${measure.responsibility}`,
          source_type: 'incident_ai',
          source_entity_id: incident.id,
          priority: 'high',
          status: 'pending',
          due_date: new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          assigned_to_staff_id: staff[0]?.id,
          assigned_by: 'AI Analysis'
        });
      });

      await base44.entities.ComplianceTask.bulkCreate(tasksToCreate);
      queryClient.invalidateQueries({ queryKey: ['compliance-tasks'] });
      toast.success("Success", `Generated ${tasksToCreate.length} tasks from AI analysis`);
    } catch (error) {
      console.error("Task generation error:", error);
      toast.error("Error", "Failed to generate tasks");
    } finally {
      setIsGeneratingTasks(false);
    }
  };

  const likelihoodColors = {
    high: "bg-red-100 text-red-800",
    medium: "bg-orange-100 text-orange-800",
    low: "bg-yellow-100 text-yellow-800"
  };

  return (
    <Card>
      <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-blue-50">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            AI Root Cause Analysis
          </CardTitle>
          <div className="flex gap-2">
            <Button 
              onClick={analyzeIncident} 
              disabled={isAnalyzing}
              className="bg-gradient-to-r from-purple-600 to-blue-600"
            >
              {isAnalyzing ? "Analyzing..." : "Run AI Analysis"}
            </Button>
            {analysis && (
              <Button 
                onClick={generateTasks}
                disabled={isGeneratingTasks}
                variant="outline"
                className="border-purple-600 text-purple-600"
              >
                {isGeneratingTasks ? "Generating..." : "Generate Tasks"}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {!analysis ? (
          <div className="text-center py-12">
            <Sparkles className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 mb-2">AI-Powered Incident Intelligence</p>
            <p className="text-sm text-gray-400">Click "Run AI Analysis" to get root cause insights and preventative recommendations</p>
          </div>
        ) : (
          <div className="space-y-6">
            {analysis.root_causes && analysis.root_causes.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  Potential Root Causes
                </h3>
                <div className="space-y-3">
                  {analysis.root_causes.map((cause, idx) => (
                    <div key={idx} className="p-4 border rounded-lg bg-red-50">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium">{cause.cause_type}</h4>
                        <Badge className={likelihoodColors[cause.likelihood?.toLowerCase()] || likelihoodColors.medium}>
                          {cause.likelihood} Likelihood
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-700">{cause.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analysis.contributing_factors && analysis.contributing_factors.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-3">Contributing Factors</h3>
                <div className="space-y-2">
                  {analysis.contributing_factors.map((factor, idx) => (
                    <div key={idx} className="p-3 bg-orange-50 border border-orange-200 rounded">
                      <p className="text-sm text-gray-800">• {factor}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analysis.immediate_actions && analysis.immediate_actions.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-600" />
                  Immediate Actions Recommended
                </h3>
                <div className="space-y-2">
                  {analysis.immediate_actions.map((action, idx) => (
                    <div key={idx} className="p-3 bg-blue-50 border border-blue-200 rounded">
                      <p className="text-sm text-gray-800 font-medium">• {action}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analysis.preventative_measures && analysis.preventative_measures.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-green-600" />
                  Preventative Measures
                </h3>
                <div className="space-y-3">
                  {analysis.preventative_measures.map((measure, idx) => (
                    <div key={idx} className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-gray-800 font-medium mb-2">{measure.measure}</p>
                      <div className="flex gap-4 text-xs text-gray-600">
                        <span>Timeframe: {measure.timeframe}</span>
                        <span>Responsibility: {measure.responsibility}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analysis.systemic_improvements && analysis.systemic_improvements.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-3">Long-term Systemic Improvements</h3>
                <div className="space-y-3">
                  {analysis.systemic_improvements.map((improvement, idx) => (
                    <div key={idx} className="p-4 border rounded-lg">
                      <div className="mb-2">
                        <Badge variant="outline">{improvement.area}</Badge>
                      </div>
                      <p className="text-sm text-gray-800 mb-2">{improvement.improvement}</p>
                      <p className="text-xs text-gray-600">Expected Impact: {improvement.impact}</p>
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