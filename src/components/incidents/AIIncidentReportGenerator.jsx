import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, FileText, AlertCircle, CheckCircle, Users, Clock } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export default function AIIncidentReportGenerator({ incident }) {
  const [report, setReport] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreatingTasks, setIsCreatingTasks] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: existingReports = [] } = useQuery({
    queryKey: ['incident-reports', incident.id],
    queryFn: async () => {
      const data = await base44.entities.IncidentReport.filter({ incident_id: incident.id });
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

  const generateReport = async () => {
    setIsGenerating(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this incident and generate a comprehensive incident report.

Incident Details:
- Type: ${incident.incident_type}
- Severity: ${incident.severity}
- Date: ${incident.incident_date}
- Description: ${incident.description}
- Immediate Actions: ${incident.immediate_actions || 'None recorded'}
- People Involved: ${incident.people_involved?.length || 0}

Generate a detailed report with:
1. Root cause analysis (primary cause, contributing factors, analysis summary)
2. Impact assessment (severity level, affected parties, potential consequences, regulatory implications)
3. Preventive measures (each with priority, timeframe, and responsible role)

Be thorough and professional.`,
        response_json_schema: {
          type: "object",
          properties: {
            root_cause_analysis: {
              type: "object",
              properties: {
                primary_cause: { type: "string" },
                contributing_factors: {
                  type: "array",
                  items: { type: "string" }
                },
                analysis_summary: { type: "string" }
              }
            },
            impact_assessment: {
              type: "object",
              properties: {
                severity_level: { type: "string" },
                affected_parties: {
                  type: "array",
                  items: { type: "string" }
                },
                potential_consequences: { type: "string" },
                regulatory_implications: { type: "string" }
              }
            },
            preventive_measures: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  measure: { type: "string" },
                  priority: { type: "string" },
                  timeframe: { type: "string" },
                  responsible_role: { type: "string" }
                }
              }
            }
          }
        }
      });

      const savedReport = await base44.entities.IncidentReport.create({
        incident_id: incident.id,
        report_type: 'ai_generated',
        root_cause_analysis: result.root_cause_analysis,
        impact_assessment: result.impact_assessment,
        preventive_measures: result.preventive_measures,
        generated_at: new Date().toISOString(),
        generated_by: 'AI System'
      });

      setReport(savedReport);
      queryClient.invalidateQueries({ queryKey: ['incident-reports'] });
      toast.success("Success", "Incident report generated");
    } catch (error) {
      console.error("Report generation error:", error);
      toast.error("Error", "Failed to generate report");
    } finally {
      setIsGenerating(false);
    }
  };

  const createTasksFromReport = async (reportData) => {
    setIsCreatingTasks(true);
    try {
      const tasksToCreate = [];
      const taskIds = [];

      reportData.preventive_measures?.forEach((measure, index) => {
        const daysMap = {
          'immediate': 2,
          'short-term': 7,
          'medium-term': 30,
          'long-term': 90
        };
        
        const days = daysMap[measure.timeframe?.toLowerCase()] || 14;
        const dueDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        tasksToCreate.push({
          title: `${measure.measure.substring(0, 80)}`,
          description: `Preventive measure from incident report\n\nResponsible Role: ${measure.responsible_role}\nTimeframe: ${measure.timeframe}`,
          source_type: 'incident_ai',
          source_entity_id: incident.id,
          priority: measure.priority?.toLowerCase() || 'medium',
          status: 'pending',
          due_date: dueDate,
          assigned_to_staff_id: staff[0]?.id || null,
          assigned_by: 'AI Report Generator'
        });
      });

      if (tasksToCreate.length > 0) {
        const createdTasks = await base44.entities.ComplianceTask.bulkCreate(tasksToCreate);
        
        if (Array.isArray(createdTasks)) {
          createdTasks.forEach(task => taskIds.push(task.id));
        }

        await base44.entities.IncidentReport.update(reportData.id, {
          tasks_created: taskIds
        });

        queryClient.invalidateQueries({ queryKey: ['compliance-tasks'] });
        toast.success("Success", `Created ${tasksToCreate.length} follow-up tasks`);
      }
    } catch (error) {
      console.error("Task creation error:", error);
      toast.error("Error", "Failed to create tasks");
    } finally {
      setIsCreatingTasks(false);
    }
  };

  const latestReport = existingReports[0] || report;

  const priorityColors = {
    low: "bg-blue-100 text-blue-800",
    medium: "bg-yellow-100 text-yellow-800",
    high: "bg-orange-100 text-orange-800",
    urgent: "bg-red-100 text-red-800",
    critical: "bg-red-100 text-red-800"
  };

  return (
    <Card>
      <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-blue-50">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            AI Incident Report
          </CardTitle>
          {!latestReport && (
            <Button
              onClick={generateReport}
              disabled={isGenerating}
              className="bg-gradient-to-r from-purple-600 to-blue-600"
            >
              {isGenerating ? "Generating..." : "Generate Report"}
            </Button>
          )}
          {latestReport && !latestReport.tasks_created?.length && (
            <Button
              onClick={() => createTasksFromReport(latestReport)}
              disabled={isCreatingTasks}
              variant="outline"
              className="border-purple-600 text-purple-600"
            >
              {isCreatingTasks ? "Creating..." : "Create Follow-Up Tasks"}
            </Button>
          )}
        </div>
      </CardHeader>

      {latestReport && (
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* Root Cause Analysis */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <h3 className="font-semibold text-lg">Root Cause Analysis</h3>
              </div>
              <div className="bg-red-50 p-4 rounded-lg space-y-3">
                <div>
                  <p className="text-sm font-medium text-red-900 mb-1">Primary Cause</p>
                  <p className="text-red-800">{latestReport.root_cause_analysis?.primary_cause}</p>
                </div>
                {latestReport.root_cause_analysis?.contributing_factors?.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-red-900 mb-2">Contributing Factors</p>
                    <ul className="list-disc list-inside space-y-1">
                      {latestReport.root_cause_analysis.contributing_factors.map((factor, idx) => (
                        <li key={idx} className="text-red-800 text-sm">{factor}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-red-900 mb-1">Analysis Summary</p>
                  <p className="text-red-800 text-sm">{latestReport.root_cause_analysis?.analysis_summary}</p>
                </div>
              </div>
            </div>

            {/* Impact Assessment */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-5 h-5 text-orange-600" />
                <h3 className="font-semibold text-lg">Impact Assessment</h3>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-orange-900">Severity Level:</p>
                  <Badge className={priorityColors[latestReport.impact_assessment?.severity_level] || priorityColors.medium}>
                    {latestReport.impact_assessment?.severity_level}
                  </Badge>
                </div>
                {latestReport.impact_assessment?.affected_parties?.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-orange-900 mb-2">Affected Parties</p>
                    <div className="flex flex-wrap gap-2">
                      {latestReport.impact_assessment.affected_parties.map((party, idx) => (
                        <Badge key={idx} variant="outline" className="bg-white">
                          <Users className="w-3 h-3 mr-1" />
                          {party}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-orange-900 mb-1">Potential Consequences</p>
                  <p className="text-orange-800 text-sm">{latestReport.impact_assessment?.potential_consequences}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-orange-900 mb-1">Regulatory Implications</p>
                  <p className="text-orange-800 text-sm">{latestReport.impact_assessment?.regulatory_implications}</p>
                </div>
              </div>
            </div>

            {/* Preventive Measures */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h3 className="font-semibold text-lg">Preventive Measures</h3>
              </div>
              <div className="space-y-3">
                {latestReport.preventive_measures?.map((measure, idx) => (
                  <div key={idx} className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-medium text-green-900">{measure.measure}</p>
                      <Badge className={priorityColors[measure.priority] || priorityColors.medium}>
                        {measure.priority}
                      </Badge>
                    </div>
                    <div className="flex gap-4 text-sm text-green-800">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{measure.timeframe}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>{measure.responsible_role}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {latestReport.tasks_created?.length > 0 && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                  <p className="font-medium text-blue-900">Follow-Up Tasks Created</p>
                </div>
                <p className="text-sm text-blue-800">
                  {latestReport.tasks_created.length} compliance tasks have been created and assigned to staff members.
                  View them in the Compliance Task Center.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}