import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Users, 
  Lock, 
  Unlock, 
  Eye, 
  Search,
  Plus,
  AlertTriangle,
  CheckCircle,
  Shield
} from "lucide-react";
import { differenceInDays, isPast } from "date-fns";
import StaffOnboardingWorkflow from "@/components/onboarding/StaffOnboardingWorkflow";

export default function StaffOnboarding() {
  const [search, setSearch] = useState("");
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const queryClient = useQueryClient();

  const { data: allStaff = [] } = useQuery({
    queryKey: ['all-staff-onboarding'],
    queryFn: async () => {
      const staff = await base44.entities.Staff.list();
      const carers = await base44.entities.Carer.list();
      return [...(staff || []), ...(carers || [])];
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
    queryKey: ['all-dbs'],
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
    queryKey: ['all-training'],
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
    const allComplete = completed === 5;
    
    return { checks, completed, percentage, allComplete };
  };

  const staffMetrics = {
    total: allStaff.length,
    fitToWork: allStaff.filter(s => {
      const status = getStaffOnboardingStatus(s.id);
      return status.allComplete;
    }).length,
    inProgress: allStaff.filter(s => {
      const status = getStaffOnboardingStatus(s.id);
      return !status.allComplete && status.completed > 0;
    }).length,
    notStarted: allStaff.filter(s => {
      const status = getStaffOnboardingStatus(s.id);
      return status.completed === 0;
    }).length,
    dbsExpiringSoon: allDBS.filter(dbs => {
      if (!dbs.dbs_review_date) return false;
      const days = differenceInDays(new Date(dbs.dbs_review_date), new Date());
      return days > 0 && days <= 30;
    }).length,
    dbsExpired: allDBS.filter(dbs => 
      dbs.dbs_review_date && isPast(new Date(dbs.dbs_review_date))
    ).length
  };

  const filteredStaff = allStaff
    .filter(s => {
      const matchesSearch = s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
                           s.email?.toLowerCase().includes(search.toLowerCase());
      
      if (!matchesSearch) return false;

      if (filterStatus === "all") return true;
      
      const status = getStaffOnboardingStatus(s.id);
      if (filterStatus === "approved") return status.allComplete;
      if (filterStatus === "in_progress") return !status.allComplete && status.completed > 0;
      if (filterStatus === "not_started") return status.completed === 0;
      
      return true;
    });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Users className="w-8 h-8 text-blue-600" />
          Staff Onboarding Management
        </h1>
        <p className="text-gray-600 mt-1">
          Pre-employment checks, DBS, training, and induction tracking
        </p>
      </div>

      {/* Metrics */}
      <div className="grid md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <Users className="w-6 h-6 text-blue-600 mb-2" />
            <p className="text-3xl font-bold">{staffMetrics.total}</p>
            <p className="text-sm text-gray-600">Total Staff</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Unlock className="w-6 h-6 text-green-600 mb-2" />
            <p className="text-3xl font-bold">{staffMetrics.fitToWork}</p>
            <p className="text-sm text-gray-600">Fit to Work</p>
            <Badge className="mt-1 bg-green-600 text-white text-xs">
              {Math.round((staffMetrics.fitToWork / staffMetrics.total) * 100)}%
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Lock className="w-6 h-6 text-amber-600 mb-2" />
            <p className="text-3xl font-bold">{staffMetrics.inProgress}</p>
            <p className="text-sm text-gray-600">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Shield className="w-6 h-6 text-orange-600 mb-2" />
            <p className="text-3xl font-bold">{staffMetrics.dbsExpiringSoon}</p>
            <p className="text-sm text-gray-600">DBS Expiring</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <AlertTriangle className="w-6 h-6 text-red-600 mb-2" />
            <p className="text-3xl font-bold">{staffMetrics.dbsExpired}</p>
            <p className="text-sm text-gray-600">DBS Expired</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {staffMetrics.dbsExpired > 0 && (
        <Card className="mb-6 border-red-300 bg-red-50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <div>
              <p className="font-semibold text-red-900">URGENT: {staffMetrics.dbsExpired} staff with expired DBS</p>
              <p className="text-sm text-red-700">These staff members cannot work until DBS is renewed</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search staff by name or email..."
            className="pl-10"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option value="all">All Staff</option>
          <option value="approved">Approved Only</option>
          <option value="in_progress">In Progress</option>
          <option value="not_started">Not Started</option>
        </select>
      </div>

      {/* Staff List */}
      <div className="space-y-2">
        {filteredStaff.map(staff => {
          const onboardingStatus = getStaffOnboardingStatus(staff.id);
          const isFitToWork = onboardingStatus.allComplete;

          return (
            <Card key={staff.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    {isFitToWork ? (
                      <Unlock className="w-5 h-5 text-green-600" />
                    ) : (
                      <Lock className="w-5 h-5 text-amber-600" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{staff.full_name}</p>
                      <p className="text-sm text-gray-600">{staff.email}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-32">
                        <Progress value={onboardingStatus.percentage} className="h-2" />
                      </div>
                      <div className="text-right min-w-[80px]">
                        <p className="text-sm font-medium">{onboardingStatus.percentage}%</p>
                        <p className="text-xs text-gray-500">
                          {onboardingStatus.completed}/5 complete
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Badge className={isFitToWork ? 'bg-green-600' : 'bg-amber-600'}>
                      {isFitToWork ? 'Fit to Work' : 'Onboarding'}
                    </Badge>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setSelectedStaff(staff)}
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