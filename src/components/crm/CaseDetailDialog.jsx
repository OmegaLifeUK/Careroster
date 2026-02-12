import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { Calendar, User, FileText, Shield, AlertTriangle } from "lucide-react";

export default function CaseDetailDialog({ case: caseData, onClose }) {
  const getStatusColor = (status) => {
    const colors = {
      pending_documentation: "bg-yellow-100 text-yellow-800",
      risk_screening: "bg-orange-100 text-orange-800",
      accepted_onboarding: "bg-blue-100 text-blue-800",
      active: "bg-green-100 text-green-800",
      review_due: "bg-purple-100 text-purple-800",
      closed: "bg-gray-100 text-gray-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl">{caseData.case_number}</DialogTitle>
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(caseData.status)}>
                {caseData.status?.replace(/_/g, ' ')}
              </Badge>
              {caseData.is_court_mandated && (
                <Badge className="bg-purple-100 text-purple-800">Court Mandated</Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="children">Children</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Case Information
                </h3>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Referral Type</p>
                    <p className="font-medium">{caseData.referral_type?.replace(/_/g, ' ')}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Legal Status</p>
                    <p className="font-medium">{caseData.legal_status?.toUpperCase()}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Risk Level</p>
                    <Badge className={
                      caseData.risk_level === 'critical' ? 'bg-red-100 text-red-800' :
                      caseData.risk_level === 'high' ? 'bg-orange-100 text-orange-800' :
                      caseData.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }>
                      {caseData.risk_level?.toUpperCase()}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-gray-600">Funding Authority</p>
                    <p className="font-medium">{caseData.funding_authority || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Assigned Practitioner</p>
                    <p className="font-medium">{caseData.assigned_practitioner_name || 'Unassigned'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Case Manager</p>
                    <p className="font-medium">{caseData.manager_name || 'Unassigned'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Referral Date</p>
                    <p className="font-medium">
                      {caseData.referral_date ? format(new Date(caseData.referral_date), 'MMM d, yyyy') : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Social Worker</p>
                    <p className="font-medium">{caseData.social_worker_name || 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {caseData.notes && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-2">Notes</h3>
                  <p className="text-sm text-gray-700">{caseData.notes}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="children">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-500 text-center py-8">
                  Child information will be displayed here
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-500 text-center py-8">
                  Document tracking will be displayed here
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sessions">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-500 text-center py-8">
                  Session history will be displayed here
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}