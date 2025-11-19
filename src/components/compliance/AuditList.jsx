import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, Calendar } from "lucide-react";

export default function AuditList({ audits, staff, onSelect }) {
  const outcomeColors = {
    pass: "bg-green-100 text-green-800",
    fail: "bg-red-100 text-red-800",
    requires_improvement: "bg-yellow-100 text-yellow-800"
  };

  if (audits.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <ClipboardCheck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">No audit records yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {audits.map(audit => (
        <Card 
          key={audit.id} 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => onSelect(audit)}
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
      ))}
    </div>
  );
}