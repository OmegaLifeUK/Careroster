import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText } from "lucide-react";
import AuditList from "@/components/compliance/AuditList";
import AuditDetail from "@/components/compliance/AuditDetail";
import PermissionGuard from "@/components/permissions/PermissionGuard";

export default function Audits() {
  const [view, setView] = useState("records"); // "records" or "templates"
  const [showDialog, setShowDialog] = useState(false);
  const [selectedAudit, setSelectedAudit] = useState(null);

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

  if (selectedAudit) {
    return (
      <div className="p-4 md:p-8">
        <AuditDetail 
          audit={selectedAudit}
          staff={staff}
          onBack={() => setSelectedAudit(null)}
        />
      </div>
    );
  }

  return (
    <PermissionGuard module="compliance" action="view_audits">
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
          <AuditList 
            audits={auditRecords}
            staff={staff}
            onSelect={setSelectedAudit}
          />
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
                  <Button className="w-full mt-4" size="sm">
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
    </PermissionGuard>
  );
}