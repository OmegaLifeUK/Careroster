import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, AlertCircle, FileCheck, ClipboardList, Heart, Eye } from "lucide-react";
import { format } from "date-fns";
import ConsentManagement from "@/components/clients/ConsentManagement";
import RiskAssessmentManager from "@/components/clients/RiskAssessmentManager";
import CarePlanManager from "@/components/clients/CarePlanManager";

export default function OnboardingTracker({ clientId }) {
  const [expandedSection, setExpandedSection] = React.useState(null);

  const { data: consent } = useQuery({
    queryKey: ['consent-onboarding', clientId],
    queryFn: async () => {
      const records = await base44.entities.ConsentAndCapacity.filter({ client_id: clientId });
      return Array.isArray(records) ? records.find(c => c.status === 'obtained') : null;
    }
  });

  const { data: assessment } = useQuery({
    queryKey: ['assessment-onboarding', clientId],
    queryFn: async () => {
      const records = await base44.entities.CareAssessment.filter({ client_id: clientId });
      return Array.isArray(records) ? records.find(a => a.status === 'completed') : null;
    }
  });

  const { data: carePlans = [] } = useQuery({
    queryKey: ['careplans-onboarding-tracker', clientId],
    queryFn: async () => {
      const records = await base44.entities.CarePlan.filter({ client_id: clientId });
      return Array.isArray(records) ? records : [];
    }
  });

  const activeCarePlan = carePlans.find(cp => cp.status === 'active');

  const stages = [
    {
      key: 'consent',
      label: 'Consent & Capacity',
      icon: FileCheck,
      complete: !!consent,
      data: consent,
      color: 'blue'
    },
    {
      key: 'assessment',
      label: 'Care Assessment',
      icon: ClipboardList,
      complete: !!assessment,
      data: assessment,
      color: 'purple'
    },
    {
      key: 'careplan',
      label: 'Care Plan',
      icon: Heart,
      complete: !!activeCarePlan,
      data: activeCarePlan,
      color: 'green'
    }
  ];

  const completedStages = stages.filter(s => s.complete).length;
  const progress = (completedStages / stages.length) * 100;
  const allComplete = completedStages === stages.length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Client Onboarding Progress</CardTitle>
            <Badge className={allComplete ? 'bg-green-600' : 'bg-amber-600'}>
              {allComplete ? 'Complete' : 'In Progress'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm font-bold">{completedStages}/{stages.length} Complete</span>
            </div>
            <Progress value={progress} className="h-3" />
          </div>

          <div className="space-y-3">
            {stages.map((stage, idx) => (
              <div key={stage.key}>
                <div
                  className={`p-4 rounded border-2 cursor-pointer transition-all ${
                    stage.complete
                      ? 'bg-green-50 border-green-200'
                      : 'bg-gray-50 border-gray-200'
                  } ${expandedSection === stage.key ? 'ring-2 ring-blue-300' : ''}`}
                  onClick={() => setExpandedSection(expandedSection === stage.key ? null : stage.key)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {stage.complete ? (
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      ) : (
                        <AlertCircle className="w-6 h-6 text-gray-400" />
                      )}
                      <div>
                        <p className="font-semibold">{stage.label}</p>
                        {stage.complete && stage.data && (
                          <p className="text-xs text-gray-600">
                            Completed: {format(new Date(stage.data.created_date), 'dd/MM/yyyy')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={stage.complete ? 'bg-green-600' : 'bg-gray-400'}>
                        {stage.complete ? 'Complete' : 'Pending'}
                      </Badge>
                      <Button size="sm" variant="ghost">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {expandedSection === stage.key && (
                  <div className="mt-2 p-4 bg-white border rounded">
                    {stage.key === 'consent' && (
                      <ConsentManagement client={{ id: clientId }} />
                    )}
                    {stage.key === 'assessment' && (
                      <RiskAssessmentManager client={{ id: clientId }} />
                    )}
                    {stage.key === 'careplan' && (
                      <CarePlanManager client={{ id: clientId }} />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {allComplete && (
            <div className="mt-4 p-3 bg-green-50 rounded border border-green-200 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <p className="text-sm font-medium text-green-900">
                Client onboarding complete! All stages approved.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}