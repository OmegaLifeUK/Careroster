import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  CheckCircle, 
  Circle, 
  Clock, 
  AlertCircle, 
  Upload, 
  FileText,
  Shield,
  GraduationCap,
  UserCheck,
  ChevronRight,
  Lock,
  Unlock
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { format, addMonths } from "date-fns";
import PreEmploymentForm from "./PreEmploymentForm";
import DBSReferencesForm from "./DBSReferencesForm";
import InductionForm from "./InductionForm";

export default function StaffOnboardingWorkflow({ staffId, staffName, onClose }) {
  const [activeTab, setActiveTab] = useState("overview");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch staff/carer record to determine care setting
  const { data: staffRecord } = useQuery({
    queryKey: ['staff-record', staffId],
    queryFn: async () => {
      try {
        const staff = await base44.entities.Staff.filter({ id: staffId });
        if (staff && staff.length > 0) return staff[0];
      } catch (e) {}
      try {
        const carer = await base44.entities.Carer.filter({ id: staffId });
        if (carer && carer.length > 0) return carer[0];
      } catch (e) {}
      return null;
    }
  });

  // Fetch workflows
  const { data: workflows = [] } = useQuery({
    queryKey: ['onboarding-workflows-staff'],
    queryFn: async () => {
      const records = await base44.entities.OnboardingWorkflowConfig.list();
      return Array.isArray(records) ? records : [];
    }
  });

  // Determine staff's care setting and find matching workflow
  const getStaffCareSetting = () => {
    if (staffRecord?.care_setting) return staffRecord.care_setting;
    if (staffRecord?.vehicle_type) return 'domiciliary';
    return 'residential';
  };

  const staffCareSetting = getStaffCareSetting();

  const activeWorkflow = workflows.find(w => 
    w.workflow_type === 'staff' && 
    w.is_active && 
    w.care_setting === staffCareSetting
  ) || workflows.find(w => 
    w.workflow_type === 'staff' && 
    w.is_active && 
    w.care_setting === 'all'
  );

  // Fetch all onboarding records
  const { data: preEmployment } = useQuery({
    queryKey: ['pre-employment', staffId],
    queryFn: async () => {
      const records = await base44.entities.PreEmploymentCompliance.filter({ staff_id: staffId });
      return records[0] || null;
    }
  });

  const { data: dbs } = useQuery({
    queryKey: ['dbs-references', staffId],
    queryFn: async () => {
      const records = await base44.entities.DBSAndReferences.filter({ staff_id: staffId });
      return records[0] || null;
    }
  });

  const { data: trainingRecords = [] } = useQuery({
    queryKey: ['training-onboarding', staffId],
    queryFn: async () => {
      const assignments = await base44.entities.TrainingAssignment.filter({ staff_id: staffId });
      return Array.isArray(assignments) ? assignments : [];
    }
  });

  const { data: induction } = useQuery({
    queryKey: ['induction', staffId],
    queryFn: async () => {
      const records = await base44.entities.InductionRecord.filter({ staff_id: staffId });
      return records[0] || null;
    }
  });

  const mandatoryTraining = [
    "Safeguarding Adults",
    "Safeguarding Children",
    "Health & Safety",
    "Infection Control",
    "Moving & Handling",
    "Medication Awareness",
    "GDPR & Confidentiality",
    "First Aid / BLS"
  ];

  // Calculate completion status
  const calculateStatus = () => {
    const checks = {
      preEmployment: preEmployment?.status === 'verified',
      dbs: dbs?.dbs_status === 'clear',
      references: dbs?.all_references_satisfactory === true,
      training: mandatoryTraining.every(mt => 
        trainingRecords.some(tr => 
          tr.training_name === mt && tr.status === 'completed'
        )
      ),
      induction: induction?.induction_completed === true && 
                 induction?.competency_assessment_result === 'pass'
    };

    const completed = Object.values(checks).filter(Boolean).length;
    const total = Object.keys(checks).length;
    const percentage = Math.round((completed / total) * 100);
    const allComplete = completed === total;

    return { checks, completed, total, percentage, allComplete };
  };

  const status = calculateStatus();

  const createPreEmploymentMutation = useMutation({
    mutationFn: () => base44.entities.PreEmploymentCompliance.create({
      staff_id: staffId,
      status: 'pending'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pre-employment'] });
      toast.success("Created", "Pre-employment record created");
    }
  });

  const createDBSMutation = useMutation({
    mutationFn: () => base44.entities.DBSAndReferences.create({
      staff_id: staffId,
      dbs_level: 'enhanced',
      dbs_status: 'pending'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dbs-references'] });
      toast.success("Created", "DBS record created");
    }
  });

  const createInductionMutation = useMutation({
    mutationFn: () => base44.entities.InductionRecord.create({
      staff_id: staffId,
      induction_start_date: format(new Date(), 'yyyy-MM-dd'),
      status: 'in_progress'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['induction'] });
      toast.success("Created", "Induction record created");
    }
  });

  const approveStaffMutation = useMutation({
    mutationFn: async () => {
      // Update staff/carer status to approved
      try {
        const staff = await base44.entities.Staff.filter({ id: staffId });
        if (staff && staff.length > 0) {
          await base44.entities.Staff.update(staffId, { 
            is_active: true,
            onboarding_status: 'approved_fit_to_work',
            approved_date: format(new Date(), 'yyyy-MM-dd')
          });
        }
      } catch (e) {
        const carer = await base44.entities.Carer.filter({ id: staffId });
        if (carer && carer.length > 0) {
          await base44.entities.Carer.update(staffId, { 
            status: 'active',
            onboarding_status: 'approved_fit_to_work',
            approved_date: format(new Date(), 'yyyy-MM-dd')
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success("Approved", `${staffName} is now fit to work and can be assigned to clients`);
    }
  });

  const StageCard = ({ title, icon: Icon, complete, children, onStart }) => (
    <Card className={complete ? 'border-green-300 bg-green-50' : 'border-gray-200'}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            {complete ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <Icon className="w-5 h-5 text-gray-400" />
            )}
            <span>{title}</span>
          </div>
          {complete ? (
            <Badge className="bg-green-600">Complete</Badge>
          ) : onStart ? (
            <Button size="sm" onClick={onStart}>Start</Button>
          ) : (
            <Badge variant="outline">Pending</Badge>
          )}
        </CardTitle>
      </CardHeader>
      {children && <CardContent>{children}</CardContent>}
    </Card>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-blue-600" />
              Staff Onboarding: {staffName}
            </CardTitle>
            <Button variant="ghost" onClick={onClose}>×</Button>
          </div>
        </CardHeader>

        <div className="p-6 overflow-y-auto flex-1">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-2 w-full mb-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="details">Stage Details</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Progress Summary */}
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">Onboarding Progress</h3>
                    <span className="text-2xl font-bold text-blue-700">{status.percentage}%</span>
                  </div>
                  <Progress value={status.percentage} className="h-2 mb-2" />
                  <p className="text-sm text-gray-600">
                    {status.completed} of {status.total} stages completed
                  </p>
                </CardContent>
              </Card>

              {/* Status Alert */}
              {status.allComplete ? (
                <Card className="border-green-300 bg-green-50">
                  <CardContent className="p-4 flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-green-900">All Onboarding Complete</p>
                      <p className="text-sm text-green-700">
                        This staff member can now be approved as fit to work
                      </p>
                    </div>
                    <Button 
                      onClick={() => approveStaffMutation.mutate()}
                      disabled={approveStaffMutation.isPending}
                      className="bg-green-600"
                    >
                      <Unlock className="w-4 h-4 mr-2" />
                      Approve Fit to Work
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-amber-300 bg-amber-50">
                  <CardContent className="p-4 flex items-start gap-3">
                    <Lock className="w-5 h-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-amber-900">Onboarding In Progress</p>
                      <p className="text-sm text-amber-700">
                        Cannot be assigned to clients until all stages are complete
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Onboarding Stages */}
              <div className="space-y-4">
                <StageCard
                  title="1. Pre-Employment Compliance"
                  icon={FileText}
                  complete={status.checks.preEmployment}
                  onStart={!preEmployment ? () => createPreEmploymentMutation.mutate() : null}
                >
                  {preEmployment && (
                    <div className="text-sm space-y-1">
                      <div className="flex items-center gap-2">
                        {preEmployment.right_to_work_confirmed ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <Circle className="w-4 h-4 text-gray-300" />
                        )}
                        <span>Right to work verified</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {preEmployment.photo_id_url ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <Circle className="w-4 h-4 text-gray-300" />
                        )}
                        <span>Photo ID uploaded</span>
                      </div>
                    </div>
                  )}
                </StageCard>

                <StageCard
                  title="2. DBS & References"
                  icon={Shield}
                  complete={status.checks.dbs && status.checks.references}
                  onStart={!dbs ? () => createDBSMutation.mutate() : null}
                >
                  {dbs && (
                    <div className="text-sm space-y-1">
                      <div className="flex items-center gap-2">
                        {dbs.dbs_status === 'clear' ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <Clock className="w-4 h-4 text-amber-500" />
                        )}
                        <span>DBS: {dbs.dbs_status}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {dbs.all_references_satisfactory ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <Clock className="w-4 h-4 text-amber-500" />
                        )}
                        <span>References satisfactory</span>
                      </div>
                    </div>
                  )}
                </StageCard>

                <StageCard
                  title="3. Mandatory Training"
                  icon={GraduationCap}
                  complete={status.checks.training}
                >
                  <div className="text-sm space-y-1">
                    {mandatoryTraining.map(mt => {
                      const record = trainingRecords.find(tr => tr.training_name === mt);
                      const complete = record?.status === 'completed';
                      return (
                        <div key={mt} className="flex items-center gap-2">
                          {complete ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <Circle className="w-4 h-4 text-gray-300" />
                          )}
                          <span>{mt}</span>
                        </div>
                      );
                    })}
                  </div>
                </StageCard>

                <StageCard
                  title="4. Induction & Competency"
                  icon={UserCheck}
                  complete={status.checks.induction}
                  onStart={!induction ? () => createInductionMutation.mutate() : null}
                >
                  {induction && (
                    <div className="text-sm space-y-1">
                      <div className="flex items-center gap-2">
                        {induction.shadow_shifts_completed >= induction.shadow_shifts_required ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <Clock className="w-4 h-4 text-amber-500" />
                        )}
                        <span>
                          Shadow shifts: {induction.shadow_shifts_completed}/{induction.shadow_shifts_required}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {induction.competency_assessment_result === 'pass' ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <Clock className="w-4 h-4 text-amber-500" />
                        )}
                        <span>Competency: {induction.competency_assessment_result}</span>
                      </div>
                    </div>
                  )}
                </StageCard>
              </div>
            </TabsContent>

            <TabsContent value="details" className="space-y-6">
              <div className="mb-4 p-4 bg-blue-50 rounded border border-blue-200">
                <p className="text-sm text-blue-800">
                  Complete each stage in order. All stages must be completed before staff can be approved as fit to work.
                </p>
              </div>

              <PreEmploymentForm 
                staffId={staffId} 
                existingRecord={preEmployment}
                onComplete={() => {
                  queryClient.invalidateQueries();
                  setActiveTab("overview");
                }}
              />
              
              <DBSReferencesForm 
                staffId={staffId} 
                existingRecord={dbs}
                onComplete={() => {
                  queryClient.invalidateQueries();
                  setActiveTab("overview");
                }}
              />

              <MandatoryTrainingTracker 
                staffId={staffId}
                trainingRecords={trainingRecords}
                onComplete={() => queryClient.invalidateQueries()}
              />

              <InductionForm 
                staffId={staffId} 
                existingRecord={induction}
                onComplete={() => {
                  queryClient.invalidateQueries();
                  setActiveTab("overview");
                }}
              />
            </TabsContent>
          </Tabs>
        </div>
      </Card>
    </div>
  );
}