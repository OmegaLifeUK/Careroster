import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Clock, AlertTriangle, TrendingUp } from "lucide-react";
import ActionPlanTracker from "@/components/actionplan/ActionPlanTracker";

export default function ActionPlanProgress() {
  const [selectedPlan, setSelectedPlan] = useState(null);

  const { data: actionPlans = [] } = useQuery({
    queryKey: ['action-plans'],
    queryFn: async () => {
      const data = await base44.entities.ActionPlan.list('-created_date');
      return Array.isArray(data) ? data : [];
    },
  });

  const priorityColors = {
    low: "bg-blue-100 text-blue-800",
    medium: "bg-yellow-100 text-yellow-800",
    high: "bg-orange-100 text-orange-800",
    critical: "bg-red-100 text-red-800"
  };

  const statusColors = {
    draft: "bg-gray-100 text-gray-800",
    active: "bg-blue-100 text-blue-800",
    in_progress: "bg-purple-100 text-purple-800",
    completed: "bg-green-100 text-green-800",
    overdue: "bg-red-100 text-red-800"
  };

  const calculateProgress = (plan) => {
    if (!plan.actions || plan.actions.length === 0) return 0;
    const completedActions = plan.actions.filter(a => a.status === 'completed').length;
    return Math.round((completedActions / plan.actions.length) * 100);
  };

  const auditRelatedPlans = actionPlans.filter(p => p.related_entity_type === 'audit');

  if (selectedPlan) {
    return (
      <div className="p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          <Button variant="outline" onClick={() => setSelectedPlan(null)} className="mb-4">
            ← Back to Action Plans
          </Button>
          
          <Card className="mb-6">
            <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{selectedPlan.title}</CardTitle>
                  <p className="text-sm text-gray-500 mt-1">{selectedPlan.description}</p>
                </div>
                <div className="flex gap-2">
                  <Badge className={priorityColors[selectedPlan.priority]}>
                    {selectedPlan.priority}
                  </Badge>
                  <Badge className={statusColors[selectedPlan.status]}>
                    {selectedPlan.status}
                  </Badge>
                </div>
              </div>
            </CardHeader>
          </Card>

          <ActionPlanTracker 
            actionPlan={selectedPlan} 
            onUpdate={() => setSelectedPlan(null)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Action Plan Progress</h1>
          <p className="text-gray-500">Track progress of action plans from audit failures</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Audit-Related Plans</p>
                  <p className="text-3xl font-bold text-blue-900">{auditRelatedPlans.length}</p>
                </div>
                <TrendingUp className="w-10 h-10 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active</p>
                  <p className="text-3xl font-bold text-purple-900">
                    {auditRelatedPlans.filter(p => p.status === 'active' || p.status === 'in_progress').length}
                  </p>
                </div>
                <Clock className="w-10 h-10 text-purple-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-3xl font-bold text-green-900">
                    {auditRelatedPlans.filter(p => p.status === 'completed').length}
                  </p>
                </div>
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Overdue</p>
                  <p className="text-3xl font-bold text-red-900">
                    {auditRelatedPlans.filter(p => p.status === 'overdue').length}
                  </p>
                </div>
                <AlertTriangle className="w-10 h-10 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {auditRelatedPlans.map(plan => {
            const progress = calculateProgress(plan);
            
            return (
              <Card key={plan.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setSelectedPlan(plan)}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{plan.title}</h3>
                        <Badge className={priorityColors[plan.priority]}>{plan.priority}</Badge>
                        <Badge className={statusColors[plan.status]}>{plan.status}</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{plan.description}</p>
                      <div className="text-sm text-gray-600">
                        <span>Category: {plan.category}</span>
                        {plan.target_completion_date && (
                          <span className="ml-4">Target: {plan.target_completion_date}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Progress</span>
                      <span className="text-sm font-bold">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}