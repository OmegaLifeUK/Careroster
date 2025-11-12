import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye, Trash2, AlertTriangle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useToast } from "@/components/ui/toast";

export default function RiskAssessmentManager({ client }) {
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: assessments = [], isLoading } = useQuery({
    queryKey: ['risk-assessments', client.id],
    queryFn: async () => {
      const all = await base44.entities.RiskAssessment.list('-assessment_date');
      return all.filter(a => a.client_id === client.id);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.RiskAssessment.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-assessments'] });
      toast.success("Deleted", "Risk assessment removed");
    },
  });

  const riskColors = {
    low: "bg-green-100 text-green-800",
    medium: "bg-yellow-100 text-yellow-800",
    high: "bg-orange-100 text-orange-800",
    critical: "bg-red-100 text-red-800",
  };

  if (selectedAssessment) {
    return (
      <div>
        <Button variant="outline" onClick={() => setSelectedAssessment(null)} className="mb-4">
          ← Back
        </Button>
        
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
                {selectedAssessment.assessment_type} Risk Assessment
              </h2>
              <Badge className={riskColors[selectedAssessment.risk_level]}>
                {selectedAssessment.risk_level} risk
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <p><strong>Assessed:</strong> {format(parseISO(selectedAssessment.assessment_date), 'PPP')}</p>
              <p><strong>By:</strong> {selectedAssessment.assessed_by}</p>
              <p><strong>Review Date:</strong> {format(parseISO(selectedAssessment.review_date), 'PPP')}</p>
              <p><strong>Status:</strong> {selectedAssessment.status}</p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Risk Identified</h3>
              <p className="text-gray-700 bg-gray-50 p-3 rounded">{selectedAssessment.risk_identified}</p>
            </div>

            {selectedAssessment.existing_controls && (
              <div>
                <h3 className="font-semibold mb-2">Existing Controls</h3>
                <div className="space-y-2">
                  {selectedAssessment.existing_controls.map((control, idx) => (
                    <div key={idx} className="bg-blue-50 p-3 rounded">
                      <p className="font-medium">{control.control_measure}</p>
                      <Badge className="mt-1" variant="outline">{control.effectiveness}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedAssessment.additional_controls && (
              <div>
                <h3 className="font-semibold mb-2">Additional Controls Required</h3>
                <div className="space-y-2">
                  {selectedAssessment.additional_controls.map((control, idx) => (
                    <div key={idx} className="bg-yellow-50 p-3 rounded">
                      <p className="font-medium">{control.action}</p>
                      <p className="text-sm text-gray-600">Responsible: {control.responsible_person}</p>
                      <p className="text-sm text-gray-600">Due: {format(parseISO(control.completion_date), 'MMM d, yyyy')}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Risk Assessments</h2>
        <Button size="sm" className="bg-orange-600 hover:bg-orange-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Assessment
        </Button>
      </div>

      {isLoading ? (
        <p>Loading...</p>
      ) : assessments.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No risk assessments</h3>
            <p className="text-gray-500">Create an assessment to manage risks</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {assessments.map(assessment => (
            <Card key={assessment.id} className="border-l-4 border-orange-500">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-5 h-5 text-orange-600" />
                      <h3 className="font-semibold">{assessment.assessment_type}</h3>
                      <Badge className={riskColors[assessment.risk_level]}>{assessment.risk_level}</Badge>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{assessment.risk_identified}</p>
                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                      <p><strong>Assessed:</strong> {format(parseISO(assessment.assessment_date), 'MMM d, yyyy')}</p>
                      <p><strong>Review:</strong> {format(parseISO(assessment.review_date), 'MMM d, yyyy')}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setSelectedAssessment(assessment)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => deleteMutation.mutate(assessment.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}