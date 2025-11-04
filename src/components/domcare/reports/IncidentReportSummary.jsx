import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Download, Printer, AlertTriangle, Shield, Activity, FileText, CheckCircle } from "lucide-react";
import { format, parseISO, isWithinInterval } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

const SEVERITY_COLORS = {
  low: "bg-blue-100 text-blue-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
};

const STATUS_COLORS = {
  reported: "bg-gray-100 text-gray-800",
  under_investigation: "bg-blue-100 text-blue-800",
  resolved: "bg-green-100 text-green-800",
  closed: "bg-purple-100 text-purple-800",
};

export default function IncidentReportSummary({ staff, clients }) {
  const [dateFrom, setDateFrom] = useState(format(new Date(new Date().setMonth(new Date().getMonth() - 3)), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSeverity, setFilterSeverity] = useState("all");

  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ['incidents'],
    queryFn: () => base44.entities.Incident.list('-incident_date'),
  });

  const getFilteredIncidents = () => {
    return incidents.filter(incident => {
      try {
        const incidentDate = parseISO(incident.incident_date);
        const from = parseISO(dateFrom);
        const to = parseISO(dateTo);
        
        const inRange = isWithinInterval(incidentDate, { start: from, end: to });
        const matchesType = filterType === "all" || incident.incident_type === filterType;
        const matchesStatus = filterStatus === "all" || incident.status === filterStatus;
        const matchesSeverity = filterSeverity === "all" || incident.severity === filterSeverity;
        
        return inRange && matchesType && matchesStatus && matchesSeverity;
      } catch {
        return false;
      }
    });
  };

  const exportToCSV = () => {
    const filtered = getFilteredIncidents();
    const headers = [
      "Incident Date",
      "Type",
      "Severity",
      "Client",
      "Staff",
      "Status",
      "Description",
      "Resolution"
    ];
    const rows = filtered.map(incident => {
      const client = clients.find(c => c.id === incident.client_id);
      const staffMember = staff.find(s => s.id === incident.staff_id);
      return [
        format(parseISO(incident.incident_date), "MMM d, yyyy HH:mm"),
        incident.incident_type,
        incident.severity,
        client?.full_name || "N/A",
        staffMember?.full_name || "N/A",
        incident.status,
        incident.description,
        incident.resolution_notes || "Pending"
      ];
    });

    const csvContent = [
      "Incident Report Summary",
      `Period: ${dateFrom} to ${dateTo}`,
      "",
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `incident-report-${dateFrom}-to-${dateTo}.csv`;
    link.click();
  };

  const filteredIncidents = getFilteredIncidents();
  
  const stats = {
    total: filteredIncidents.length,
    critical: filteredIncidents.filter(i => i.severity === 'critical').length,
    resolved: filteredIncidents.filter(i => i.status === 'resolved' || i.status === 'closed').length,
    pending: filteredIncidents.filter(i => i.status === 'reported' || i.status === 'under_investigation').length,
  };

  const getClientName = (clientId) => clients.find(c => c.id === clientId)?.full_name || "Unknown";
  const getStaffName = (staffId) => staff.find(s => s.id === staffId)?.full_name || "Unknown";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="border-b bg-gradient-to-r from-red-50 to-orange-50">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Incident Report Summary
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">Track and manage incidents and complaints</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportToCSV}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            <div>
              <Label htmlFor="date-from">From Date</Label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="date-to">To Date</Label>
              <Input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="type-filter">Type</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger id="type-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="complaint">Complaint</SelectItem>
                  <SelectItem value="safeguarding">Safeguarding</SelectItem>
                  <SelectItem value="accident">Accident</SelectItem>
                  <SelectItem value="medication_error">Medication Error</SelectItem>
                  <SelectItem value="near_miss">Near Miss</SelectItem>
                  <SelectItem value="equipment_failure">Equipment</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="severity-filter">Severity</Label>
              <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                <SelectTrigger id="severity-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status-filter">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger id="status-filter">
                  <SelectValue />
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
            <div className="flex items-end">
              <Button 
                onClick={() => {
                  setDateFrom(format(new Date(new Date().setMonth(new Date().getMonth() - 3)), "yyyy-MM-dd"));
                  setDateTo(format(new Date(), "yyyy-MM-dd"));
                  setFilterType("all");
                  setFilterStatus("all");
                  setFilterSeverity("all");
                }}
                variant="outline"
                className="w-full"
              >
                Reset
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <p className="text-sm font-medium text-blue-900">Total Incidents</p>
                </div>
                <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
              </CardContent>
            </Card>

            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="w-4 h-4 text-red-600" />
                  <p className="text-sm font-medium text-red-900">Critical</p>
                </div>
                <p className="text-2xl font-bold text-red-900">{stats.critical}</p>
              </CardContent>
            </Card>

            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <p className="text-sm font-medium text-green-900">Resolved</p>
                </div>
                <p className="text-2xl font-bold text-green-900">{stats.resolved}</p>
              </CardContent>
            </Card>

            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="w-4 h-4 text-yellow-600" />
                  <p className="text-sm font-medium text-yellow-900">Pending</p>
                </div>
                <p className="text-2xl font-bold text-yellow-900">{stats.pending}</p>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-3">
            {filteredIncidents.length === 0 ? (
              <div className="text-center py-12 text-gray-500 border rounded-lg">
                <Shield className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No incidents found for the selected criteria</p>
              </div>
            ) : (
              filteredIncidents.map(incident => (
                <Card key={incident.id} className="border-l-4" style={{
                  borderLeftColor: incident.severity === 'critical' ? '#dc2626' : 
                                   incident.severity === 'high' ? '#ea580c' :
                                   incident.severity === 'medium' ? '#ca8a04' : '#3b82f6'
                }}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-gray-900 capitalize">
                            {incident.incident_type.replace('_', ' ')}
                          </h3>
                          <Badge className={SEVERITY_COLORS[incident.severity]}>
                            {incident.severity}
                          </Badge>
                          <Badge className={STATUS_COLORS[incident.status]}>
                            {incident.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500 mb-2">
                          {format(parseISO(incident.incident_date), "EEEE, MMMM d, yyyy 'at' HH:mm")}
                        </p>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 mb-3">
                      <div>
                        <p className="text-xs font-medium text-gray-600">Client</p>
                        <p className="text-sm text-gray-900">{getClientName(incident.client_id)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-600">Staff Member</p>
                        <p className="text-sm text-gray-900">{getStaffName(incident.staff_id)}</p>
                      </div>
                      {incident.location && (
                        <div>
                          <p className="text-xs font-medium text-gray-600">Location</p>
                          <p className="text-sm text-gray-900">{incident.location}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-medium text-gray-600">Reported</p>
                        <p className="text-sm text-gray-900">
                          {format(parseISO(incident.reported_date || incident.created_date), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>

                    <div className="mb-3">
                      <p className="text-xs font-medium text-gray-600 mb-1">Description</p>
                      <p className="text-sm text-gray-700">{incident.description}</p>
                    </div>

                    {incident.immediate_action_taken && (
                      <div className="mb-3">
                        <p className="text-xs font-medium text-gray-600 mb-1">Immediate Action</p>
                        <p className="text-sm text-gray-700">{incident.immediate_action_taken}</p>
                      </div>
                    )}

                    {incident.resolution_notes && (
                      <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                        <p className="text-xs font-medium text-green-800 mb-1">Resolution</p>
                        <p className="text-sm text-green-900">{incident.resolution_notes}</p>
                        {incident.resolved_date && (
                          <p className="text-xs text-green-700 mt-1">
                            Resolved on {format(parseISO(incident.resolved_date), "MMM d, yyyy")}
                          </p>
                        )}
                      </div>
                    )}

                    {incident.preventive_measures && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-xs font-medium text-blue-800 mb-1">Preventive Measures</p>
                        <p className="text-sm text-blue-900">{incident.preventive_measures}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}