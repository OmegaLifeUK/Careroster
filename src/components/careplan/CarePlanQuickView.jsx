import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Heart, 
  ListChecks, 
  Pill, 
  AlertTriangle,
  ChevronRight,
  Clock
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function CarePlanQuickView({ clientId, showLink = true }) {
  const { data: carePlans = [], isLoading } = useQuery({
    queryKey: ['care-plans-quick', clientId],
    queryFn: async () => {
      const plans = await base44.entities.CarePlan.filter({ client_id: clientId, status: 'active' });
      return Array.isArray(plans) ? plans : [];
    },
    enabled: !!clientId
  });

  const activePlan = carePlans[0];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4 text-center text-gray-500">
          Loading care plan...
        </CardContent>
      </Card>
    );
  }

  if (!activePlan) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-4 text-center text-gray-500">
          <Heart className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">No active care plan</p>
        </CardContent>
      </Card>
    );
  }

  const activeTasks = activePlan.care_tasks?.filter(t => t.is_active) || [];
  const medications = activePlan.medication_management?.medications || [];
  const highRisks = activePlan.risk_factors?.filter(r => r.impact === 'high' || r.likelihood === 'high') || [];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Heart className="w-4 h-4 text-blue-600" />
            Care Plan Summary
          </CardTitle>
          <Badge className="bg-green-100 text-green-700">Active</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 bg-purple-50 rounded">
            <ListChecks className="w-4 h-4 mx-auto text-purple-600" />
            <p className="text-lg font-bold">{activeTasks.length}</p>
            <p className="text-xs text-gray-500">Tasks</p>
          </div>
          <div className="p-2 bg-pink-50 rounded">
            <Pill className="w-4 h-4 mx-auto text-pink-600" />
            <p className="text-lg font-bold">{medications.length}</p>
            <p className="text-xs text-gray-500">Medications</p>
          </div>
          <div className="p-2 bg-orange-50 rounded">
            <AlertTriangle className="w-4 h-4 mx-auto text-orange-600" />
            <p className="text-lg font-bold">{highRisks.length}</p>
            <p className="text-xs text-gray-500">High Risks</p>
          </div>
        </div>

        {/* Key Tasks */}
        {activeTasks.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">Key Tasks</p>
            <div className="space-y-1">
              {activeTasks.slice(0, 3).map((task, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm p-1.5 bg-gray-50 rounded">
                  <Clock className="w-3 h-3 text-gray-400" />
                  <span className="truncate">{task.task_name}</span>
                  <Badge variant="outline" className="text-[10px] ml-auto">
                    {task.frequency?.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
              {activeTasks.length > 3 && (
                <p className="text-xs text-gray-500 pl-5">+{activeTasks.length - 3} more tasks</p>
              )}
            </div>
          </div>
        )}

        {/* Allergies Alert */}
        {activePlan.medication_management?.allergies_sensitivities && (
          <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
            <strong>⚠️ Allergies:</strong> {activePlan.medication_management.allergies_sensitivities}
          </div>
        )}

        {/* Preferences Preview */}
        {activePlan.preferences?.personal_care_preferences && (
          <div className="p-2 bg-blue-50 rounded text-xs">
            <strong>Care Preferences:</strong>
            <p className="text-gray-700 line-clamp-2">{activePlan.preferences.personal_care_preferences}</p>
          </div>
        )}

        {showLink && (
          <Button variant="outline" size="sm" className="w-full" asChild>
            <Link to={`${createPageUrl('Clients')}?id=${clientId}&tab=careplans`}>
              View Full Care Plan <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}