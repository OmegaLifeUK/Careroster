import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, Send, Shield, Star } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { format } from "date-fns";

export default function RegulatoryReportDialog({ logs, onClose }) {
  const [reportType, setReportType] = useState("CQC");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedReport, setGeneratedReport] = useState(null);
  const [sendToEmail, setSendToEmail] = useState("");

  const { toast } = useToast();

  const { data: orgProfile } = useQuery({
    queryKey: ['org-profile'],
    queryFn: async () => {
      const profiles = await base44.entities.OrganisationProfile.list();
      return profiles[0] || null;
    }
  });

  const generateReportMutation = useMutation({
    mutationFn: async () => {
      setIsGenerating(true);
      
      // Prepare data for AI analysis
      const complianceData = {
        organisation: orgProfile?.organisation_name || "Care Organisation",
        report_type: reportType,
        log_count: logs.length,
        compliance_events: logs.filter(l => l.event_category === 'compliance').length,
        safeguarding_events: logs.filter(l => l.event_category === 'safeguarding').length,
        critical_events: logs.filter(l => l.severity === 'critical').length,
        high_priority_events: logs.filter(l => l.severity === 'high').length,
        recent_logs: logs.slice(0, 50).map(l => ({
          date: l.log_date,
          type: l.event_type,
          category: l.event_category,
          action: l.action,
          severity: l.severity
        }))
      };

      // Call AI to generate mock inspection report
      const inspectorPrompt = reportType === "CQC" ? `
You are a CQC inspector conducting a mock inspection using the Single Assessment Framework (2024). 

The framework uses 5 key questions with Quality Statements (replacing previous KLOEs):
- SAFE: Are people protected from abuse and harm?
- EFFECTIVE: Do people's care, treatment and support achieve good outcomes?
- CARING: Are staff caring and compassionate?
- RESPONSIVE: Are services organised to meet people's needs?
- WELL-LED: Is there strong leadership and governance?

Quality Statements are "we statements" showing what providers should achieve.` : 
reportType === "Ofsted" ? `
You are an Ofsted inspector using the Social Care Common Inspection Framework (SCCIF).

Focus on:
- OVERALL EXPERIENCES AND PROGRESS OF CHILDREN
- HOW WELL CHILDREN ARE HELPED AND PROTECTED (limiting judgement)
- THE EFFECTIVENESS OF LEADERS AND MANAGERS (graded judgement)

Key areas: quality of care, safeguarding, leadership, stability, outcomes for children.` : 
`You are a CIW inspector conducting a mock inspection.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `${inspectorPrompt}

Organisation: ${complianceData.organisation}
Regulator: ${reportType}
Analysis Period: Last ${logs.length} audit log entries
Critical Events: ${complianceData.critical_events}
High Priority Events: ${complianceData.high_priority_events}
Compliance Events: ${complianceData.compliance_events}
Safeguarding Events: ${complianceData.safeguarding_events}

Recent Audit Log Evidence:
${JSON.stringify(complianceData.recent_logs, null, 2)}

Generate a comprehensive mock inspection report including:
1. Overall Rating (Outstanding/Good/Requires Improvement/Inadequate)
2. Domain Ratings (Safe, Effective, Caring, Responsive, Well-led) - use appropriate framework
3. Key Strengths (list 4-6 specific evidence-based strengths)
4. Areas for Improvement (list 4-6 with HIGH/MEDIUM/LOW priority and specific actionable recommendations)
5. Compliance Issues (reference specific regulations if identified)
6. Summary Report (detailed narrative covering key findings)
7. Numeric Score (0-100)

IMPORTANT: Base ratings on actual evidence from audit logs. Look for:
- Safeguarding responses and protective measures
- Staff training and competence
- Care planning and person-centred approach
- Medication management and clinical governance
- Leadership, policies, and quality assurance
- Incident management and learning
- Consent and mental capacity
- Documentation quality

Be realistic, evidence-based and constructive. Use specific examples from the logs.`,
        response_json_schema: {
          type: "object",
          properties: {
            overall_rating: { type: "string" },
            numeric_score: { type: "number" },
            safe_rating: { type: "string" },
            effective_rating: { type: "string" },
            caring_rating: { type: "string" },
            responsive_rating: { type: "string" },
            well_led_rating: { type: "string" },
            strengths: {
              type: "array",
              items: { type: "string" }
            },
            areas_for_improvement: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  area: { type: "string" },
                  priority: { type: "string" },
                  recommendation: { type: "string" }
                }
              }
            },
            compliance_issues: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  regulation: { type: "string" },
                  issue: { type: "string" },
                  severity: { type: "string" }
                }
              }
            },
            summary_report: { type: "string" }
          }
        }
      });

      setIsGenerating(false);
      return response;
    },
    onSuccess: (data) => {
      setGeneratedReport(data);
      toast.success("Success", "Inspection report generated");
    },
    onError: (error) => {
      setIsGenerating(false);
      toast.error("Error", "Failed to generate report");
      console.error(error);
    }
  });

  const saveMockInspection = async () => {
    if (!generatedReport) return;

    try {
      // Create mock inspection
      const inspection = await base44.entities.MockInspection.create({
        inspection_type: reportType,
        inspection_date: format(new Date(), 'yyyy-MM-dd'),
        inspector_name: "AI Mock Inspector",
        safe_rating: generatedReport.safe_rating,
        effective_rating: generatedReport.effective_rating,
        caring_rating: generatedReport.caring_rating,
        responsive_rating: generatedReport.responsive_rating,
        well_led_rating: generatedReport.well_led_rating,
        overall_rating: generatedReport.overall_rating,
        strengths: generatedReport.strengths,
        areas_for_improvement: generatedReport.areas_for_improvement,
        compliance_issues: generatedReport.compliance_issues,
        summary_report: generatedReport.summary_report,
        status: 'action_plan_pending'
      });

      // Auto-generate action plan from areas for improvement and compliance issues
      const allIssues = [
        ...generatedReport.areas_for_improvement.map(a => ({
          action: a.area,
          recommendation: a.recommendation,
          priority: a.priority.toLowerCase(),
          category: 'quality'
        })),
        ...generatedReport.compliance_issues.map(c => ({
          action: `${c.regulation}: ${c.issue}`,
          recommendation: 'Ensure immediate compliance',
          priority: c.severity === 'critical' ? 'critical' : c.severity === 'high' ? 'high' : 'medium',
          category: 'regulatory'
        }))
      ];

      if (allIssues.length > 0) {
        // Calculate target date based on priority
        const getTargetDate = (priority) => {
          const today = new Date();
          const daysToAdd = priority === 'critical' ? 7 : priority === 'high' ? 30 : priority === 'medium' ? 60 : 90;
          const targetDate = new Date(today);
          targetDate.setDate(targetDate.getDate() + daysToAdd);
          return format(targetDate, 'yyyy-MM-dd');
        };

        const actionPlan = await base44.entities.ActionPlan.create({
          title: `${reportType} Mock Inspection Action Plan - ${format(new Date(), 'dd/MM/yyyy')}`,
          description: `Action plan generated from mock inspection findings. Overall rating: ${generatedReport.overall_rating}`,
          category: 'regulatory',
          priority: allIssues.some(i => i.priority === 'critical') ? 'critical' : 'high',
          status: 'active',
          target_completion_date: getTargetDate('high'),
          related_entity_type: 'inspection',
          related_entity_id: inspection.id,
          actions: allIssues.map((issue, idx) => ({
            action: issue.action,
            responsible_person: 'Service Manager',
            target_date: getTargetDate(issue.priority),
            status: 'pending',
            notes: issue.recommendation
          })),
          progress_percentage: 0
        });

        // Update inspection with action plan ID
        await base44.entities.MockInspection.update(inspection.id, {
          action_plan_id: actionPlan.id
        });

        toast.success("Success", "Mock inspection and action plan created");
      } else {
        toast.success("Success", "Mock inspection saved");
      }
    } catch (error) {
      toast.error("Error", "Failed to save inspection");
      console.error(error);
    }
  };

  const sendReportEmail = async () => {
    if (!sendToEmail || !generatedReport) return;

    try {
      const emailBody = `
${reportType} Mock Inspection Report
Organisation: ${orgProfile?.organisation_name || "Care Organisation"}
Date: ${format(new Date(), 'dd MMMM yyyy')}

OVERALL RATING: ${generatedReport.overall_rating.toUpperCase()}
Score: ${generatedReport.numeric_score}/100

DOMAIN RATINGS:
- Safe: ${generatedReport.safe_rating}
- Effective: ${generatedReport.effective_rating}
- Caring: ${generatedReport.caring_rating}
- Responsive: ${generatedReport.responsive_rating}
- Well-led: ${generatedReport.well_led_rating}

STRENGTHS:
${generatedReport.strengths.map((s, i) => `${i + 1}. ${s}`).join('\n')}

AREAS FOR IMPROVEMENT:
${generatedReport.areas_for_improvement.map((a, i) => `${i + 1}. [${a.priority}] ${a.area}\n   ${a.recommendation}`).join('\n\n')}

${generatedReport.compliance_issues.length > 0 ? `
COMPLIANCE ISSUES:
${generatedReport.compliance_issues.map((c, i) => `${i + 1}. ${c.regulation}: ${c.issue} (${c.severity})`).join('\n')}
` : ''}

SUMMARY REPORT:
${generatedReport.summary_report}

---
This is a mock inspection report generated for internal quality assurance purposes.
      `;

      await base44.integrations.Core.SendEmail({
        to: sendToEmail,
        subject: `${reportType} Mock Inspection Report - ${format(new Date(), 'dd/MM/yyyy')}`,
        body: emailBody
      });

      toast.success("Success", "Report sent via email");
      setSendToEmail("");
    } catch (error) {
      toast.error("Error", "Failed to send email");
    }
  };

  const ratingColors = {
    outstanding: "bg-green-600 text-white",
    good: "bg-blue-500 text-white",
    requires_improvement: "bg-yellow-500 text-white",
    inadequate: "bg-red-600 text-white"
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-600" />
            Generate {reportType} Mock Inspection Report
          </DialogTitle>
        </DialogHeader>

        {!generatedReport ? (
          <div className="space-y-4 py-4">
            <div>
              <Label>Regulatory Body</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CQC">CQC (Care Quality Commission)</SelectItem>
                  <SelectItem value="Ofsted">Ofsted</SelectItem>
                  <SelectItem value="CIW">CIW (Care Inspectorate Wales)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-700">
                This will analyze your audit log data ({logs.length} entries) and generate a comprehensive 
                mock inspection report with ratings, strengths, areas for improvement, and compliance findings.
              </p>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => generateReportMutation.mutate()}
                disabled={isGenerating}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating Report...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Generate Report
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Overall Rating */}
            <div className="text-center p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
              <Badge className={`${ratingColors[generatedReport.overall_rating]} text-lg px-4 py-2 mb-2`}>
                Overall Rating: {generatedReport.overall_rating}
              </Badge>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {generatedReport.numeric_score}/100
              </p>
            </div>

            {/* Domain Ratings */}
            {reportType === "CQC" && (
              <div>
                <h3 className="font-semibold mb-3">Domain Ratings</h3>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { label: "Safe", rating: generatedReport.safe_rating },
                    { label: "Effective", rating: generatedReport.effective_rating },
                    { label: "Caring", rating: generatedReport.caring_rating },
                    { label: "Responsive", rating: generatedReport.responsive_rating },
                    { label: "Well-led", rating: generatedReport.well_led_rating }
                  ].map(domain => (
                    <div key={domain.label} className="text-center p-3 border rounded">
                      <p className="text-xs text-gray-600 mb-1">{domain.label}</p>
                      <Badge className={ratingColors[domain.rating]}>
                        {domain.rating}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Strengths */}
            <div>
              <h3 className="font-semibold mb-3 text-green-700 flex items-center gap-2">
                <Star className="w-5 h-5" />
                Strengths
              </h3>
              <ul className="space-y-2">
                {generatedReport.strengths.map((strength, idx) => (
                  <li key={idx} className="flex items-start gap-2 p-3 bg-green-50 rounded">
                    <Star className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{strength}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Areas for Improvement */}
            {generatedReport.areas_for_improvement.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 text-orange-700">Areas for Improvement</h3>
                <div className="space-y-3">
                  {generatedReport.areas_for_improvement.map((area, idx) => (
                    <div key={idx} className="p-4 border-l-4 border-orange-500 bg-orange-50 rounded">
                      <div className="flex items-start justify-between mb-2">
                        <p className="font-medium">{area.area}</p>
                        <Badge className="bg-orange-200 text-orange-900">{area.priority}</Badge>
                      </div>
                      <p className="text-sm text-gray-700">{area.recommendation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Compliance Issues */}
            {generatedReport.compliance_issues.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 text-red-700">Compliance Issues</h3>
                <div className="space-y-3">
                  {generatedReport.compliance_issues.map((issue, idx) => (
                    <div key={idx} className="p-4 border-l-4 border-red-500 bg-red-50 rounded">
                      <div className="flex items-start justify-between mb-2">
                        <p className="font-medium">Regulation: {issue.regulation}</p>
                        <Badge className="bg-red-600 text-white">{issue.severity}</Badge>
                      </div>
                      <p className="text-sm text-gray-700">{issue.issue}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Summary Report */}
            <div>
              <h3 className="font-semibold mb-3">Summary Report</h3>
              <div className="bg-gray-50 p-4 rounded border">
                <p className="text-gray-700 whitespace-pre-wrap text-sm">{generatedReport.summary_report}</p>
              </div>
            </div>

            {/* Send Email */}
            <div>
              <Label>Send Report to Email (Optional)</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="email"
                  placeholder="regulator@cqc.org.uk"
                  value={sendToEmail}
                  onChange={(e) => setSendToEmail(e.target.value)}
                />
                <Button
                  onClick={sendReportEmail}
                  disabled={!sendToEmail}
                  variant="outline"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send
                </Button>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {!generatedReport ? (
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button
                onClick={saveMockInspection}
                className="bg-green-600 hover:bg-green-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Save to Mock Inspections
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}