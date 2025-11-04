import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  AlertTriangle, 
  Plus, 
  CheckCircle, 
  XCircle, 
  Archive, 
  Eye,
  Bell,
  Filter,
  AlertCircle as AlertIcon
} from "lucide-react";
import { format, parseISO, isPast } from "date-fns";

const ALERT_TYPE_ICONS = {
  fall_risk: AlertTriangle,
  dietary: AlertIcon,
  behavioral: Bell,
  medical: AlertTriangle,
  medication: AlertIcon,
  mobility: AlertTriangle,
  communication: Bell,
  safeguarding: AlertTriangle,
  allergy: AlertTriangle,
  other: Bell,
};

const SEVERITY_COLORS = {
  low: "bg-blue-100 text-blue-800 border-blue-300",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-300",
  high: "bg-orange-100 text-orange-800 border-orange-300",
  critical: "bg-red-100 text-red-800 border-red-300",
};

const STATUS_COLORS = {
  active: "bg-green-100 text-green-800",
  resolved: "bg-gray-100 text-gray-800",
  archived: "bg-purple-100 text-purple-800",
};

export default function ClientAlertManager({ client }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterStatus, setFilterStatus] = useState("active");
  const [filterType, setFilterType] = useState("all");
  const [sortBy, setSortBy] = useState("severity");
  
  const [formData, setFormData] = useState({
    alert_type: "medical",
    severity: "medium",
    title: "",
    description: "",
    action_required: "",
    expiry_date: "",
    display_on_sections: ["all"],
    requires_acknowledgment: false,
  });

  const queryClient = useQueryClient();

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['client-alerts', client.id],
    queryFn: async () => {
      const alertsList = await base44.entities.ClientAlert.filter({ client_id: client.id }, '-created_date');
      return alertsList;
    },
  });

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: () => base44.entities.Staff.list(),
  });

  const addAlertMutation = useMutation({
    mutationFn: (data) => base44.entities.ClientAlert.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-alerts'] });
      setShowAddForm(false);
      resetForm();
    },
  });

  const updateAlertMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ClientAlert.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-alerts'] });
    },
  });

  const resetForm = () => {
    setFormData({
      alert_type: "medical",
      severity: "medium",
      title: "",
      description: "",
      action_required: "",
      expiry_date: "",
      display_on_sections: ["all"],
      requires_acknowledgment: false,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const staffMember = staff.find(s => s.email === currentUser?.email);
    
    await addAlertMutation.mutate({
      client_id: client.id,
      ...formData,
      created_by_staff_id: staffMember?.id || currentUser?.id || "system",
      acknowledgments: [],
    });
  };

  const handleResolveAlert = (alert) => {
    const staffMember = staff.find(s => s.email === currentUser?.email);
    updateAlertMutation.mutate({
      id: alert.id,
      data: {
        ...alert,
        status: "resolved",
        resolved_by_staff_id: staffMember?.id || currentUser?.id,
        resolved_date: new Date().toISOString(),
      }
    });
  };

  const handleArchiveAlert = (alert) => {
    updateAlertMutation.mutate({
      id: alert.id,
      data: { ...alert, status: "archived" }
    });
  };

  const handleAcknowledgeAlert = (alert) => {
    const staffMember = staff.find(s => s.email === currentUser?.email);
    const acknowledgments = alert.acknowledgments || [];
    
    // Check if already acknowledged
    if (acknowledgments.some(a => a.staff_id === staffMember?.id)) {
      return;
    }

    updateAlertMutation.mutate({
      id: alert.id,
      data: {
        ...alert,
        acknowledgments: [
          ...acknowledgments,
          {
            staff_id: staffMember?.id || currentUser?.id,
            staff_name: staffMember?.full_name || currentUser?.full_name,
            acknowledged_at: new Date().toISOString(),
          }
        ]
      }
    });
  };

  const handleSectionToggle = (section) => {
    setFormData(prev => {
      const sections = prev.display_on_sections || [];
      if (section === 'all') {
        return { ...prev, display_on_sections: ['all'] };
      }
      
      const filtered = sections.filter(s => s !== 'all');
      const hasSection = filtered.includes(section);
      
      return {
        ...prev,
        display_on_sections: hasSection 
          ? filtered.filter(s => s !== section)
          : [...filtered, section]
      };
    });
  };

  const getFilteredAndSortedAlerts = () => {
    let filtered = alerts.filter(alert => {
      const matchesSeverity = filterSeverity === "all" || alert.severity === filterSeverity;
      const matchesStatus = filterStatus === "all" || alert.status === filterStatus;
      const matchesType = filterType === "all" || alert.alert_type === filterType;
      
      // Check if expired
      const isExpired = alert.expiry_date && alert.status === 'active' && isPast(parseISO(alert.expiry_date));
      
      return matchesSeverity && matchesStatus && matchesType && !isExpired;
    });

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === "severity") {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      } else if (sortBy === "date") {
        return new Date(b.created_date) - new Date(a.created_date);
      } else if (sortBy === "type") {
        return a.alert_type.localeCompare(b.alert_type);
      }
      return 0;
    });

    return filtered;
  };

  const getStaffName = (staffId) => {
    const staffMember = staff.find(s => s.id === staffId);
    return staffMember?.full_name || "Unknown Staff";
  };

  const filteredAlerts = getFilteredAndSortedAlerts();
  const activeCount = alerts.filter(a => a.status === 'active').length;
  const criticalCount = alerts.filter(a => a.severity === 'critical' && a.status === 'active').length;

  return (
    <Card>
      <CardHeader className="border-b bg-gradient-to-r from-red-50 to-orange-50">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Client Alerts
              {activeCount > 0 && (
                <Badge className="bg-red-500 text-white">
                  {activeCount} Active
                </Badge>
              )}
              {criticalCount > 0 && (
                <Badge className="bg-red-600 text-white animate-pulse">
                  {criticalCount} Critical
                </Badge>
              )}
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">Manage important alerts and warnings for this client</p>
          </div>
          <Button onClick={() => setShowAddForm(!showAddForm)} size="sm" className="bg-red-600 hover:bg-red-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Alert
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {showAddForm && (
          <form onSubmit={handleSubmit} className="mb-6 p-4 border-2 border-red-200 rounded-lg bg-red-50">
            <h3 className="font-semibold mb-4 flex items-center gap-2 text-red-900">
              <AlertTriangle className="w-4 h-4" />
              Create New Alert
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="alert_type">Alert Type *</Label>
                <Select
                  value={formData.alert_type}
                  onValueChange={(value) => setFormData({ ...formData, alert_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fall_risk">Fall Risk</SelectItem>
                    <SelectItem value="dietary">Dietary Requirement</SelectItem>
                    <SelectItem value="behavioral">Behavioral Note</SelectItem>
                    <SelectItem value="medical">Medical Condition</SelectItem>
                    <SelectItem value="medication">Medication Alert</SelectItem>
                    <SelectItem value="mobility">Mobility Issue</SelectItem>
                    <SelectItem value="communication">Communication Need</SelectItem>
                    <SelectItem value="safeguarding">Safeguarding Concern</SelectItem>
                    <SelectItem value="allergy">Allergy</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="severity">Severity *</Label>
                <Select
                  value={formData.severity}
                  onValueChange={(value) => setFormData({ ...formData, severity: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="title">Alert Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  placeholder="e.g., High Fall Risk - Use Walking Frame"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="description">Detailed Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  placeholder="Provide detailed information about this alert..."
                  rows={3}
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="action_required">Action Required (Optional)</Label>
                <Textarea
                  id="action_required"
                  value={formData.action_required}
                  onChange={(e) => setFormData({ ...formData, action_required: e.target.value })}
                  placeholder="Specific actions staff should take..."
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="expiry_date">Expiry Date (Optional)</Label>
                <Input
                  id="expiry_date"
                  type="date"
                  value={formData.expiry_date}
                  onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="requires_acknowledgment"
                  checked={formData.requires_acknowledgment}
                  onCheckedChange={(checked) => setFormData({ ...formData, requires_acknowledgment: checked })}
                />
                <Label htmlFor="requires_acknowledgment" className="cursor-pointer">
                  Requires Staff Acknowledgment
                </Label>
              </div>

              <div className="md:col-span-2">
                <Label className="mb-2 block">Display Alert On (select sections):</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {['all', 'dashboard', 'care_plan', 'medication', 'visits', 'schedule'].map(section => (
                    <div key={section} className="flex items-center gap-2">
                      <Checkbox
                        id={`section-${section}`}
                        checked={formData.display_on_sections?.includes(section) || formData.display_on_sections?.includes('all')}
                        onCheckedChange={() => handleSectionToggle(section)}
                        disabled={formData.display_on_sections?.includes('all') && section !== 'all'}
                      />
                      <Label htmlFor={`section-${section}`} className="cursor-pointer capitalize">
                        {section.replace('_', ' ')}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button type="submit" disabled={addAlertMutation.isPending} className="bg-red-600 hover:bg-red-700">
                {addAlertMutation.isPending ? "Creating..." : "Create Alert"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        {/* Filters and Sorting */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-gray-600" />
            <span className="font-medium text-sm">Filters & Sorting</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Severity</Label>
              <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Type</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="fall_risk">Fall Risk</SelectItem>
                  <SelectItem value="dietary">Dietary</SelectItem>
                  <SelectItem value="behavioral">Behavioral</SelectItem>
                  <SelectItem value="medical">Medical</SelectItem>
                  <SelectItem value="medication">Medication</SelectItem>
                  <SelectItem value="safeguarding">Safeguarding</SelectItem>
                  <SelectItem value="allergy">Allergy</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Sort By</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="severity">Severity</SelectItem>
                  <SelectItem value="date">Date Created</SelectItem>
                  <SelectItem value="type">Alert Type</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Alerts List */}
        <div className="space-y-3">
          {isLoading ? (
            <p className="text-center text-gray-500 py-8">Loading alerts...</p>
          ) : filteredAlerts.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No alerts match the selected filters</p>
            </div>
          ) : (
            filteredAlerts.map((alert) => {
              const AlertIcon = ALERT_TYPE_ICONS[alert.alert_type];
              const hasAcknowledged = alert.acknowledgments?.some(a => a.staff_id === staff.find(s => s.email === currentUser?.email)?.id);
              
              return (
                <Card key={alert.id} className={`border-l-4 ${
                  alert.severity === 'critical' ? 'border-red-600 bg-red-50' :
                  alert.severity === 'high' ? 'border-orange-500 bg-orange-50' :
                  alert.severity === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                  'border-blue-500 bg-blue-50'
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <AlertIcon className={`w-5 h-5 ${
                            alert.severity === 'critical' ? 'text-red-600' :
                            alert.severity === 'high' ? 'text-orange-600' :
                            alert.severity === 'medium' ? 'text-yellow-600' :
                            'text-blue-600'
                          }`} />
                          <h4 className="font-semibold text-lg">{alert.title}</h4>
                          <Badge className={SEVERITY_COLORS[alert.severity]}>
                            {alert.severity.toUpperCase()}
                          </Badge>
                          <Badge className={STATUS_COLORS[alert.status]}>
                            {alert.status}
                          </Badge>
                          <Badge variant="outline" className="text-xs capitalize">
                            {alert.alert_type.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-700 mb-3">{alert.description}</p>
                      </div>
                    </div>

                    {alert.action_required && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded mb-3">
                        <p className="text-xs font-medium text-blue-900 mb-1">Required Action:</p>
                        <p className="text-sm text-blue-800">{alert.action_required}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">Created:</span>
                        <span className="font-medium">{format(parseISO(alert.created_date), "MMM d, yyyy")}</span>
                        <span className="text-gray-600">by {getStaffName(alert.created_by_staff_id)}</span>
                      </div>
                      
                      {alert.expiry_date && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">Expires:</span>
                          <span className="font-medium">{format(parseISO(alert.expiry_date), "MMM d, yyyy")}</span>
                        </div>
                      )}

                      {alert.display_on_sections && alert.display_on_sections.length > 0 && (
                        <div className="flex items-center gap-2 md:col-span-2">
                          <Eye className="w-3 h-3 text-gray-500" />
                          <span className="text-gray-600">Shown on:</span>
                          <span className="font-medium capitalize">
                            {alert.display_on_sections.join(', ').replace(/_/g, ' ')}
                          </span>
                        </div>
                      )}
                    </div>

                    {alert.requires_acknowledgment && (
                      <div className="p-2 bg-yellow-50 border border-yellow-200 rounded mb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Bell className="w-4 h-4 text-yellow-700" />
                            <span className="text-xs font-medium text-yellow-900">
                              Requires Acknowledgment
                              {alert.acknowledgments && alert.acknowledgments.length > 0 && (
                                <span className="ml-2 text-yellow-700">
                                  ({alert.acknowledgments.length} staff acknowledged)
                                </span>
                              )}
                            </span>
                          </div>
                          {!hasAcknowledged && alert.status === 'active' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAcknowledgeAlert(alert)}
                              className="text-xs h-7"
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Acknowledge
                            </Button>
                          )}
                          {hasAcknowledged && (
                            <Badge className="bg-green-100 text-green-800 text-xs">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Acknowledged
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {alert.status === 'resolved' && alert.resolved_date && (
                      <div className="p-2 bg-green-50 border border-green-200 rounded mb-3">
                        <p className="text-xs text-green-900">
                          <strong>Resolved:</strong> {format(parseISO(alert.resolved_date), "MMM d, yyyy 'at' HH:mm")} by {getStaffName(alert.resolved_by_staff_id)}
                        </p>
                        {alert.resolution_notes && (
                          <p className="text-xs text-green-800 mt-1">{alert.resolution_notes}</p>
                        )}
                      </div>
                    )}

                    {alert.status === 'active' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleResolveAlert(alert)}
                          className="bg-green-600 hover:bg-green-700 text-xs"
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Mark Resolved
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleArchiveAlert(alert)}
                          className="text-xs"
                        >
                          <Archive className="w-3 h-3 mr-1" />
                          Archive
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}