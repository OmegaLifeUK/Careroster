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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/toast";
import { format, addMonths } from "date-fns";
import PreEmploymentForm from "./PreEmploymentForm";
import DBSReferencesForm from "./DBSReferencesForm";
import InductionForm from "./InductionForm";
import MandatoryTrainingTracker from "./MandatoryTrainingTracker";
import AIOnboardingPlanGenerator from "./AIOnboardingPlanGenerator";
import AIWelcomePacket from "./AIWelcomePacket";
import OnboardingChatbot from "./OnboardingChatbot";

export default function StaffOnboardingWorkflow({ staffId, staffName, onClose }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [activeStage, setActiveStage] = useState(null);
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

      // Notify managers and schedulers
      const allUsers = await base44.entities.User.list();
      const managersAndAdmins = allUsers.filter(u => u.role === 'admin');
      
      await Promise.all(managersAndAdmins.map(user => 
        base44.entities.Notification.create({
          user_email: user.email,
          notification_type: 'staff_ready',
          title: 'New Staff Member Ready for Scheduling',
          message: `${staffName} has completed onboarding and is now active. They are ready to be assigned to shifts and clients.`,
          priority: 'high',
          is_read: false,
          action_url: `/staff-onboarding`,
          created_date: new Date().toISOString()
        })
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success("Approved", `${staffName} is now fit to work and can be assigned to clients`);
    }
  });

  const StageCard = ({ stageNum, title, icon: Icon, complete, record, onAction }) => (
    <Card className={complete ? 'border-green-300 bg-green-50' : 'border-gray-200'}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${complete ? 'bg-green-600' : 'bg-gray-200'}`}>
              {complete ? (
                <CheckCircle className="w-5 h-5 text-white" />
              ) : (
                <span className="text-sm font-bold">{stageNum}</span>
              )}
            </div>
            <span>{title}</span>
          </div>
          {complete ? (
            <Badge className="bg-green-600">Complete ✓</Badge>
          ) : record ? (
            <Button size="sm" onClick={onAction} variant="default">
              Continue
            </Button>
          ) : (
            <Button size="sm" onClick={onAction} variant="outline">
              Start
            </Button>
          )}
        </CardTitle>
      </CardHeader>
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
          {!activeStage ? (
            <div className="space-y-6">
              {/* AI Tools */}
              <div className="grid md:grid-cols-2 gap-4">
                {staffRecord && (
                  <>
                    <AIOnboardingPlanGenerator staffMember={staffRecord} />
                    <AIWelcomePacket staffMember={staffRecord} />
                  </>
                )}
              </div>

              {/* Progress Summary */}
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">Onboarding Progress</h3>
                    <span className="text-2xl font-bold text-blue-700">{status.percentage}%</span>
                  </div>
                  <Progress value={status.percentage} className="h-3 mb-2" />
                  <p className="text-sm text-gray-600">
                    {status.completed} of {status.total} stages completed
                  </p>
                  <p className="text-xs text-blue-700 mt-2 font-medium">
                    👉 Click on any stage below to complete it
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
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-gray-700 mb-3">Complete these stages in order:</h3>
                
                <StageCard
                  stageNum={1}
                  title="Pre-Employment Compliance"
                  icon={FileText}
                  complete={status.checks.preEmployment}
                  record={preEmployment}
                  onAction={() => {
                    if (!preEmployment) {
                      createPreEmploymentMutation.mutate();
                      setTimeout(() => setActiveStage('pre-employment'), 500);
                    } else {
                      setActiveStage('pre-employment');
                    }
                  }}
                />

                <StageCard
                  stageNum={2}
                  title="DBS & References"
                  icon={Shield}
                  complete={status.checks.dbs && status.checks.references}
                  record={dbs}
                  onAction={() => {
                    if (!dbs) {
                      createDBSMutation.mutate();
                      setTimeout(() => setActiveStage('dbs'), 500);
                    } else {
                      setActiveStage('dbs');
                    }
                  }}
                />

                <StageCard
                  stageNum={3}
                  title="Mandatory Training"
                  icon={GraduationCap}
                  complete={status.checks.training}
                  record={trainingRecords.length > 0 ? {} : null}
                  onAction={() => setActiveStage('training')}
                />

                <StageCard
                  stageNum={4}
                  title="Induction & Competency"
                  icon={UserCheck}
                  complete={status.checks.induction}
                  record={induction}
                  onAction={() => {
                    if (!induction) {
                      createInductionMutation.mutate();
                      setTimeout(() => setActiveStage('induction'), 500);
                    } else {
                      setActiveStage('induction');
                    }
                  }}
                />
              </div>
            </div>
          ) : (
            <div>
              <Button 
                variant="ghost" 
                onClick={() => setActiveStage(null)}
                className="mb-4"
              >
                ← Back to Overview
              </Button>

              {activeStage === 'pre-employment' && (
                <PreEmploymentForm 
                  staffId={staffId} 
                  existingRecord={preEmployment}
                  onComplete={() => {
                    queryClient.invalidateQueries();
                    setActiveStage(null);
                    toast.success("Stage Complete", "Pre-employment checks completed");
                  }}
                />
              )}

              {activeStage === 'dbs' && (
                <DBSReferencesForm 
                  staffId={staffId} 
                  existingRecord={dbs}
                  onComplete={() => {
                    queryClient.invalidateQueries();
                    setActiveStage(null);
                    toast.success("Stage Complete", "DBS & References completed");
                  }}
                />
              )}

              {activeStage === 'training' && (
                <MandatoryTrainingTracker 
                  staffId={staffId}
                  trainingRecords={trainingRecords}
                  onComplete={() => {
                    queryClient.invalidateQueries();
                    setActiveStage(null);
                    toast.success("Stage Complete", "Training requirements met");
                  }}
                />
              )}

              {activeStage === 'induction' && (
                <InductionForm 
                  staffId={staffId} 
                  existingRecord={induction}
                  onComplete={() => {
                    queryClient.invalidateQueries();
                    setActiveStage(null);
                    toast.success("Stage Complete", "Induction completed");
                  }}
                />
              )}
            </div>
          )}
        </div>
      </Card>

      {staffRecord && <OnboardingChatbot staffMember={staffRecord} />}
    </div>
  );
}