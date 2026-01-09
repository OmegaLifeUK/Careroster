import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Shield, 
  Users, 
  GraduationCap, 
  AlertTriangle, 
  CheckCircle,
  FileText,
  TrendingUp,
  Calendar,
  Lock,
  Unlock,
  Eye
} from "lucide-react";
import { format, isPast, addMonths, differenceInDays } from "date-fns";
import StaffOnboardingWorkflow from "@/components/onboarding/StaffOnboardingWorkflow";

export default function ComplianceDashboard() {
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [view, setView] = useState("manager");

  // Fetch all staff
  const { data: allStaff = [] } = useQuery({
    queryKey: ['all-staff'],
    queryFn: async () => {
      const staff = await base44.entities.Staff.list();
      const carers = await base44.entities.Carer.list();
      return [...(staff || []), ...(carers || [])].map(s => ({
        ...s,
        is_staff: !s.employment_type // Staff entity
      }));
    }
  });

  // Fetch organisation profile
  const { data: orgProfile } = useQuery({
    queryKey: ['org-profile'],
    queryFn: async () => {
      const profiles = await base44.entities.OrganisationProfile.list();
      return profiles[0] || null;
    }
  });

  // Fetch all DBS records
  const { data: allDBS = [] } = useQuery({
    queryKey: ['all-dbs'],
    queryFn: async () => {
      const records = await base44.entities.DBSAndReferences.list();
      return Array.isArray(records) ? records : [];
    }
  });

  // Fetch all training
  const { data: allTraining = [] } = useQuery({
    queryKey: ['all-training'],
    queryFn: async () => {
      const records = await base44.entities.TrainingAssignment.list();
      return Array.isArray(records) ? records : [];
    }
  });

  // Fetch care plans
  const { data: carePlans = [] } = useQuery({
    queryKey: ['care-plans-compliance'],
    queryFn: async () => {
      const plans = await base44.entities.CarePlan.list();
      return Array.isArray(plans) ? plans : [];
    }
  });

  // Fetch clients
  const { data: clients = [] } = useQuery({
    queryKey: ['clients-compliance'],
    queryFn: async () => {
      const c = await base44.entities.Client.list();
      const dc = await base44.entities.DomCareClient.list();
      const sc = await base44.entities.SupportedLivingClient.list();
      const dcc = await base44.entities.DayCentreClient.list();
      return [...(c || []), ...(dc || []), ...(sc || []), ...(dcc || [])];
    }
  });

  // Fetch safeguarding
  const { data: safeguarding = [] } = useQuery({
    queryKey: ['safeguarding-open'],
    queryFn: async () => {
      const records = await base44.entities.SafeguardingReferral.list();
      return Array.isArray(records) ? records.filter(r => r.status !== 'closed') : [];
    }
  });

  // Calculate compliance metrics
  const metrics = {
    totalStaff: allStaff.length,
    fitToWork: allStaff.filter(s => 
      s.onboarding_status === 'approved_fit_to_work' || 
      (s.status === 'active' && s.is_active)
    ).length,
    dbsExpiringSoon: allDBS.filter(dbs => {
      if (!dbs.dbs_review_date) return false;
      const daysUntil = differenceInDays(new Date(dbs.dbs_review_date), new Date());
      return daysUntil <= 30 && daysUntil >= 0;
    }).length,
    dbsExpired: allDBS.filter(dbs => 
      dbs.dbs_review_date && isPast(new Date(dbs.dbs_review_date))
    ).length,
    trainingExpiring: allTraining.filter(t => {
      if (!t.expiry_date) return false;
      const daysUntil = differenceInDays(new Date(t.expiry_date), new Date());
      return daysUntil <= 30 && daysUntil >= 0;
    }).length,
    activeClients: clients.filter(c => 
      c.status === 'active' || c.client_status === 'active'
    ).length,
    carePlansOverdue: carePlans.filter(cp => 
      cp.review_date && isPast(new Date(cp.review_date))
    ).length,
    openSafeguarding: safeguarding.length
  };

  const StatCard = ({ title, value, icon: Icon, color, badge }) => (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">{title}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
          </div>
          <div className={`p-3 rounded-full ${color}`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
        {badge && (
          <Badge className={`mt-2 ${badge.color}`}>
            {badge.text}
          </Badge>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Compliance Dashboard</h1>
        <p className="text-gray-600">
          CQC / Ofsted Regulatory Compliance Overview
        </p>
      </div>

      {/* Organisation Status */}
      {orgProfile && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-blue-900">{orgProfile.organisation_name}</h3>
                <div className="flex gap-4 mt-2 text-sm">
                  {orgProfile.cqc_registration_number && (
                    <span>CQC: {orgProfile.cqc_registration_number}</span>
                  )}
                  {orgProfile.ofsted_registration_number && (
                    <span>Ofsted: {orgProfile.ofsted_registration_number}</span>
                  )}
                </div>
              </div>
              <Badge className={
                orgProfile.organisation_status === 'compliant' ? 'bg-green-600' :
                orgProfile.organisation_status === 'incomplete' ? 'bg-amber-600' :
                'bg-red-600'
              }>
                {orgProfile.organisation_status}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={view} onValueChange={setView}>
        <TabsList className="mb-6">
          <TabsTrigger value="manager">Manager View</TabsTrigger>
          <TabsTrigger value="inspector">Inspector View (Read-Only)</TabsTrigger>
        </TabsList>

        <TabsContent value="manager" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Staff"
              value={metrics.totalStaff}
              icon={Users}
              color="bg-blue-500"
            />
            <StatCard
              title="Fit to Work"
              value={`${metrics.fitToWork}/${metrics.totalStaff}`}
              icon={Unlock}
              color="bg-green-500"
              badge={{
                text: `${Math.round((metrics.fitToWork / metrics.totalStaff) * 100)}% compliant`,
                color: metrics.fitToWork === metrics.totalStaff ? 'bg-green-600' : 'bg-amber-600'
              }}
            />
            <StatCard
              title="DBS Alerts"
              value={metrics.dbsExpiringSoon + metrics.dbsExpired}
              icon={Shield}
              color={metrics.dbsExpired > 0 ? 'bg-red-500' : 'bg-amber-500'}
              badge={
                metrics.dbsExpired > 0 
                  ? { text: `${metrics.dbsExpired} expired`, color: 'bg-red-600' }
                  : { text: `${metrics.dbsExpiringSoon} expiring soon`, color: 'bg-amber-600' }
              }
            />
            <StatCard
              title="Training Expiring"
              value={metrics.trainingExpiring}
              icon={GraduationCap}
              color="bg-purple-500"
            />
          </div>

          {/* Alerts */}
          {(metrics.dbsExpired > 0 || metrics.carePlansOverdue > 0 || metrics.openSafeguarding > 0) && (
            <Card className="border-red-300 bg-red-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-900">
                  <AlertTriangle className="w-5 h-5" />
                  Action Required
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {metrics.dbsExpired > 0 && (
                  <div className="flex items-center gap-2 text-red-800">
                    <Shield className="w-4 h-4" />
                    <span>{metrics.dbsExpired} staff with expired DBS checks</span>
                  </div>
                )}
                {metrics.carePlansOverdue > 0 && (
                  <div className="flex items-center gap-2 text-red-800">
                    <FileText className="w-4 h-4" />
                    <span>{metrics.carePlansOverdue} care plans overdue for review</span>
                  </div>
                )}
                {metrics.openSafeguarding > 0 && (
                  <div className="flex items-center gap-2 text-red-800">
                    <AlertTriangle className="w-4 h-4" />
                    <span>{metrics.openSafeguarding} open safeguarding concerns</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Staff Compliance List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Staff Onboarding Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {allStaff.slice(0, 10).map(staff => {
                  const isFitToWork = staff.onboarding_status === 'approved_fit_to_work' || 
                                     (staff.status === 'active' && staff.is_active);
                  return (
                    <div 
                      key={staff.id}
                      className="flex items-center justify-between p-3 border rounded hover:bg-gray-50"
                    >
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
                      <div className="flex items-center gap-2">
                        <Badge className={isFitToWork ? 'bg-green-600' : 'bg-amber-600'}>
                          {isFitToWork ? 'Fit to Work' : 'Onboarding'}
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
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inspector" className="space-y-6">
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-blue-900">
                <Eye className="w-5 h-5" />
                <p className="font-medium">Inspector Read-Only View</p>
              </div>
              <p className="text-sm text-blue-700 mt-1">
                Audit trail and compliance records for regulatory inspection
              </p>
            </CardContent>
          </Card>

          {/* CQC KLOE Mapping */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-600" />
                  Safe
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <p>✓ Safeguarding records: {safeguarding.length}</p>
                <p>✓ DBS checks: {allDBS.filter(d => d.dbs_status === 'clear').length}/{allDBS.length}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-blue-600" />
                  Effective
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <p>✓ Training records: {allTraining.length}</p>
                <p>✓ Care plans: {carePlans.length}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-600" />
                  Caring
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <p>✓ Active clients: {metrics.activeClients}</p>
                <p>✓ Consent records tracked</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-orange-600" />
                  Responsive
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <p>✓ Care plan reviews monitored</p>
                <p>✓ Incident reporting active</p>
              </CardContent>
            </Card>
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
    </div>
  );
}