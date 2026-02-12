import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Shield, 
  Users, 
  UserCircle, 
  BookOpen,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  TrendingUp,
  Activity
} from "lucide-react";
import { isPast, differenceInDays, format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ComplianceDashboard() {
  const { data: orgProfile } = useQuery({
    queryKey: ['org-profile'],
    queryFn: async () => {
      const profiles = await base44.entities.OrganisationProfile.list();
      return profiles[0] || null;
    }
  });

  const { data: allStaff = [] } = useQuery({
    queryKey: ['all-staff-compliance'],
    queryFn: async () => {
      const staff = await base44.entities.Staff.list();
      const carers = await base44.entities.Carer.list();
      return [...(staff || []), ...(carers || [])];
    }
  });

  const { data: allClients = [] } = useQuery({
    queryKey: ['all-clients-compliance'],
    queryFn: async () => {
      const clients = await base44.entities.Client.list();
      const domClients = await base44.entities.DomCareClient.list();
      const slClients = await base44.entities.SupportedLivingClient.list();
      const dcClients = await base44.entities.DayCentreClient.list();
      
      return [
        ...(Array.isArray(clients) ? clients : []),
        ...(Array.isArray(domClients) ? domClients : []),
        ...(Array.isArray(slClients) ? slClients : []),
        ...(Array.isArray(dcClients) ? dcClients : [])
      ];
    }
  });

  const { data: policies = [] } = useQuery({
    queryKey: ['policies'],
    queryFn: async () => {
      const p = await base44.entities.PolicyLibrary.list();
      return Array.isArray(p) ? p : [];
    }
  });

  const { data: allDBS = [] } = useQuery({
    queryKey: ['all-dbs-compliance'],
    queryFn: async () => {
      const records = await base44.entities.DBSAndReferences.list();
      return Array.isArray(records) ? records : [];
    }
  });

  const { data: allPreEmployment = [] } = useQuery({
    queryKey: ['all-pre-employment-compliance'],
    queryFn: async () => {
      const records = await base44.entities.PreEmploymentCompliance.list();
      return Array.isArray(records) ? records : [];
    }
  });

  const { data: allInductions = [] } = useQuery({
    queryKey: ['all-inductions-compliance'],
    queryFn: async () => {
      const records = await base44.entities.InductionRecord.list();
      return Array.isArray(records) ? records : [];
    }
  });

  const { data: allTraining = [] } = useQuery({
    queryKey: ['all-training-compliance'],
    queryFn: async () => {
      const records = await base44.entities.TrainingAssignment.list();
      return Array.isArray(records) ? records : [];
    }
  });

  const { data: allConsent = [] } = useQuery({
    queryKey: ['all-consent-compliance'],
    queryFn: async () => {
      const records = await base44.entities.ConsentAndCapacity.list();
      return Array.isArray(records) ? records : [];
    }
  });

  const { data: allAssessments = [] } = useQuery({
    queryKey: ['all-assessments-compliance'],
    queryFn: async () => {
      const records = await base44.entities.CareAssessment.list();
      return Array.isArray(records) ? records : [];
    }
  });

  const { data: allCarePlans = [] } = useQuery({
    queryKey: ['all-careplans-compliance'],
    queryFn: async () => {
      const records = await base44.entities.CarePlan.list();
      return Array.isArray(records) ? records : [];
    }
  });

  // Organisation compliance
  const mandatoryPolicies = policies.filter(p => p.is_mandatory);
  const approvedMandatory = mandatoryPolicies.filter(p => p.status === 'approved');
  const orgCompliant = orgProfile?.organisation_name && 
                       orgProfile?.registered_manager_email &&
                       approvedMandatory.length >= 8;

  // Staff compliance
  const mandatoryTraining = [
    "Safeguarding Adults", "Safeguarding Children", "Health & Safety",
    "Infection Control", "Moving & Handling", "Medication Awareness",
    "GDPR & Confidentiality", "First Aid / BLS"
  ];

  const staffFitToWork = allStaff.filter(s => {
    const preEmp = allPreEmployment.find(p => p.staff_id === s.id && p.status === 'verified');
    const dbs = allDBS.find(d => d.staff_id === s.id && d.dbs_status === 'clear');
    const induction = allInductions.find(i => i.staff_id === s.id && i.status === 'completed');
    const training = allTraining.filter(t => t.staff_id === s.id);
    const hasAllTraining = mandatoryTraining.every(mt => 
      training.some(tr => tr.training_name === mt && tr.status === 'completed')
    );
    return preEmp && dbs && induction && hasAllTraining;
  }).length;

  const dbsExpired = allDBS.filter(dbs => 
    dbs.dbs_review_date && isPast(new Date(dbs.dbs_review_date))
  ).length;

  const dbsExpiringSoon = allDBS.filter(dbs => {
    if (!dbs.dbs_review_date) return false;
    const days = differenceInDays(new Date(dbs.dbs_review_date), new Date());
    return days > 0 && days <= 30;
  }).length;

  const trainingExpiringSoon = allTraining.filter(t => {
    if (!t.expiry_date || t.status !== 'completed') return false;
    const days = differenceInDays(new Date(t.expiry_date), new Date());
    return days > 0 && days <= 30;
  }).length;

  // Client compliance
  const clientsActive = allClients.filter(c => {
    const consent = allConsent.find(co => co.client_id === c.id && co.status === 'obtained');
    const assessment = allAssessments.find(a => a.client_id === c.id && a.status === 'completed');
    const carePlan = allCarePlans.find(cp => cp.client_id === c.id && cp.status === 'active');
    return consent && assessment && carePlan;
  }).length;

  const carePlansOverdueReview = allCarePlans.filter(cp => 
    cp.status === 'active' && cp.next_review_date && isPast(new Date(cp.next_review_date))
  ).length;

  const assessmentsOverdue = allAssessments.filter(a => 
    a.next_review_date && isPast(new Date(a.next_review_date))
  ).length;

  // Policy compliance
  const policiesOverdue = policies.filter(p => 
    p.review_date && isPast(new Date(p.review_date))
  ).length;

  const policiesReviewSoon = policies.filter(p => {
    if (!p.review_date) return false;
    const days = differenceInDays(new Date(p.review_date), new Date());
    return days > 0 && days <= 30;
  }).length;

  // Overall compliance score
  const complianceChecks = [
    { name: "Organisation Setup", passed: orgCompliant },
    { name: "Mandatory Policies", passed: approvedMandatory.length >= 8 },
    { name: "Staff Onboarding", passed: staffFitToWork === allStaff.length },
    { name: "DBS Current", passed: dbsExpired === 0 },
    { name: "Client Onboarding", passed: clientsActive === allClients.length },
    { name: "Care Plans Current", passed: carePlansOverdueReview === 0 }
  ];

  const passedChecks = complianceChecks.filter(c => c.passed).length;
  const complianceScore = Math.round((passedChecks / complianceChecks.length) * 100);

  const criticalIssues = [
    { count: dbsExpired, label: "Expired DBS Checks", type: "critical", link: "StaffOnboarding" },
    { count: policiesOverdue, label: "Overdue Policy Reviews", type: "high", link: "PolicyLibrary" },
    { count: carePlansOverdueReview, label: "Overdue Care Plan Reviews", type: "high", link: "ClientOnboarding" },
    { count: dbsExpiringSoon, label: "DBS Expiring Soon", type: "warning", link: "StaffOnboarding" },
    { count: trainingExpiringSoon, label: "Training Expiring Soon", type: "warning", link: "StaffTraining" },
    { count: policiesReviewSoon, label: "Policies Due Review", type: "warning", link: "PolicyLibrary" }
  ].filter(issue => issue.count > 0);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="w-8 h-8 text-blue-600" />
          Compliance Dashboard
        </h1>
        <p className="text-gray-600 mt-1">
          CQC / Ofsted regulatory compliance overview
        </p>
      </div>

      {/* Overall Compliance Score */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Overall Compliance Score</h3>
              <p className="text-sm text-gray-600">Based on key regulatory requirements</p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold">{complianceScore}%</p>
              <Badge className={complianceScore >= 90 ? 'bg-green-600' : complianceScore >= 70 ? 'bg-amber-600' : 'bg-red-600'}>
                {complianceScore >= 90 ? 'Excellent' : complianceScore >= 70 ? 'Good' : 'Needs Attention'}
              </Badge>
            </div>
          </div>
          <Progress value={complianceScore} className="h-3 mb-4" />
          <div className="grid md:grid-cols-3 gap-3">
            {complianceChecks.map(check => (
              <div key={check.name} className="flex items-center gap-2 text-sm">
                {check.passed ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                )}
                <span className={check.passed ? 'text-gray-700' : 'text-gray-900 font-medium'}>
                  {check.name}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Critical Issues */}
      {criticalIssues.length > 0 && (
        <Card className="mb-6 border-red-300 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-900">
              <AlertTriangle className="w-5 h-5" />
              Action Required ({criticalIssues.filter(i => i.type === 'critical' || i.type === 'high').length} high priority)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {criticalIssues.map((issue, idx) => (
              <Link key={idx} to={createPageUrl(issue.link)}>
                <div className={`p-3 rounded flex items-center justify-between hover:opacity-80 ${
                  issue.type === 'critical' ? 'bg-red-100 border border-red-300' :
                  issue.type === 'high' ? 'bg-amber-100 border border-amber-300' :
                  'bg-yellow-100 border border-yellow-300'
                }`}>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={`w-4 h-4 ${
                      issue.type === 'critical' ? 'text-red-600' :
                      issue.type === 'high' ? 'text-amber-600' : 'text-yellow-600'
                    }`} />
                    <span className="font-medium">{issue.label}</span>
                  </div>
                  <Badge className={
                    issue.type === 'critical' ? 'bg-red-600' :
                    issue.type === 'high' ? 'bg-amber-600' : 'bg-yellow-600'
                  }>
                    {issue.count}
                  </Badge>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      <div className="grid md:grid-cols-3 gap-6 mb-6">
        {/* Organisation */}
        <Link to={createPageUrl("OrganisationSetup")}>
          <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="w-5 h-5 text-purple-600" />
                Organisation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Setup Complete</span>
                {orgCompliant ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                )}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Mandatory Policies</span>
                <Badge>{approvedMandatory.length}/{mandatoryPolicies.length}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Total Policies</span>
                <Badge variant="outline">{policies.length}</Badge>
              </div>
              <div className="pt-2 border-t text-sm text-blue-600 hover:underline">
                View Details →
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Staff */}
        <Link to={createPageUrl("StaffOnboarding")}>
          <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="w-5 h-5 text-blue-600" />
                Staff
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Total Staff</span>
                <Badge>{allStaff.length}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Fit to Work</span>
                <Badge className="bg-green-600">{staffFitToWork}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">DBS Expired</span>
                <Badge className={dbsExpired > 0 ? 'bg-red-600' : 'bg-green-600'}>{dbsExpired}</Badge>
              </div>
              <div className="pt-2 border-t text-sm text-blue-600 hover:underline">
                View Details →
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Clients */}
        <Link to={createPageUrl("ClientOnboarding")}>
          <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <UserCircle className="w-5 h-5 text-green-600" />
                Clients
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Total Clients</span>
                <Badge>{allClients.length}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Active</span>
                <Badge className="bg-green-600">{clientsActive}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Overdue Reviews</span>
                <Badge className={carePlansOverdueReview > 0 ? 'bg-red-600' : 'bg-green-600'}>
                  {carePlansOverdueReview}
                </Badge>
              </div>
              <div className="pt-2 border-t text-sm text-blue-600 hover:underline">
                View Details →
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-3">
            <Link to={createPageUrl("OrganisationSetup")}>
              <div className="p-4 border rounded hover:bg-gray-50 cursor-pointer">
                <Shield className="w-6 h-6 text-purple-600 mb-2" />
                <p className="font-medium text-sm">Organisation Setup</p>
              </div>
            </Link>
            <Link to={createPageUrl("StaffOnboarding")}>
              <div className="p-4 border rounded hover:bg-gray-50 cursor-pointer">
                <Users className="w-6 h-6 text-blue-600 mb-2" />
                <p className="font-medium text-sm">Staff Onboarding</p>
              </div>
            </Link>
            <Link to={createPageUrl("ClientOnboarding")}>
              <div className="p-4 border rounded hover:bg-gray-50 cursor-pointer">
                <UserCircle className="w-6 h-6 text-green-600 mb-2" />
                <p className="font-medium text-sm">Client Onboarding</p>
              </div>
            </Link>
            <Link to={createPageUrl("PolicyLibrary")}>
              <div className="p-4 border rounded hover:bg-gray-50 cursor-pointer">
                <BookOpen className="w-6 h-6 text-purple-600 mb-2" />
                <p className="font-medium text-sm">Policy Library</p>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}