import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye, Edit, Trash2, Calendar, Heart } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useToast } from "@/components/ui/toast";

export default function CarePlanManager({ client }) {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: carePlans = [], isLoading } = useQuery({
    queryKey: ['care-plans', client.id],
    queryFn: async () => {
      const plans = await base44.entities.CarePlan.list('-assessment_date');
      return plans.filter(p => p.client_id === client.id);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CarePlan.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['care-plans'] });
      toast.success("Deleted", "Care plan removed");
    },
  });

  const statusColors = {
    draft: "bg-gray-100 text-gray-800",
    active: "bg-green-100 text-green-800",
    under_review: "bg-yellow-100 text-yellow-800",
    archived: "bg-red-100 text-red-800",
  };

  if (selectedPlan) {
    return (
      <div>
        <Button variant="outline" onClick={() => setSelectedPlan(null)} className="mb-4">
          ← Back to Care Plans
        </Button>
        
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="w-6 h-6 text-blue-600" />
                  Care Plan - {selectedPlan.plan_type}
                </CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  Assessed on {format(parseISO(selectedPlan.assessment_date), 'PPP')}
                </p>
              </div>
              <Badge className={statusColors[selectedPlan.status]}>
                {selectedPlan.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold mb-2">Assessment Details</h3>
                <p className="text-sm"><strong>Care Setting:</strong> {selectedPlan.care_setting}</p>
                <p className="text-sm"><strong>Assessed By:</strong> {selectedPlan.assessed_by}</p>
                <p className="text-sm"><strong>Next Review:</strong> {format(parseISO(selectedPlan.review_date), 'PPP')}</p>
              </div>

              {selectedPlan.personal_details && (
                <div>
                  <h3 className="font-semibold mb-2">Personal Details</h3>
                  <p className="text-sm"><strong>Preferred Name:</strong> {selectedPlan.personal_details.preferred_name}</p>
                  <p className="text-sm"><strong>Language:</strong> {selectedPlan.personal_details.language}</p>
                  <p className="text-sm"><strong>Religion:</strong> {selectedPlan.personal_details.religion}</p>
                </div>
              )}
            </div>

            {selectedPlan.physical_health && (
              <div>
                <h3 className="font-semibold mb-2">Physical Health</h3>
                <div className="bg-gray-50 p-4 rounded space-y-2">
                  <p className="text-sm"><strong>Mobility:</strong> {selectedPlan.physical_health.mobility}</p>
                  <p className="text-sm"><strong>Continence:</strong> {selectedPlan.physical_health.continence}</p>
                  {selectedPlan.physical_health.medical_conditions && (
                    <div>
                      <p className="text-sm font-semibold">Medical Conditions:</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedPlan.physical_health.medical_conditions.map((condition, idx) => (
                          <Badge key={idx} variant="outline">{condition}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedPlan.care_needs && selectedPlan.care_needs.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Care Needs</h3>
                <div className="space-y-3">
                  {selectedPlan.care_needs.map((need, idx) => (
                    <Card key={idx} className="bg-blue-50">
                      <CardContent className="p-4">
                        <p className="font-medium">{need.category}</p>
                        <p className="text-sm text-gray-700 mt-1">{need.need}</p>
                        <p className="text-sm text-gray-600 mt-1"><strong>Support:</strong> {need.support_required}</p>
                        <p className="text-sm text-gray-600"><strong>Frequency:</strong> {need.frequency}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {selectedPlan.goals && selectedPlan.goals.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Goals</h3>
                <div className="space-y-2">
                  {selectedPlan.goals.map((goal, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-3 bg-gray-50 rounded">
                      <Badge className={goal.progress === 'achieved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                        {goal.progress}
                      </Badge>
                      <span className="flex-1">{goal.goal}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedPlan.daily_routine && (
              <div>
                <h3 className="font-semibold mb-2">Daily Routine</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(selectedPlan.daily_routine).map(([time, routine]) => (
                    <div key={time} className="p-3 bg-gray-50 rounded">
                      <p className="font-medium capitalize text-sm">{time}</p>
                      <p className="text-sm text-gray-700">{routine}</p>
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
        <h2 className="text-xl font-bold">Care Plans</h2>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Care Plan
        </Button>
      </div>

      {isLoading ? (
        <p>Loading...</p>
      ) : carePlans.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Heart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No care plans</h3>
            <p className="text-gray-500">Create a care plan to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {carePlans.map(plan => (
            <Card key={plan.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Heart className="w-5 h-5 text-blue-600" />
                      <h3 className="font-semibold">Care Plan - {plan.plan_type}</h3>
                      <Badge className={statusColors[plan.status]}>{plan.status}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                      <p><strong>Setting:</strong> {plan.care_setting}</p>
                      <p><strong>Assessed:</strong> {format(parseISO(plan.assessment_date), 'MMM d, yyyy')}</p>
                      <p><strong>By:</strong> {plan.assessed_by}</p>
                      <p><strong>Review:</strong> {format(parseISO(plan.review_date), 'MMM d, yyyy')}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setSelectedPlan(plan)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => deleteMutation.mutate(plan.id)}
                      className="text-red-600 hover:text-red-700"
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