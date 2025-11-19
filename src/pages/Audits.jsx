import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardCheck, Plus, FileText, Calendar, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { format } from "date-fns";

export default function Audits() {
  const [view, setView] = useState("records"); // "records" or "templates"
  const [showDialog, setShowDialog] = useState(false);
  const [selectedAudit, setSelectedAudit] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: auditRecords = [] } = useQuery({
    queryKey: ['audit-records'],
    queryFn: async () => {
      const data = await base44.entities.AuditRecord.list('-audit_date');
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['audit-templates'],
    queryFn: async () => {
      const data = await base44.entities.AuditTemplate.list();
      return Array.isArray(data) ? data.filter(t => t.is_active) : [];
    },
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const data = await base44.entities.Staff.list();
      return Array.isArray(data) ? data : [];
    },
  });

  const startAudit = (template) => {
    setSelectedTemplate(template);
    setShowDialog(true);
  };

  const outcomeColors = {
    pass: "bg-green-100 text-green-800",
    fail: "bg-red-100 text-red-800",
    requires_improvement: "bg-yellow-100 text-yellow-800"
  };

  if (selectedAudit) {
    return (
      <div className="p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          <Button variant="outline" onClick={() => setSelectedAudit(null)} className="mb-4">
            ← Back to Audits
          </Button>
          
          <Card>
            <CardHeader className="border-b">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>Audit Report</CardTitle>
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedAudit.area_audited} - {selectedAudit.audit_date}
                  </p>
                </div>
                <Badge className={outcomeColors[selectedAudit.outcome]}>
                  {selectedAudit.outcome}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-700">Score</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {selectedAudit.percentage_score}%
                    </p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-700">Compliant</p>
                    <p className="text-2xl font-bold text-green-900">
                      {selectedAudit.responses?.filter(r => r.is_compliant).length || 0}
                    </p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg">
                    <p className="text-sm text-red-700">Non-Compliant</p>
                    <p className="text-2xl font-bold text-red-900">
                      {selectedAudit.responses?.filter(r => !r.is_compliant).length || 0}
                    </p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <p className="text-sm text-purple-700">Auditor</p>
                    <p className="text-sm font-bold text-purple-900 truncate">
                      {staff.find(s => s.id === selectedAudit.auditor_staff_id)?.full_name || 'Unknown'}
                    </p>
                  </div>
                </div>

                {selectedAudit.findings && (
                  <div>
                    <h3 className="font-semibold mb-2">Findings</h3>
                    <p className="text-gray-700 bg-gray-50 p-4 rounded">{selectedAudit.findings}</p>
                  </div>
                )}

                {selectedAudit.non_compliances && selectedAudit.non_compliances.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      Non-Compliances
                    </h3>
                    <div className="space-y-2">
                      {selectedAudit.non_compliances.map((nc, idx) => (
                        <div key={idx} className="p-3 border-l-4 border-red-500 bg-red-50 rounded">
                          <div className="flex items-start justify-between">
                            <p className="font-medium">{nc.item}</p>
                            <Badge className="bg-red-200 text-red-900">{nc.severity}</Badge>
                          </div>
                          <p className="text-sm text-gray-700 mt-1">{nc.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="font-semibold mb-3">Detailed Responses</h3>
                  <div className="space-y-3">
                    {selectedAudit.responses && selectedAudit.responses.map((resp, idx) => (
                      <div key={idx} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium">{resp.section}</p>
                            <p className="text-sm text-gray-600">{resp.item}</p>
                          </div>
                          {resp.is_compliant ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600" />
                          )}
                        </div>
                        <p className="text-sm"><strong>Response:</strong> {resp.response}</p>
                        {resp.notes && (
                          <p className="text-sm text-gray-600 mt-1"><strong>Notes:</strong> {resp.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Audits</h1>
            <p className="text-gray-500">Manage audit templates and records</p>
          </div>
        </div>

        <div className="flex gap-3 mb-6">
          <Button
            variant={view === "records" ? "default" : "outline"}
            onClick={() => setView("records")}
          >
            Audit Records ({auditRecords.length})
          </Button>
          <Button
            variant={view === "templates" ? "default" : "outline"}
            onClick={() => setView("templates")}
          >
            Templates ({templates.length})
          </Button>
        </div>

        {view === "records" ? (
          <div className="space-y-4">
            {auditRecords.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <ClipboardCheck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500">No audit records yet</p>
                </CardContent>
              </Card>
            ) : (
              auditRecords.map(audit => (
                <Card 
                  key={audit.id} 
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setSelectedAudit(audit)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{audit.area_audited}</h3>
                          <Badge className={outcomeColors[audit.outcome]}>
                            {audit.outcome}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {audit.audit_date}
                          </div>
                          <div>
                            Score: <strong>{audit.percentage_score}%</strong>
                          </div>
                          <div>
                            Auditor: {staff.find(s => s.id === audit.auditor_staff_id)?.full_name || 'Unknown'}
                          </div>
                          <div>
                            Status: <Badge variant="outline">{audit.status}</Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map(template => (
              <Card key={template.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <FileText className="w-8 h-8 text-blue-600" />
                    <Badge>{template.audit_type}</Badge>
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{template.template_name}</h3>
                  <p className="text-sm text-gray-600 mb-4">{template.description}</p>
                  <div className="flex gap-2">
                    <Badge variant="outline">{template.category}</Badge>
                    {template.language === "welsh" && (
                      <Badge className="bg-red-100 text-red-800">Cymraeg</Badge>
                    )}
                  </div>
                  <Button 
                    onClick={() => startAudit(template)}
                    className="w-full mt-4"
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Start Audit
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}