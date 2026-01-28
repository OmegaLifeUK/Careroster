import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { 
  Users, 
  UserCircle, 
  Building2,
  Lock,
  Unlock,
  Eye,
  Search,
  AlertTriangle,
  CheckCircle
} from "lucide-react";
import { differenceInDays, isPast } from "date-fns";
import StaffOnboardingWorkflow from "@/components/onboarding/StaffOnboardingWorkflow";
import ClientOnboardingWorkflow from "@/components/onboarding/ClientOnboardingWorkflow";
import OrganisationSetup from "@/components/onboarding/OrganisationSetup";

export default function OnboardingHub() {
  const [view, setView] = useState("staff");
  const [search, setSearch] = useState("");
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [showOrgSetup, setShowOrgSetup] = useState(false);

  const { data: allStaff = [] } = useQuery({
    queryKey: ['all-staff-onboarding'],
    queryFn: async () => {
      const staff = await base44.entities.Staff.list();
      const carers = await base44.entities.Carer.list();
      return [...(staff || []), ...(carers || [])].map(s => ({
        ...s,
        entity_type: s.vehicle_type ? 'staff' : 'carer'
      }));
    }
  });

  const { data: allClients = [] } = useQuery({
    queryKey: ['all-clients-onboarding'],
    queryFn: async () => {
      const c1 = await base44.entities.Client.list();
      const c2 = await base44.entities.DomCareClient.list();
      const c3 = await base44.entities.SupportedLivingClient.list();
      const c4 = await base44.entities.DayCentreClient.list();
      return [...(c1 || []), ...(c2 || []), ...(c3 || []), ...(c4 || [])];
    }
  });

  const { data: allPreEmployment = [] } = useQuery({
    queryKey: ['all-pre-employment'],
    queryFn: async () => {
      const records = await base44.entities.PreEmploymentCompliance.list();
      return Array.isArray(records) ? records : [];
    }
  });

  const { data: allDBS = [] } = useQuery({
    queryKey: ['all-dbs-onboarding'],
    queryFn: async () => {
      const records = await base44.entities.DBSAndReferences.list();
      return Array.isArray(records) ? records : [];
    }
  });

  const { data: allInductions = [] } = useQuery({
    queryKey: ['all-inductions'],
    queryFn: async () => {
      const records = await base44.entities.InductionRecord.list();
      return Array.isArray(records) ? records : [];
    }
  });

  const { data: allTraining = [] } = useQuery({
    queryKey: ['all-training-onboarding'],
    queryFn: async () => {
      const records = await base44.entities.TrainingAssignment.list();
      return Array.isArray(records) ? records : [];
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

  const getStaffOnboardingStatus = (staffId) => {
    const preEmp = allPreEmployment.find(p => p.staff_id === staffId);
    const dbs = allDBS.find(d => d.staff_id === staffId);
    const induction = allInductions.find(i => i.staff_id === staffId);
    const training = allTraining.filter(t => t.staff_id === staffId);

    const checks = {
      preEmployment: preEmp?.status === 'verified',
      dbs: dbs?.dbs_status === 'clear',
      references: dbs?.all_references_satisfactory === true,
      training: mandatoryTraining.every(mt => 
        training.some(tr => tr.training_name === mt && tr.status === 'completed')
      ),
      induction: induction?.status === 'completed'
    };

    const completed = Object.values(checks).filter(Boolean).length;
    const percentage = Math.round((completed / 5) * 100);
    
    return { checks, completed, percentage, allComplete: completed === 5 };
  };

  const { data: allConsent = [] } = useQuery({
    queryKey: ['all-consent-onboarding'],
    queryFn: async () => {
      const records = await base44.entities.ConsentAndCapacity.list();
      return Array.isArray(records) ? records : [];
    }
  });

  const { data: allAssessments = [] } = useQuery({
    queryKey: ['all-assessments-onboarding'],
    queryFn: async () => {
      const records = await base44.entities.CareAssessment.list();
      return Array.isArray(records) ? records : [];
    }
  });

  const { data: allCarePlans = [] } = useQuery({
    queryKey: ['all-care-plans-onboarding'],
    queryFn: async () => {
      const records = await base44.entities.CarePlan.list();
      return Array.isArray(records) ? records : [];
    }
  });

  const { data: allRiskAssessments = [] } = useQuery({
    queryKey: ['all-risk-assessments-onboarding'],
    queryFn: async () => {
      const records = await base44.entities.RiskAssessment.list();
      return Array.isArray(records) ? records : [];
    }
  });

  const { data: workflows = [] } = useQuery({
    queryKey: ['onboarding-workflows-hub'],
    queryFn: async () => {
      const records = await base44.entities.OnboardingWorkflowConfig.list();
      return Array.isArray(records) ? records : [];
    }
  });

  const getClientOnboardingStatus = (clientId) => {
    // Fetch active client workflow
    const activeWorkflow = workflows.find(w => w.workflow_type === 'client' && w.is_active);
    
    if (!activeWorkflow || !activeWorkflow.stages) {
      // Fallback to old logic if no workflow configured
      const consent = allConsent.find(c => c.client_id === clientId);
      const assessment = allAssessments.find(a => a.client_id === clientId);
      const carePlan = allCarePlans.find(cp => cp.client_id === clientId && cp.status === 'active');

      const checks = {
        consent: consent?.status === 'obtained',
        assessment: assessment?.status === 'completed' || assessment?.status === 'approved',
        carePlan: !!carePlan
      };

      const completed = Object.values(checks).filter(Boolean).length;
      const percentage = Math.round((completed / 3) * 100);
      
      return { checks, completed, total: 3, percentage, allComplete: completed === 3 };
    }

    // Use workflow configuration
    const stages = activeWorkflow.stages.sort((a, b) => a.order - b.order);
    const requiredStages = stages.filter(s => s.is_required);
    
    const checkStageComplete = (stage) => {
      if (!stage.completion_criteria) return false;
      
      const { entity_type, status_field, required_status } = stage.completion_criteria;
      
      if (entity_type === 'ConsentAndCapacity') {
        const consent = allConsent.find(c => c.client_id === clientId);
        return consent && (!status_field || required_status?.includes(consent[status_field]));
      } else if (entity_type === 'CareAssessment') {
        const assessment = allAssessments.find(a => a.client_id === clientId);
        return assessment && (!status_field || required_status?.some(s => assessment[status_field] === s));
      } else if (entity_type === 'CarePlan') {
        return allCarePlans.some(cp => cp.client_id === clientId && cp.status === 'active');
      } else if (entity_type === 'RiskAssessment') {
        return allRiskAssessments.some(ra => ra.client_id === clientId && ra.status === 'completed');
      }
      
      return false;
    };

    const checksMap = {};
    stages.forEach(stage => {
      checksMap[stage.stage_id] = checkStageComplete(stage);
    });

    const completedRequired = requiredStages.filter(s => checksMap[s.stage_id]).length;
    const percentage = requiredStages.length > 0 
      ? Math.round((completedRequired / requiredStages.length) * 100) 
      : 0;
    const allComplete = completedRequired === requiredStages.length;

    return { 
      checks: checksMap, 
      completed: completedRequired, 
      total: stages.length,
      percentage, 
      allComplete 
    };
  };

  // Calculate metrics
  const staffMetrics = {
    total: allStaff.length,
    fitToWork: allStaff.filter(s => {
      const status = getStaffOnboardingStatus(s.id);
      return status.allComplete;
    }).length,
    dbsExpiringSoon: allDBS.filter(dbs => {
      if (!dbs.dbs_review_date) return false;
      const days = differenceInDays(new Date(dbs.dbs_review_date), new Date());
      return days > 0 && days <= 30;
    }).length
  };

  const filteredStaff = allStaff.filter(s => 
    s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredClients = allClients.filter(c =>
    c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.client_full_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Onboarding Hub</h1>
          <p className="text-gray-600">Regulatory compliance and onboarding management</p>
        </div>
        <Button onClick={() => setShowOrgSetup(true)} variant="outline">
          <Building2 className="w-4 h-4 mr-2" />
          Organisation Setup
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Staff</p>
                <p className="text-3xl font-bold">{staffMetrics.total}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Fit to Work</p>
                <p className="text-3xl font-bold">{staffMetrics.fitToWork}/{staffMetrics.total}</p>
              </div>
              <Unlock className="w-8 h-8 text-green-500" />
            </div>
            <Badge className="mt-2 bg-green-600">
              {Math.round((staffMetrics.fitToWork / staffMetrics.total) * 100)}% compliant
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">DBS Expiring Soon</p>
                <p className="text-3xl font-bold">{staffMetrics.dbsExpiringSoon}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={view} onValueChange={setView}>
        <TabsList>
          <TabsTrigger value="staff">
            <Users className="w-4 h-4 mr-2" />
            Staff Onboarding
          </TabsTrigger>
          <TabsTrigger value="clients">
            <UserCircle className="w-4 h-4 mr-2" />
            Client Onboarding
          </TabsTrigger>
        </TabsList>

        <TabsContent value="staff" className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search staff by name or email..."
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            {filteredStaff.map(staff => {
              const onboardingStatus = getStaffOnboardingStatus(staff.id);
              const isFitToWork = onboardingStatus.allComplete;

              return (
                <Card key={staff.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isFitToWork ? (
                          <Unlock className="w-5 h-5 text-green-600" />
                        ) : (
                          <Lock className="w-5 h-5 text-amber-600" />
                        )}
                        <div>
                          <p className="font-medium">{staff.full_name}</p>
                          <p className="text-sm text-gray-600">{staff.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm font-medium">{onboardingStatus.percentage}%</p>
                          <p className="text-xs text-gray-500">
                            {onboardingStatus.completed}/5 stages
                          </p>
                        </div>
                        <Badge className={isFitToWork ? 'bg-green-600' : 'bg-amber-600'}>
                          {isFitToWork ? 'Fit to Work' : 'In Progress'}
                        </Badge>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setSelectedStaff(staff)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="clients" className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search clients..."
              className="pl-10"
            />
          </div>

          <div className="space-y-2">
            {filteredClients.map(client => {
              const clientStatus = client.status || client.client_status;
              const isActive = clientStatus === 'active';
              const onboardingStatus = getClientOnboardingStatus(client.id);

              return (
                <Card key={client.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {onboardingStatus.allComplete ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <UserCircle className="w-5 h-5 text-blue-600" />
                        )}
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="font-medium">{client.full_name || client.client_full_name}</p>
                            <p className="text-sm text-gray-600">{client.address?.postcode}</p>
                          </div>
                          <div className="flex items-center gap-1 text-xs">
                            {onboardingStatus.checks.consent && <Badge className="bg-green-100 text-green-800 text-xs">Consent</Badge>}
                            {onboardingStatus.checks.assessment && <Badge className="bg-green-100 text-green-800 text-xs">Assessment</Badge>}
                            {onboardingStatus.checks.carePlan && <Badge className="bg-green-100 text-green-800 text-xs">Care Plan</Badge>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm font-medium">{onboardingStatus.percentage}%</p>
                          <p className="text-xs text-gray-500">
                            {onboardingStatus.completed}/{onboardingStatus.total || 3} stages
                          </p>
                        </div>
                        <Badge className={isActive ? 'bg-green-600' : 'bg-amber-600'}>
                          {isActive ? 'Active' : 'Onboarding'}
                        </Badge>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setSelectedClient(client)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Manage
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {selectedStaff && (
        <StaffOnboardingWorkflow
          staffId={selectedStaff.id}
          staffName={selectedStaff.full_name}
          onClose={() => setSelectedStaff(null)}
        />
      )}

      {selectedClient && (
        <ClientOnboardingWorkflow
          clientId={selectedClient.id}
          clientName={selectedClient.full_name || selectedClient.client_full_name}
          onClose={() => setSelectedClient(null)}
        />
      )}

      {showOrgSetup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Organisation Setup</h2>
              <Button variant="ghost" onClick={() => setShowOrgSetup(false)}>×</Button>
            </div>
            <OrganisationSetup />
          </div>
        </div>
      )}
    </div>
  );
}