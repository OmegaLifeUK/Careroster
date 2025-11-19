import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Shield,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  Download,
  FileText,
  Eye,
  Clock,
  CheckCircle
} from "lucide-react";
import { format, parseISO, isWithinInterval, subMonths } from "date-fns";

import IncidentForm from "../components/incidents/IncidentForm";
import IncidentDetail from "../components/incidents/IncidentDetail";
import PredictiveIncidentAnalyzer from "../components/incidents/PredictiveIncidentAnalyzer";
import AIIncidentAnalyzer from "../components/incidents/AIIncidentAnalyzer";

const SEVERITY_COLORS = {
  low: "bg-blue-100 text-blue-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
};

const STATUS_COLORS = {
  reported: "bg-gray-100 text-gray-800",
  under_investigation: "bg-blue-100 text-blue-800",
  investigated: "bg-purple-100 text-purple-800",
  resolved: "bg-green-100 text-green-800",
  closed: "bg-gray-400 text-gray-800",
  referred_externally: "bg-orange-100 text-orange-800",
};

export default function IncidentManagement() {
  const [showForm, setShowForm] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [showSafeguardingOnly, setShowSafeguardingOnly] = useState(false);
  const [dateFrom, setDateFrom] = useState(format(subMonths(new Date(), 3), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd"));

  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ['incidents'],
    queryFn: () => base44.entities.Incident.list('-incident_date'),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: domCareClients = [] } = useQuery({
    queryKey: ['domcare-clients'],
    queryFn: () => base44.entities.DomCareClient.list(),
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: () => base44.entities.Staff.list(),
  });

  const { data: carers = [] } = useQuery({
    queryKey: ['carers'],
    queryFn: () => base44.entities.Carer.list(),
  });

  const allClients = [...clients, ...domCareClients];
  const allStaff = [...staff, ...carers];

  const getFilteredIncidents = () => {
    return incidents.filter(incident => {
      try {
        // Date range filter
        const incidentDate = parseISO(incident.incident_date);
        const from = parseISO(dateFrom);
        const to = parseISO(dateTo);
        const inRange = isWithinInterval(incidentDate, { start: from, end: to });
        
        // Search filter
        const client = allClients.find(c => c.id === incident.client_id);
        const matchesSearch = 
          incident.incident_reference?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          client?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          incident.description?.toLowerCase().includes(searchQuery.toLowerCase());
        
        // Type filter
        const matchesType = filterType === "all" || incident.incident_type === filterType;
        
        // Status filter
        const matchesStatus = filterStatus === "all" || incident.status === filterStatus;
        
        // Severity filter
        const matchesSeverity = filterSeverity === "all" || incident.severity === filterSeverity;
        
        // Safeguarding filter
        const matchesSafeguarding = !showSafeguardingOnly || incident.is_safeguarding_concern;
        
        return inRange && matchesSearch && matchesType && matchesStatus && matchesSeverity && matchesSafeguarding;
      } catch {
        return false;
      }
    });
  };

  const filteredIncidents = getFilteredIncidents();

  const stats = {
    total: incidents.length,
    open: incidents.filter(i => i.status === 'reported' || i.status === 'under_investigation').length,
    safeguarding: incidents.filter(i => i.is_safeguarding_concern).length,
    requiresCQC: incidents.filter(i => i.requires_notification_to_cqc && !i.cqc_notification_sent).length,
    critical: incidents.filter(i => i.severity === 'critical' && i.status !== 'closed').length,
  };

  const exportToCSV = () => {
    const headers = [
      "Reference",
      "Date",
      "Type",
      "Severity",
      "Client",
      "Status",
      "Safeguarding",
      "CQC Notifiable"
    ];
    
    const rows = filteredIncidents.map(incident => {
      const client = allClients.find(c => c.id === incident.client_id);
      return [
        incident.incident_reference || incident.id,
        format(parseISO(incident.incident_date), "yyyy-MM-dd HH:mm"),
        incident.incident_type,
        incident.severity,
        client?.full_name || "Unknown",
        incident.status,
        incident.is_safeguarding_concern ? "Yes" : "No",
        incident.requires_notification_to_cqc ? "Yes" : "No"
      ];
    });

    const csvContent = [
      "CQC Compliant Incident Report",
      `Period: ${dateFrom} to ${dateTo}`,
      "",
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `incident-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

  if (selectedIncident) {
    return (
      <div className="p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <Button variant="outline" onClick={() => setSelectedIncident(null)} className="mb-4">
            ← Back to Incidents
          </Button>
          <IncidentDetail
            incident={selectedIncident}
            clients={allClients}
            staff={allStaff}
            onClose={() => setSelectedIncident(null)}
          />
          <div className="mt-6">
            <AIIncidentAnalyzer incident={selectedIncident} />
          </div>
        </div>
      </div>
    );
  }

  if (showForm) {
    return (
      <IncidentForm
        clients={allClients}
        staff={allStaff}
        onClose={() => setShowForm(false)}
      />
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
              <Shield className="w-8 h-8 text-red-600" />
              CQC Incident Management
            </h1>
            <p className="text-gray-500">Record, investigate, and report incidents in line with CQC regulations</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={exportToCSV} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button onClick={() => setShowForm(true)} className="bg-red-600 hover:bg-red-700">
              <Plus className="w-4 h-4 mr-2" />
              Report Incident
            </Button>
          </div>
        </div>

        {/* Alert Banner for Critical Items */}
        {(stats.requiresCQC > 0 || stats.critical > 0) && (
          <Card className="mb-6 border-l-4 border-red-500 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-red-600 animate-pulse" />
                <div className="flex-1">
                  <h3 className="font-semibold text-red-900">Urgent Action Required</h3>
                  <div className="flex flex-wrap gap-4 mt-2 text-sm">
                    {stats.requiresCQC > 0 && (
                      <span className="text-red-800">• {stats.requiresCQC} incident{stats.requiresCQC !== 1 ? 's' : ''} require CQC notification</span>
                    )}
                    {stats.critical > 0 && (
                      <span className="text-red-800">• {stats.critical} critical incident{stats.critical !== 1 ? 's' : ''} open</span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-4 h-4 text-blue-600" />
                <p className="text-sm font-medium text-blue-900">Total</p>
              </div>
              <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
            </CardContent>
          </Card>

          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-orange-600" />
                <p className="text-sm font-medium text-orange-900">Open</p>
              </div>
              <p className="text-2xl font-bold text-orange-900">{stats.open}</p>
            </CardContent>
          </Card>

          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-4 h-4 text-red-600" />
                <p className="text-sm font-medium text-red-900">Safeguarding</p>
              </div>
              <p className="text-2xl font-bold text-red-900">{stats.safeguarding}</p>
            </CardContent>
          </Card>

          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-purple-600" />
                <p className="text-sm font-medium text-purple-900">CQC Pending</p>
              </div>
              <p className="text-2xl font-bold text-purple-900">{stats.requiresCQC}</p>
            </CardContent>
          </Card>

          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <p className="text-sm font-medium text-green-900">Resolved</p>
              </div>
              <p className="text-2xl font-bold text-green-900">
                {incidents.filter(i => i.status === 'resolved' || i.status === 'closed').length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div className="md:col-span-2 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search incidents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  placeholder="From date"
                />
              </div>

              <div>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  placeholder="To date"
                />
              </div>

              <div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="safeguarding_concern">Safeguarding</SelectItem>
                    <SelectItem value="accident">Accident</SelectItem>
                    <SelectItem value="fall">Fall</SelectItem>
                    <SelectItem value="medication_error">Medication Error</SelectItem>
                    <SelectItem value="abuse_allegation">Abuse Allegation</SelectItem>
                    <SelectItem value="complaint">Complaint</SelectItem>
                    <SelectItem value="death">Death</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="reported">Reported</SelectItem>
                    <SelectItem value="under_investigation">Under Investigation</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-4 mt-4 items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showSafeguardingOnly}
                  onChange={(e) => setShowSafeguardingOnly(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm font-medium text-gray-700">Safeguarding Only</span>
              </label>
              
              <Button
                onClick={() => {
                  setSearchQuery("");
                  setFilterType("all");
                  setFilterStatus("all");
                  setFilterSeverity("all");
                  setShowSafeguardingOnly(false);
                  setDateFrom(format(subMonths(new Date(), 3), "yyyy-MM-dd"));
                  setDateTo(format(new Date(), "yyyy-MM-dd"));
                }}
                variant="outline"
                size="sm"
              >
                Reset Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Incidents List */}
        <div className="space-y-3">
          {isLoading ? (
            <p className="text-center text-gray-500 py-8">Loading incidents...</p>
          ) : filteredIncidents.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Shield className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No incidents found</h3>
                <p className="text-gray-500 mb-4">No incidents match the selected criteria</p>
                <Button onClick={() => setShowForm(true)} className="bg-red-600 hover:bg-red-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Report First Incident
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredIncidents.map((incident) => {
              const client = allClients.find(c => c.id === incident.client_id);
              
              return (
                <Card
                  key={incident.id}
                  className={`border-l-4 hover:shadow-lg transition-shadow cursor-pointer ${
                    incident.is_safeguarding_concern ? 'border-red-500 bg-red-50' :
                    incident.severity === 'critical' ? 'border-red-500' :
                    incident.severity === 'high' ? 'border-orange-500' :
                    'border-blue-500'
                  }`}
                  onClick={() => setSelectedIncident(incident)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h3 className="font-semibold text-lg capitalize">
                            {incident.incident_type.replace(/_/g, ' ')}
                          </h3>
                          <Badge className={SEVERITY_COLORS[incident.severity]}>
                            {incident.severity}
                          </Badge>
                          <Badge className={STATUS_COLORS[incident.status]}>
                            {incident.status.replace(/_/g, ' ')}
                          </Badge>
                          {incident.is_safeguarding_concern && (
                            <Badge className="bg-red-500 text-white animate-pulse">
                              SAFEGUARDING
                            </Badge>
                          )}
                          {incident.requires_notification_to_cqc && !incident.cqc_notification_sent && (
                            <Badge className="bg-purple-500 text-white">
                              CQC NOTIFICATION REQUIRED
                            </Badge>
                          )}
                          {incident.incident_reference && (
                            <Badge variant="outline">
                              Ref: {incident.incident_reference}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {format(parseISO(incident.incident_date), "EEEE, MMMM d, yyyy 'at' HH:mm")}
                        </p>
                        {client && (
                          <p className="text-sm font-medium text-gray-900">
                            Client: {client.full_name}
                          </p>
                        )}
                      </div>
                      <Button variant="outline" size="sm" onClick={(e) => {
                        e.stopPropagation();
                        setSelectedIncident(incident);
                      }}>
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                    </div>

                    <p className="text-sm text-gray-700 line-clamp-2 mb-3">
                      {incident.description}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      {incident.location && (
                        <span>Location: {incident.location}</span>
                      )}
                      {incident.immediate_action_taken && (
                        <span className="text-green-700">• Action taken</span>
                      )}
                      {incident.authorities_notified && incident.authorities_notified.length > 0 && (
                        <span className="text-blue-700">• {incident.authorities_notified.length} authorities notified</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}