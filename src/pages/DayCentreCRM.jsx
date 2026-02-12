import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  FileText,
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  Shield,
  Plus,
  Search,
  Filter,
  TrendingUp,
  Archive
} from "lucide-react";
import { Input } from "@/components/ui/input";
import ReferralIntakeDialog from "@/components/crm/ReferralIntakeDialog";
import CaseDetailDialog from "@/components/crm/CaseDetailDialog";
import { format } from "date-fns";

export default function DayCentreCRM() {
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCase, setSelectedCase] = useState(null);
  const [showReferralDialog, setShowReferralDialog] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");

  const { data: cases = [] } = useQuery({
    queryKey: ['cases'],
    queryFn: () => base44.entities.Case.list('-created_date'),
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ['safeguarding-alerts'],
    queryFn: () => base44.entities.SafeguardingAlert.filter({ status: 'open' }),
  });

  const { data: courtDeadlines = [] } = useQuery({
    queryKey: ['court-deadlines'],
    queryFn: async () => {
      const all = await base44.entities.CourtDeadline.list();
      return all.filter(d => d.status === 'upcoming' || d.status === 'overdue');
    },
  });

  // Statistics
  const stats = {
    total: cases.length,
    active: cases.filter(c => c.status === 'active').length,
    pending: cases.filter(c => c.status === 'pending_documentation' || c.status === 'risk_screening').length,
    highRisk: cases.filter(c => c.risk_level === 'high' || c.risk_level === 'critical').length,
    courtMandated: cases.filter(c => c.is_court_mandated).length,
    openAlerts: alerts.length,
    upcomingDeadlines: courtDeadlines.filter(d => d.status === 'upcoming').length,
    overdueDeadlines: courtDeadlines.filter(d => d.status === 'overdue').length,
  };

  const filteredCases = cases.filter(c => {
    const matchesSearch = searchQuery === "" || 
      c.case_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.funding_authority?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterStatus === "all" || c.status === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status) => {
    const colors = {
      pending_documentation: "bg-yellow-100 text-yellow-800",
      risk_screening: "bg-orange-100 text-orange-800",
      accepted_onboarding: "bg-blue-100 text-blue-800",
      active: "bg-green-100 text-green-800",
      review_due: "bg-purple-100 text-purple-800",
      closed: "bg-gray-100 text-gray-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getRiskColor = (level) => {
    const colors = {
      low: "text-green-600",
      medium: "text-yellow-600",
      high: "text-orange-600",
      critical: "text-red-600",
    };
    return colors[level] || "text-gray-600";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Day Centre CRM</h1>
            <p className="text-gray-600 mt-1">Safeguarding-First Case Management System</p>
          </div>
          <Button 
            onClick={() => setShowReferralDialog(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Referral
          </Button>
        </div>

        {/* Key Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
          <Card className="bg-white border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Cases</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <Users className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Cases</p>
                  <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">High Risk</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.highRisk}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Open Alerts</p>
                  <p className="text-2xl font-bold text-red-600">{stats.openAlerts}</p>
                </div>
                <Shield className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alerts Banner */}
        {(stats.openAlerts > 0 || stats.overdueDeadlines > 0) && (
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-red-900">Urgent Attention Required</p>
                  <div className="mt-2 space-y-1 text-sm text-red-800">
                    {stats.openAlerts > 0 && (
                      <p>• {stats.openAlerts} open safeguarding alert{stats.openAlerts > 1 ? 's' : ''}</p>
                    )}
                    {stats.overdueDeadlines > 0 && (
                      <p>• {stats.overdueDeadlines} overdue court deadline{stats.overdueDeadlines > 1 ? 's' : ''}</p>
                    )}
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setActiveTab("alerts")}
                  className="bg-white hover:bg-red-50"
                >
                  View Details
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full max-w-2xl">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="cases">Cases</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
            <TabsTrigger value="deadlines">Deadlines</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Recent Cases */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    Recent Referrals
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {cases.slice(0, 5).map((c) => (
                      <div 
                        key={c.id}
                        className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => setSelectedCase(c)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium text-sm">{c.case_number}</p>
                          <Badge className={getStatusColor(c.status)}>
                            {c.status.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600">
                          {c.funding_authority} • {format(new Date(c.referral_date || c.created_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Court Deadlines */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-purple-600" />
                    Upcoming Deadlines
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {courtDeadlines.slice(0, 5).map((d) => (
                      <div key={d.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium text-sm">{d.deadline_type.replace(/_/g, ' ')}</p>
                          <Badge className={d.status === 'overdue' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}>
                            {d.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600">
                          Due: {format(new Date(d.deadline_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                    ))}
                    {courtDeadlines.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">No upcoming deadlines</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Cases Tab */}
          <TabsContent value="cases" className="space-y-4">
            {/* Search and Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by case number or authority..."
                      className="pl-10"
                    />
                  </div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-4 py-2 border rounded-lg"
                  >
                    <option value="all">All Status</option>
                    <option value="pending_documentation">Pending Documentation</option>
                    <option value="risk_screening">Risk Screening</option>
                    <option value="accepted_onboarding">Onboarding</option>
                    <option value="active">Active</option>
                    <option value="review_due">Review Due</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Cases List */}
            <div className="grid gap-4">
              {filteredCases.map((c) => (
                <Card key={c.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setSelectedCase(c)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{c.case_number}</h3>
                          <Badge className={getStatusColor(c.status)}>
                            {c.status.replace(/_/g, ' ')}
                          </Badge>
                          {c.is_court_mandated && (
                            <Badge className="bg-purple-100 text-purple-800">
                              Court Mandated
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                          <div>
                            <p><span className="font-medium">Referral Type:</span> {c.referral_type?.replace(/_/g, ' ')}</p>
                            <p><span className="font-medium">Legal Status:</span> {c.legal_status?.toUpperCase()}</p>
                          </div>
                          <div>
                            <p><span className="font-medium">Authority:</span> {c.funding_authority || 'N/A'}</p>
                            <p><span className="font-medium">Practitioner:</span> {c.assigned_practitioner_name || 'Unassigned'}</p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-2xl font-bold ${getRiskColor(c.risk_level)}`}>
                          {c.risk_level?.toUpperCase()}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">Risk Level</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-red-600" />
                  Active Safeguarding Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <div key={alert.id} className="p-4 border-l-4 border-red-500 bg-red-50 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-red-900">{alert.alert_type?.replace(/_/g, ' ')}</p>
                          <p className="text-sm text-red-700 mt-1">{alert.description}</p>
                        </div>
                        <Badge className={`${alert.severity === 'critical' ? 'bg-red-600 text-white' : 'bg-red-200 text-red-800'}`}>
                          {alert.severity}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-red-700 mt-3">
                        <span>Service: {alert.service_area?.replace(/_/g, ' ')}</span>
                        <span>•</span>
                        <span>Reported: {format(new Date(alert.alert_date), 'MMM d, yyyy HH:mm')}</span>
                        <span>•</span>
                        <span>Status: {alert.status}</span>
                      </div>
                    </div>
                  ))}
                  {alerts.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                      <p>No active safeguarding alerts</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Deadlines Tab */}
          <TabsContent value="deadlines" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-purple-600" />
                  Court Deadlines & Hearings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {courtDeadlines.map((deadline) => (
                    <div key={deadline.id} className={`p-4 border-l-4 rounded-lg ${
                      deadline.status === 'overdue' ? 'border-red-500 bg-red-50' : 'border-purple-500 bg-purple-50'
                    }`}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold">{deadline.deadline_type?.replace(/_/g, ' ')}</p>
                          <p className="text-sm text-gray-700 mt-1">{deadline.description}</p>
                        </div>
                        <Badge className={deadline.status === 'overdue' ? 'bg-red-600 text-white' : 'bg-purple-600 text-white'}>
                          {deadline.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-700 mt-3">
                        <span>Due: {format(new Date(deadline.deadline_date), 'MMM d, yyyy')}</span>
                        {deadline.court_name && (
                          <>
                            <span>•</span>
                            <span>Court: {deadline.court_name}</span>
                          </>
                        )}
                        {deadline.assigned_to && (
                          <>
                            <span>•</span>
                            <span>Assigned: {deadline.assigned_to}</span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  {courtDeadlines.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                      <p>No upcoming court deadlines</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      {showReferralDialog && (
        <ReferralIntakeDialog onClose={() => setShowReferralDialog(false)} />
      )}

      {selectedCase && (
        <CaseDetailDialog 
          case={selectedCase} 
          onClose={() => setSelectedCase(null)} 
        />
      )}
    </div>
  );
}