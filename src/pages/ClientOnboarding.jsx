import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  UserCircle, 
  Eye, 
  Search,
  CheckCircle,
  AlertCircle,
  FileCheck,
  ClipboardList,
  Heart,
  Filter
} from "lucide-react";
import ClientOnboardingWorkflow from "@/components/onboarding/ClientOnboardingWorkflow";

export default function ClientOnboarding() {
  const [search, setSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCareType, setFilterCareType] = useState("all");

  const { data: allClients = [] } = useQuery({
    queryKey: ['all-clients-onboarding'],
    queryFn: async () => {
      const clients = await base44.entities.Client.list();
      const domClients = await base44.entities.DomCareClient.list();
      const slClients = await base44.entities.SupportedLivingClient.list();
      const dcClients = await base44.entities.DayCentreClient.list();
      
      return [
        ...(Array.isArray(clients) ? clients.map(c => ({...c, care_type: 'residential'})) : []),
        ...(Array.isArray(domClients) ? domClients.map(c => ({...c, care_type: 'domiciliary'})) : []),
        ...(Array.isArray(slClients) ? slClients.map(c => ({...c, care_type: 'supported_living'})) : []),
        ...(Array.isArray(dcClients) ? dcClients.map(c => ({...c, care_type: 'day_centre'})) : [])
      ];
    }
  });

  const { data: allConsent = [] } = useQuery({
    queryKey: ['all-consent'],
    queryFn: async () => {
      const records = await base44.entities.ConsentAndCapacity.list();
      return Array.isArray(records) ? records : [];
    }
  });

  const { data: allAssessments = [] } = useQuery({
    queryKey: ['all-assessments'],
    queryFn: async () => {
      const records = await base44.entities.CareAssessment.list();
      return Array.isArray(records) ? records : [];
    }
  });

  const { data: allCarePlans = [] } = useQuery({
    queryKey: ['all-careplans-onboarding'],
    queryFn: async () => {
      const records = await base44.entities.CarePlan.list();
      return Array.isArray(records) ? records : [];
    }
  });

  const getClientOnboardingStatus = (clientId) => {
    const consent = allConsent.find(c => c.client_id === clientId && c.status === 'obtained');
    const assessment = allAssessments.find(a => a.client_id === clientId && a.status === 'completed');
    const carePlan = allCarePlans.find(cp => cp.client_id === clientId && cp.status === 'active');

    const checks = {
      consent: !!consent,
      assessment: !!assessment,
      carePlan: !!carePlan
    };

    const completed = Object.values(checks).filter(Boolean).length;
    const percentage = Math.round((completed / 3) * 100);
    const allComplete = completed === 3;
    
    return { checks, completed, percentage, allComplete };
  };

  const clientMetrics = {
    total: allClients.length,
    active: allClients.filter(c => {
      const status = getClientOnboardingStatus(c.id);
      return status.allComplete;
    }).length,
    inProgress: allClients.filter(c => {
      const status = getClientOnboardingStatus(c.id);
      return !status.allComplete && status.completed > 0;
    }).length,
    notStarted: allClients.filter(c => {
      const status = getClientOnboardingStatus(c.id);
      return status.completed === 0;
    }).length
  };

  const filteredClients = allClients
    .filter(c => {
      const matchesSearch = c.full_name?.toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;

      if (filterCareType !== "all" && c.care_type !== filterCareType) return false;

      if (filterStatus === "all") return true;
      
      const status = getClientOnboardingStatus(c.id);
      if (filterStatus === "active") return status.allComplete;
      if (filterStatus === "in_progress") return !status.allComplete && status.completed > 0;
      if (filterStatus === "not_started") return status.completed === 0;
      
      return true;
    });

  const careTypeColors = {
    residential: 'bg-blue-600',
    domiciliary: 'bg-green-600',
    supported_living: 'bg-indigo-600',
    day_centre: 'bg-amber-600'
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <UserCircle className="w-8 h-8 text-blue-600" />
          Client Onboarding Management
        </h1>
        <p className="text-gray-600 mt-1">
          Consent, assessment, and care plan tracking for all clients
        </p>
      </div>

      {/* Metrics */}
      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <UserCircle className="w-6 h-6 text-blue-600 mb-2" />
            <p className="text-3xl font-bold">{clientMetrics.total}</p>
            <p className="text-sm text-gray-600">Total Clients</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <CheckCircle className="w-6 h-6 text-green-600 mb-2" />
            <p className="text-3xl font-bold">{clientMetrics.active}</p>
            <p className="text-sm text-gray-600">Active Clients</p>
            <Badge className="mt-1 bg-green-600 text-white text-xs">
              {Math.round((clientMetrics.active / clientMetrics.total) * 100)}%
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <AlertCircle className="w-6 h-6 text-amber-600 mb-2" />
            <p className="text-3xl font-bold">{clientMetrics.inProgress}</p>
            <p className="text-sm text-gray-600">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <ClipboardList className="w-6 h-6 text-gray-600 mb-2" />
            <p className="text-3xl font-bold">{clientMetrics.notStarted}</p>
            <p className="text-sm text-gray-600">Not Started</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients by name..."
            className="pl-10"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option value="all">All Status</option>
          <option value="active">Active Only</option>
          <option value="in_progress">In Progress</option>
          <option value="not_started">Not Started</option>
        </select>
        <select
          value={filterCareType}
          onChange={(e) => setFilterCareType(e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option value="all">All Care Types</option>
          <option value="residential">Residential</option>
          <option value="domiciliary">Domiciliary</option>
          <option value="supported_living">Supported Living</option>
          <option value="day_centre">Day Centre</option>
        </select>
      </div>

      {/* Client List */}
      <div className="space-y-2">
        {filteredClients.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              <UserCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No clients found</p>
            </CardContent>
          </Card>
        ) : (
          filteredClients.map(client => {
            const onboardingStatus = getClientOnboardingStatus(client.id);
            const isActive = onboardingStatus.allComplete;

            return (
              <Card key={client.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      {isActive ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-amber-600" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{client.full_name}</p>
                          <Badge className={`${careTypeColors[client.care_type]} text-white text-xs capitalize`}>
                            {client.care_type?.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-1">
                          <div className="flex items-center gap-1 text-xs">
                            <FileCheck className={`w-3 h-3 ${onboardingStatus.checks.consent ? 'text-green-600' : 'text-gray-300'}`} />
                            <span className={onboardingStatus.checks.consent ? 'text-green-600' : 'text-gray-500'}>
                              Consent
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-xs">
                            <ClipboardList className={`w-3 h-3 ${onboardingStatus.checks.assessment ? 'text-green-600' : 'text-gray-300'}`} />
                            <span className={onboardingStatus.checks.assessment ? 'text-green-600' : 'text-gray-500'}>
                              Assessment
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-xs">
                            <Heart className={`w-3 h-3 ${onboardingStatus.checks.carePlan ? 'text-green-600' : 'text-gray-300'}`} />
                            <span className={onboardingStatus.checks.carePlan ? 'text-green-600' : 'text-gray-500'}>
                              Care Plan
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-32">
                          <Progress value={onboardingStatus.percentage} className="h-2" />
                        </div>
                        <div className="text-right min-w-[80px]">
                          <p className="text-sm font-medium">{onboardingStatus.percentage}%</p>
                          <p className="text-xs text-gray-500">
                            {onboardingStatus.completed}/3 complete
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
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
          })
        )}
      </div>

      {selectedClient && (
        <ClientOnboardingWorkflow
          clientId={selectedClient.id}
          clientName={selectedClient.full_name}
          onClose={() => setSelectedClient(null)}
        />
      )}
    </div>
  );
}