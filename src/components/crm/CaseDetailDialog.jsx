import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { FileText, Shield, Archive } from "lucide-react";
import TherapeuticProgressTracker from "./TherapeuticProgressTracker";
import RiskScreeningForm from "./RiskScreeningForm";
import CaseClosureForm from "./CaseClosureForm";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function CaseDetailDialog({ case: caseData, onClose }) {
  const [showRiskForm, setShowRiskForm] = useState(false);
  const [showClosureForm, setShowClosureForm] = useState(false);

  const { data: riskAssessments = [] } = useQuery({
    queryKey: ['case-risk-assessments', caseData.id],
    queryFn: () => base44.entities.CaseRiskAssessment.filter({ case_id: caseData.id }),
  });

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
          <TabsList className="grid grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
            <TabsTrigger value="risk">Risk</TabsTrigger>
            <TabsTrigger value="children">Children</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="closure">Closure</TabsTrigger>
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

          <TabsContent value="progress">
            <TherapeuticProgressTracker caseId={caseData.id} />
          </TabsContent>

          <TabsContent value="risk" className="space-y-4">
            {!showRiskForm ? (
              <>
                <div className="flex justify-end mb-4">
                  <Button onClick={() => setShowRiskForm(true)} className="bg-orange-600 hover:bg-orange-700">
                    <Shield className="w-4 h-4 mr-2" />
                    New Risk Assessment
                  </Button>
                </div>
                
                <Card>
                  <CardContent className="p-4 space-y-4">
                    <h3 className="font-semibold">Risk Assessment History</h3>
                    
                    {riskAssessments.map((assessment) => (
                      <div key={assessment.id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <Badge className={
                              assessment.risk_level === 'critical' ? 'bg-red-100 text-red-800' :
                              assessment.risk_level === 'high' ? 'bg-orange-100 text-orange-800' :
                              assessment.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }>
                              {assessment.risk_level?.toUpperCase()}
                            </Badge>
                            <p className="font-medium mt-2">{assessment.risk_category?.replace(/_/g, ' ')}</p>
                          </div>
                          {assessment.audit_locked && (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Shield className="w-3 h-3" />
                              Audit Locked
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 mt-2">{assessment.risk_description}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          Assessed by {assessment.assessed_by} on {format(new Date(assessment.assessment_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                    ))}

                    {riskAssessments.length === 0 && (
                      <p className="text-center text-gray-500 py-8">No risk assessments completed yet</p>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <RiskScreeningForm caseId={caseData.id} onComplete={() => setShowRiskForm(false)} />
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

          <TabsContent value="closure" className="space-y-4">
            {caseData.status === 'closed' ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <Archive className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                  <h3 className="font-semibold text-lg mb-2">Case Closed</h3>
                  <p className="text-sm text-gray-600">
                    This case was closed on {caseData.closure_date ? format(new Date(caseData.closure_date), 'MMM d, yyyy') : 'N/A'}
                  </p>
                </CardContent>
              </Card>
            ) : !showClosureForm ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <Archive className="w-12 h-12 text-purple-600 mx-auto mb-3" />
                  <h3 className="font-semibold text-lg mb-2">Close Case</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Complete mandatory closure requirements and apply data retention policy
                  </p>
                  <Button onClick={() => setShowClosureForm(true)} className="bg-purple-600 hover:bg-purple-700">
                    <Archive className="w-4 h-4 mr-2" />
                    Begin Case Closure
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <CaseClosureForm 
                caseData={caseData}
                onClose={() => {
                  setShowClosureForm(false);
                  onClose();
                }} 
              />
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}