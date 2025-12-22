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

  const { data: users = [] } = useQuery({
    queryKey: ['users-for-assignment'],
    queryFn: async () => {
      const data = await base44.entities.User.list();
      return Array.isArray(data) ? data : [];
    },
  });

  const analyzeIncident = async () => {
    setIsAnalyzing(true);
    try {
      // Build staff context for AI assignment
      const staffContext = staff.map(s => 
        `- ${s.full_name}: ${s.email}, Qualifications: ${s.qualifications?.join(', ') || 'None'}`
      ).join('\n');

      const userRoles = users.map(u => 
        `- ${u.full_name || u.email}: Role: ${u.role}`
      ).join('\n');

      const prompt = `Analyze this incident report and provide:
1. Potential root causes (immediate and underlying)
2. Contributing factors
3. Preventative measures to avoid similar incidents
4. Immediate action recommendations with specific staff assignments
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

Available Staff for Task Assignment:
${staffContext || 'No staff data available'}

Users by Role:
${userRoles || 'No user data available'}

IMPORTANT: For each preventative measure and immediate action, suggest the most appropriate person or group to assign the task to based on:
- Their role (admin, manager, care staff)
- Their qualifications
- The nature of the task (e.g., training tasks to qualified trainers, policy reviews to managers, direct care actions to care staff)

Provide a comprehensive root cause analysis with actionable recommendations and specific assignments.`;

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
                  responsibility: { type: "string" },
                  assign_to: { type: "string", description: "Email or name of person/group to assign this task to" },
                  assignment_reason: { type: "string", description: "Why this person/group is most suitable" }
                }
              }
            },
            immediate_actions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  action: { type: "string" },
                  assign_to: { type: "string", description: "Email or name of person/group to assign this task to" },
                  assignment_reason: { type: "string", description: "Why this person/group is most suitable" }
                }
              }
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

      // Helper function to find staff member by email or name
      const findStaffByIdentifier = (identifier) => {
        if (!identifier) return null;
        
        const lowerIdentifier = identifier.toLowerCase();
        
        // Try to find by email first
        const byEmail = staff.find(s => s.email?.toLowerCase() === lowerIdentifier);
        if (byEmail) return byEmail;
        
        // Try to find by name
        const byName = staff.find(s => s.full_name?.toLowerCase().includes(lowerIdentifier));
        if (byName) return byName;
        
        // Try users
        const userByEmail = users.find(u => u.email?.toLowerCase() === lowerIdentifier);
        if (userByEmail) {
          const staffByUserEmail = staff.find(s => s.email === userByEmail.email);
          if (staffByUserEmail) return staffByUserEmail;
        }
        
        // If it's a role (admin, manager), find first user with that role
        if (lowerIdentifier.includes('admin')) {
          const admin = users.find(u => u.role === 'admin');
          if (admin) {
            const adminStaff = staff.find(s => s.email === admin.email);
            if (adminStaff) return adminStaff;
            return { id: admin.email, full_name: admin.full_name || admin.email };
          }
        }
        
        return null;
      };

      // Immediate actions
      analysis.immediate_actions?.forEach(actionObj => {
        const actionText = typeof actionObj === 'string' ? actionObj : actionObj.action;
        const assignTo = typeof actionObj === 'object' ? actionObj.assign_to : null;
        const assignmentReason = typeof actionObj === 'object' ? actionObj.assignment_reason : null;
        
        const assignedStaff = findStaffByIdentifier(assignTo) || staff[0];
        
        tasksToCreate.push({
          title: `Immediate Action: ${actionText.substring(0, 50)}`,
          description: `${actionText}\n\n${assignmentReason ? `Assignment Reason: ${assignmentReason}` : ''}`,
          source_type: 'incident_ai',
          source_entity_id: incident.id,
          priority: 'urgent',
          status: 'pending',
          due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          assigned_to_staff_id: assignedStaff?.id || assignedStaff?.email,
          assigned_by: 'AI Analysis'
        });
      });

      // Preventative measures
      analysis.preventative_measures?.forEach(measure => {
        const daysToAdd = measure.timeframe?.includes('immediate') ? 7 :
                         measure.timeframe?.includes('short') ? 14 : 30;
        
        const assignedStaff = findStaffByIdentifier(measure.assign_to) || staff[0];
        
        tasksToCreate.push({
          title: measure.measure.substring(0, 100),
          description: `${measure.measure}\n\nTimeframe: ${measure.timeframe}\nResponsibility: ${measure.responsibility}\n${measure.assignment_reason ? `\nAssignment Reason: ${measure.assignment_reason}` : ''}`,
          source_type: 'incident_ai',
          source_entity_id: incident.id,
          priority: measure.timeframe?.includes('immediate') ? 'urgent' : 'high',
          status: 'pending',
          due_date: new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          assigned_to_staff_id: assignedStaff?.id || assignedStaff?.email,
          assigned_by: 'AI Analysis'
        });
      });

      await base44.entities.ComplianceTask.bulkCreate(tasksToCreate);
      queryClient.invalidateQueries({ queryKey: ['compliance-tasks'] });
      
      // Show detailed success message
      const uniqueAssignees = [...new Set(tasksToCreate.map(t => {
        const assignedPerson = staff.find(s => s.id === t.assigned_to_staff_id || s.email === t.assigned_to_staff_id);
        return assignedPerson?.full_name || t.assigned_to_staff_id;
      }))];
      
      toast.success(
        "Tasks Generated", 
        `Created ${tasksToCreate.length} tasks assigned to ${uniqueAssignees.length} staff member(s): ${uniqueAssignees.slice(0, 3).join(', ')}${uniqueAssignees.length > 3 ? '...' : ''}`
      );
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
                  {analysis.immediate_actions.map((actionObj, idx) => {
                    const actionText = typeof actionObj === 'string' ? actionObj : actionObj.action;
                    const assignTo = typeof actionObj === 'object' ? actionObj.assign_to : null;
                    const assignmentReason = typeof actionObj === 'object' ? actionObj.assignment_reason : null;
                    
                    return (
                      <div key={idx} className="p-3 bg-blue-50 border border-blue-200 rounded">
                        <p className="text-sm text-gray-800 font-medium">• {actionText}</p>
                        {assignTo && (
                          <div className="mt-2 flex items-center gap-2">
                            <Badge className="bg-blue-600 text-white">Assign to: {assignTo}</Badge>
                            {assignmentReason && (
                              <span className="text-xs text-blue-700">{assignmentReason}</span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
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
                      <div className="flex flex-wrap gap-3 text-xs">
                        <span className="text-gray-600">Timeframe: {measure.timeframe}</span>
                        <span className="text-gray-600">Responsibility: {measure.responsibility}</span>
                        {measure.assign_to && (
                          <Badge className="bg-green-600 text-white">Assign to: {measure.assign_to}</Badge>
                        )}
                      </div>
                      {measure.assignment_reason && (
                        <p className="text-xs text-green-700 mt-2 italic">{measure.assignment_reason}</p>
                      )}
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