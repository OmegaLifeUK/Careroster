import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  FileText, 
  Download, 
  Filter,
  Calendar,
  Shield,
  AlertCircle,
  CheckCircle,
  Info
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/components/ui/toast";
import RegulatoryReportDialog from "@/components/audit/RegulatoryReportDialog";

export default function AuditLog() {
  const [filters, setFilters] = useState({
    event_type: "all",
    event_category: "all",
    service_area: "all",
    start_date: "",
    end_date: "",
    search: ""
  });
  const [showReportDialog, setShowReportDialog] = useState(false);

  const { toast } = useToast();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: async () => {
      let allLogs = await base44.entities.AuditLog.list('-log_date', 500);
      
      // Apply filters
      let filtered = Array.isArray(allLogs) ? allLogs : [];
      
      if (filters.event_type !== "all") {
        filtered = filtered.filter(log => log.event_type === filters.event_type);
      }
      
      if (filters.event_category !== "all") {
        filtered = filtered.filter(log => log.event_category === filters.event_category);
      }
      
      if (filters.service_area !== "all") {
        filtered = filtered.filter(log => log.service_area === filters.service_area);
      }
      
      if (filters.start_date) {
        filtered = filtered.filter(log => log.log_date >= filters.start_date);
      }
      
      if (filters.end_date) {
        filtered = filtered.filter(log => log.log_date <= filters.end_date);
      }
      
      if (filters.search) {
        const search = filters.search.toLowerCase();
        filtered = filtered.filter(log => 
          log.action?.toLowerCase().includes(search) ||
          log.entity_name?.toLowerCase().includes(search) ||
          log.performed_by_name?.toLowerCase().includes(search)
        );
      }
      
      return filtered;
    },
  });

  const severityColors = {
    info: "bg-blue-100 text-blue-800",
    low: "bg-gray-100 text-gray-800",
    medium: "bg-yellow-100 text-yellow-800",
    high: "bg-orange-100 text-orange-800",
    critical: "bg-red-100 text-red-800"
  };

  const severityIcons = {
    info: Info,
    low: CheckCircle,
    medium: AlertCircle,
    high: AlertCircle,
    critical: AlertCircle
  };

  const exportToCSV = () => {
    const headers = ["Date", "Event Type", "Category", "Action", "Entity", "Performed By", "Severity", "Service Area"];
    const rows = logs.map(log => [
      format(new Date(log.log_date), 'yyyy-MM-dd HH:mm:ss'),
      log.event_type,
      log.event_category,
      log.action,
      log.entity_name || log.entity_id || "",
      log.performed_by_name || log.performed_by,
      log.severity,
      log.service_area || ""
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    
    toast.success("Success", "Audit log exported to CSV");
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
              <FileText className="w-8 h-8 text-indigo-600" />
              Audit Log
            </h1>
            <p className="text-gray-500">Complete system audit trail for regulatory compliance</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowReportDialog(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Shield className="w-4 h-4 mr-2" />
              Generate CQC/Ofsted Report
            </Button>
            <Button
              variant="outline"
              onClick={exportToCSV}
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="w-5 h-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Event Type</label>
                <Select value={filters.event_type} onValueChange={(value) => setFilters({...filters, event_type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="staff_onboarding">Staff Onboarding</SelectItem>
                    <SelectItem value="client_onboarding">Client Onboarding</SelectItem>
                    <SelectItem value="dbs_check">DBS Check</SelectItem>
                    <SelectItem value="training_completion">Training</SelectItem>
                    <SelectItem value="incident_report">Incident</SelectItem>
                    <SelectItem value="safeguarding_alert">Safeguarding</SelectItem>
                    <SelectItem value="care_plan_update">Care Plan</SelectItem>
                    <SelectItem value="audit_completion">Audit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Category</label>
                <Select value={filters.event_category} onValueChange={(value) => setFilters({...filters, event_category: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="compliance">Compliance</SelectItem>
                    <SelectItem value="safeguarding">Safeguarding</SelectItem>
                    <SelectItem value="quality">Quality</SelectItem>
                    <SelectItem value="hr">HR</SelectItem>
                    <SelectItem value="clinical">Clinical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Service Area</label>
                <Select value={filters.service_area} onValueChange={(value) => setFilters({...filters, service_area: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Areas</SelectItem>
                    <SelectItem value="residential_care">Residential</SelectItem>
                    <SelectItem value="domiciliary_care">Domiciliary</SelectItem>
                    <SelectItem value="supported_living">Supported Living</SelectItem>
                    <SelectItem value="day_centre">Day Centre</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Start Date</label>
                <Input
                  type="date"
                  value={filters.start_date}
                  onChange={(e) => setFilters({...filters, start_date: e.target.value})}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">End Date</label>
                <Input
                  type="date"
                  value={filters.end_date}
                  onChange={(e) => setFilters({...filters, end_date: e.target.value})}
                />
              </div>
            </div>

            <div className="mt-4">
              <Input
                placeholder="Search by action, entity, or user..."
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
              />
            </div>

            <div className="mt-4 flex justify-between items-center">
              <p className="text-sm text-gray-600">{logs.length} records found</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters({
                  event_type: "all",
                  event_category: "all",
                  service_area: "all",
                  start_date: "",
                  end_date: "",
                  search: ""
                })}
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Audit Log Entries */}
        <Card>
          <CardHeader>
            <CardTitle>Log Entries</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12 text-gray-500">Loading audit logs...</div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No audit logs found</div>
            ) : (
              <div className="space-y-3">
                {logs.map((log) => {
                  const SeverityIcon = severityIcons[log.severity] || Info;
                  
                  return (
                    <div key={log.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          <SeverityIcon className={`w-5 h-5 ${
                            log.severity === 'critical' || log.severity === 'high' ? 'text-red-600' :
                            log.severity === 'medium' ? 'text-yellow-600' : 'text-blue-600'
                          }`} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-medium text-gray-900">{log.action}</p>
                              <div className="flex flex-wrap gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {log.event_type.replace(/_/g, ' ')}
                                </Badge>
                                <Badge className={severityColors[log.severity]}>
                                  {log.severity}
                                </Badge>
                                {log.event_category && (
                                  <Badge variant="outline" className="text-xs">
                                    {log.event_category}
                                  </Badge>
                                )}
                                {log.service_area && (
                                  <Badge variant="outline" className="text-xs">
                                    {log.service_area.replace(/_/g, ' ')}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="text-right text-sm text-gray-500 flex-shrink-0 ml-4">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(log.log_date), 'dd/MM/yyyy HH:mm')}
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-sm text-gray-600 space-y-1">
                            {log.entity_name && (
                              <p><span className="font-medium">Entity:</span> {log.entity_name}</p>
                            )}
                            {log.performed_by_name && (
                              <p><span className="font-medium">Performed by:</span> {log.performed_by_name}</p>
                            )}
                            {log.details && Object.keys(log.details).length > 0 && (
                              <details className="mt-2">
                                <summary className="cursor-pointer text-blue-600 hover:underline text-xs">
                                  View Details
                                </summary>
                                <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {showReportDialog && (
        <RegulatoryReportDialog
          logs={logs}
          onClose={() => setShowReportDialog(false)}
        />
      )}
    </div>
  );
}