import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, AlertCircle, Lightbulb, Shield, Users } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export default function AIIncidentAnalyzer({ incident }) {
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingTasks, setIsGeneratingTasks] = useState(false);
  const [showTaskAssignmentDialog, setShowTaskAssignmentDialog] = useState(false);
  const [taskAssignments, setTaskAssignments] = useState({});

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const data = await base44.entities.Staff.list();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: carers = [] } = useQuery({
    queryKey: ['carers'],
    queryFn: async () => {
      const data = await base44.entities.Carer.list();
      return Array.isArray(data) ? data : [];
    },
  });

  const allStaff = [...staff, ...carers];

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
                  responsibility: { type: "string" },
                  suggested_role: { type: "string", description: "admin, manager, care_coordinator, staff_member, team_lead" }
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
      
      // Initialize task assignments with suggested roles
      const assignments = {};
      let taskIndex = 0;
      
      result.immediate_actions?.forEach(action => {
        assignments[`immediate_${taskIndex}`] = {
          action,
          type: 'immediate',
          suggested_role: 'manager',
          assignment_type: 'role',
          assigned_role: 'admin',
          assigned_staff_id: null
        };
        taskIndex++;
      });
      
      result.preventative_measures?.forEach((measure, idx) => {
        assignments[`preventative_${idx}`] = {
          measure: measure.measure,
          type: 'preventative',
          timeframe: measure.timeframe,
          responsibility: measure.responsibility,
          suggested_role: measure.suggested_role || 'manager',
          assignment_type: 'role',
          assigned_role: measure.suggested_role || 'manager',
          assigned_staff_id: null
        };
      });
      
      setTaskAssignments(assignments);
    } catch (error) {
      console.error("Analysis error:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const openTaskAssignmentDialog = () => {
    setShowTaskAssignmentDialog(true);
  };

  const generateTasks = async () => {
    if (!analysis) return;
    
    setIsGeneratingTasks(true);
    try {
      const user = await base44.auth.me();
      const tasksToCreate = [];

      Object.entries(taskAssignments).forEach(([key, assignment]) => {
        if (assignment.type === 'immediate') {
          // Get staff based on assignment
          let assignedStaff = null;
          if (assignment.assignment_type === 'staff' && assignment.assigned_staff_id) {
            assignedStaff = assignment.assigned_staff_id;
          } else if (assignment.assignment_type === 'role') {
            // Find first staff member with matching role
            assignedStaff = allStaff.find(s => 
              s.role === assignment.assigned_role || 
              s.staff_role === assignment.assigned_role
            )?.id || user.email;
          } else if (assignment.assignment_type === 'all_role') {
            // Will create multiple tasks, one per matching staff member
            const matchingStaff = allStaff.filter(s => 
              s.role === assignment.assigned_role || 
              s.staff_role === assignment.assigned_role
            );
            
            matchingStaff.forEach(staffMember => {
              tasksToCreate.push({
                title: `Immediate Action: ${assignment.action.substring(0, 50)}`,
                description: `${assignment.action}\n\nAssigned to all ${assignment.assigned_role} staff members.`,
                source_type: 'incident_ai',
                source_entity_id: incident.id,
                priority: 'urgent',
                status: 'pending',
                due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                assigned_to_staff_id: staffMember.id,
                assigned_by: 'AI Analysis'
              });
            });
            return; // Skip the single task creation below
          }

          tasksToCreate.push({
            title: `Immediate Action: ${assignment.action.substring(0, 50)}`,
            description: assignment.action,
            source_type: 'incident_ai',
            source_entity_id: incident.id,
            priority: 'urgent',
            status: 'pending',
            due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            assigned_to_staff_id: assignedStaff,
            assigned_by: 'AI Analysis'
          });
        } else if (assignment.type === 'preventative') {
          const daysToAdd = assignment.timeframe?.includes('immediate') ? 7 :
                           assignment.timeframe?.includes('short') ? 14 : 30;
          
          let assignedStaff = null;
          if (assignment.assignment_type === 'staff' && assignment.assigned_staff_id) {
            assignedStaff = assignment.assigned_staff_id;
          } else if (assignment.assignment_type === 'role') {
            assignedStaff = allStaff.find(s => 
              s.role === assignment.assigned_role || 
              s.staff_role === assignment.assigned_role
            )?.id || user.email;
          } else if (assignment.assignment_type === 'all_role') {
            const matchingStaff = allStaff.filter(s => 
              s.role === assignment.assigned_role || 
              s.staff_role === assignment.assigned_role
            );
            
            matchingStaff.forEach(staffMember => {
              tasksToCreate.push({
                title: assignment.measure.substring(0, 100),
                description: `${assignment.measure}\n\nTimeframe: ${assignment.timeframe}\nResponsibility: ${assignment.responsibility}\n\nAssigned to all ${assignment.assigned_role} staff members.`,
                source_type: 'incident_ai',
                source_entity_id: incident.id,
                priority: 'high',
                status: 'pending',
                due_date: new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                assigned_to_staff_id: staffMember.id,
                assigned_by: 'AI Analysis'
              });
            });
            return;
          }
          
          tasksToCreate.push({
            title: assignment.measure.substring(0, 100),
            description: `${assignment.measure}\n\nTimeframe: ${assignment.timeframe}\nResponsibility: ${assignment.responsibility}`,
            source_type: 'incident_ai',
            source_entity_id: incident.id,
            priority: 'high',
            status: 'pending',
            due_date: new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            assigned_to_staff_id: assignedStaff,
            assigned_by: 'AI Analysis'
          });
        }
      });

      await base44.entities.ComplianceTask.bulkCreate(tasksToCreate);
      queryClient.invalidateQueries({ queryKey: ['compliance-tasks'] });
      toast.success("Success", `Generated ${tasksToCreate.length} tasks from AI analysis`);
      setShowTaskAssignmentDialog(false);
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
                onClick={openTaskAssignmentDialog}
                disabled={isGeneratingTasks}
                variant="outline"
                className="border-purple-600 text-purple-600"
              >
                <Users className="w-4 h-4 mr-2" />
                Assign & Generate Tasks
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

      {/* Task Assignment Dialog */}
      <Dialog open={showTaskAssignmentDialog} onOpenChange={setShowTaskAssignmentDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Assign Follow-up Tasks
            </DialogTitle>
            <p className="text-sm text-gray-500 mt-1">
              Assign tasks to specific staff members or roles. Tasks assigned to roles will go to all members of that role.
            </p>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {Object.entries(taskAssignments).map(([key, assignment]) => (
              <Card key={key} className="border">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div>
                      <Badge className={assignment.type === 'immediate' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                        {assignment.type === 'immediate' ? 'Immediate Action' : 'Preventative Measure'}
                      </Badge>
                      <p className="font-medium mt-2 text-sm">
                        {assignment.action || assignment.measure}
                      </p>
                      {assignment.responsibility && (
                        <p className="text-xs text-gray-600 mt-1">Suggested: {assignment.responsibility}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs">Assignment Type</Label>
                        <Select
                          value={assignment.assignment_type}
                          onValueChange={(v) => setTaskAssignments({
                            ...taskAssignments,
                            [key]: { ...assignment, assignment_type: v }
                          })}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="staff">Specific Staff</SelectItem>
                            <SelectItem value="role">Single Role Member</SelectItem>
                            <SelectItem value="all_role">All Role Members</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {assignment.assignment_type === 'staff' ? (
                        <div className="col-span-2">
                          <Label className="text-xs">Assign To</Label>
                          <Select
                            value={assignment.assigned_staff_id || ''}
                            onValueChange={(v) => setTaskAssignments({
                              ...taskAssignments,
                              [key]: { ...assignment, assigned_staff_id: v }
                            })}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Select staff member" />
                            </SelectTrigger>
                            <SelectContent>
                              {allStaff.map(s => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.full_name} {s.role ? `(${s.role})` : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
                        <div className="col-span-2">
                          <Label className="text-xs">Assign To Role</Label>
                          <Select
                            value={assignment.assigned_role}
                            onValueChange={(v) => setTaskAssignments({
                              ...taskAssignments,
                              [key]: { ...assignment, assigned_role: v }
                            })}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="manager">Manager</SelectItem>
                              <SelectItem value="care_coordinator">Care Coordinator</SelectItem>
                              <SelectItem value="team_lead">Team Lead</SelectItem>
                              <SelectItem value="staff_member">Staff Member</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTaskAssignmentDialog(false)}>
              Cancel
            </Button>
            <Button onClick={generateTasks} disabled={isGeneratingTasks} className="bg-purple-600 hover:bg-purple-700">
              {isGeneratingTasks ? "Generating..." : `Generate ${Object.keys(taskAssignments).length} Tasks`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}