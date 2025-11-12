import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye, Trash2, Brain } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useToast } from "@/components/ui/toast";

export default function MentalCapacityManager({ client }) {
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: assessments = [], isLoading } = useQuery({
    queryKey: ['mental-capacity', client.id],
    queryFn: async () => {
      const all = await base44.entities.MentalCapacityAssessment.list('-assessment_date');
      return all.filter(a => a.client_id === client.id);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.MentalCapacityAssessment.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mental-capacity'] });
      toast.success("Deleted", "Assessment removed");
    },
  });

  const conclusionColors = {
    has_capacity: "bg-green-100 text-green-800",
    lacks_capacity: "bg-red-100 text-red-800",
    fluctuating_capacity: "bg-yellow-100 text-yellow-800",
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
                <Brain className="w-6 h-6 text-pink-600" />
                Mental Capacity Assessment
              </h2>
              <Badge className={conclusionColors[selectedAssessment.conclusion]}>
                {selectedAssessment.conclusion?.replace('_', ' ')}
              </Badge>
            </div>

            <div className="bg-pink-50 p-4 rounded">
              <p className="font-semibold mb-2">Specific Decision</p>
              <p className="text-gray-700">{selectedAssessment.specific_decision}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <p><strong>Assessed:</strong> {format(parseISO(selectedAssessment.assessment_date), 'PPP')}</p>
              <p><strong>Assessor:</strong> {selectedAssessment.assessor}</p>
            </div>

            {selectedAssessment.functional_test && (
              <div>
                <h3 className="font-semibold mb-2">Functional Test</h3>
                <div className="space-y-2">
                  {selectedAssessment.functional_test.understand_information && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <span>Understand Information</span>
                      <Badge className={selectedAssessment.functional_test.understand_information.able ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {selectedAssessment.functional_test.understand_information.able ? 'Able' : 'Unable'}
                      </Badge>
                    </div>
                  )}
                  {selectedAssessment.functional_test.retain_information && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <span>Retain Information</span>
                      <Badge className={selectedAssessment.functional_test.retain_information.able ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {selectedAssessment.functional_test.retain_information.able ? 'Able' : 'Unable'}
                      </Badge>
                    </div>
                  )}
                  {selectedAssessment.functional_test.weigh_information && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <span>Weigh Information</span>
                      <Badge className={selectedAssessment.functional_test.weigh_information.able ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {selectedAssessment.functional_test.weigh_information.able ? 'Able' : 'Unable'}
                      </Badge>
                    </div>
                  )}
                  {selectedAssessment.functional_test.communicate_decision && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <span>Communicate Decision</span>
                      <Badge className={selectedAssessment.functional_test.communicate_decision.able ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {selectedAssessment.functional_test.communicate_decision.able ? 'Able' : 'Unable'}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedAssessment.reasons_for_conclusion && (
              <div className="bg-gray-50 p-4 rounded">
                <h3 className="font-semibold mb-2">Reasons for Conclusion</h3>
                <p className="text-sm">{selectedAssessment.reasons_for_conclusion}</p>
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
        <h2 className="text-xl font-bold">Mental Capacity Assessments</h2>
        <Button size="sm" className="bg-pink-600 hover:bg-pink-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Assessment
        </Button>
      </div>

      {isLoading ? (
        <p>Loading...</p>
      ) : assessments.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Brain className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No assessments</h3>
            <p className="text-gray-500">Create a mental capacity assessment</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {assessments.map(assessment => (
            <Card key={assessment.id} className="border-l-4 border-pink-500">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="w-5 h-5 text-pink-600" />
                      <h3 className="font-semibold">{assessment.specific_decision}</h3>
                      <Badge className={conclusionColors[assessment.conclusion]}>
                        {assessment.conclusion?.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">{format(parseISO(assessment.assessment_date), 'MMM d, yyyy')}</p>
                    <p className="text-sm text-gray-600">Assessor: {assessment.assessor}</p>
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