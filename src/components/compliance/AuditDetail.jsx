import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";

export default function AuditDetail({ audit, staff, onBack }) {
  const outcomeColors = {
    pass: "bg-green-100 text-green-800",
    fail: "bg-red-100 text-red-800",
    requires_improvement: "bg-yellow-100 text-yellow-800"
  };

  return (
    <div className="max-w-5xl mx-auto">
      <Button variant="outline" onClick={onBack} className="mb-4">
        ← Back to Audits
      </Button>
      
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Audit Report</CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                {audit.area_audited} - {audit.audit_date}
              </p>
            </div>
            <Badge className={outcomeColors[audit.outcome]}>
              {audit.outcome}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">Score</p>
                <p className="text-2xl font-bold text-blue-900">
                  {audit.percentage_score}%
                </p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-700">Compliant</p>
                <p className="text-2xl font-bold text-green-900">
                  {audit.responses?.filter(r => r.is_compliant).length || 0}
                </p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-red-700">Non-Compliant</p>
                <p className="text-2xl font-bold text-red-900">
                  {audit.responses?.filter(r => !r.is_compliant).length || 0}
                </p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-purple-700">Auditor</p>
                <p className="text-sm font-bold text-purple-900 truncate">
                  {staff.find(s => s.id === audit.auditor_staff_id)?.full_name || 'Unknown'}
                </p>
              </div>
            </div>

            {audit.findings && (
              <div>
                <h3 className="font-semibold mb-2">Findings</h3>
                <p className="text-gray-700 bg-gray-50 p-4 rounded">{audit.findings}</p>
              </div>
            )}

            {audit.non_compliances && audit.non_compliances.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  Non-Compliances
                </h3>
                <div className="space-y-2">
                  {audit.non_compliances.map((nc, idx) => (
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
                {audit.responses && audit.responses.map((resp, idx) => (
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
  );
}