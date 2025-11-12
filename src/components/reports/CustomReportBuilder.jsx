import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Plus, 
  Play,
  Save,
  Download,
  FileText,
  BarChart3,
  Table,
  PieChart,
  TrendingUp,
  Calendar,
  Filter,
  Eye
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { format } from "date-fns";

const AVAILABLE_ENTITIES = [
  { id: 'shifts', label: 'Shifts', icon: Calendar },
  { id: 'carers', label: 'Carers', icon: Users },
  { id: 'clients', label: 'Clients', icon: UserCircle },
  { id: 'incidents', label: 'Incidents', icon: Shield },
  { id: 'training', label: 'Training', icon: GraduationCap },
  { id: 'medications', label: 'Medications', icon: Activity },
];

const AVAILABLE_FIELDS = {
  shifts: ['date', 'start_time', 'end_time', 'duration_hours', 'status', 'shift_type', 'carer_id', 'client_id'],
  carers: ['full_name', 'email', 'phone', 'status', 'employment_type', 'hourly_rate'],
  clients: ['full_name', 'status', 'funding_type', 'mobility', 'care_needs'],
  incidents: ['incident_type', 'severity', 'status', 'incident_date'],
  training: ['status', 'completion_date', 'score'],
  medications: ['medication_name', 'status', 'administration_time'],
};

const AGGREGATION_TYPES = [
  { id: 'count', label: 'Count', icon: BarChart3 },
  { id: 'sum', label: 'Sum', icon: TrendingUp },
  { id: 'average', label: 'Average', icon: TrendingUp },
  { id: 'min', label: 'Minimum', icon: TrendingUp },
  { id: 'max', label: 'Maximum', icon: TrendingUp },
];

const CHART_TYPES = [
  { id: 'table', label: 'Table', icon: Table },
  { id: 'bar', label: 'Bar Chart', icon: BarChart3 },
  { id: 'line', label: 'Line Chart', icon: TrendingUp },
  { id: 'pie', label: 'Pie Chart', icon: PieChart },
];

export default function CustomReportBuilder({ onRunReport }) {
  const [reportConfig, setReportConfig] = useState({
    name: '',
    entity: 'shifts',
    selectedFields: [],
    filters: [],
    groupBy: '',
    aggregations: [],
    chartType: 'table',
    dateRange: { start: '', end: '' }
  });
  const [savedReports, setSavedReports] = useState(() => {
    const saved = localStorage.getItem('custom_reports');
    return saved ? JSON.parse(saved) : [];
  });
  const { toast } = useToast();

  const toggleField = (field) => {
    setReportConfig(prev => ({
      ...prev,
      selectedFields: prev.selectedFields.includes(field)
        ? prev.selectedFields.filter(f => f !== field)
        : [...prev.selectedFields, field]
    }));
  };

  const addFilter = () => {
    setReportConfig(prev => ({
      ...prev,
      filters: [
        ...prev.filters,
        { id: Date.now(), field: '', operator: 'equals', value: '' }
      ]
    }));
  };

  const updateFilter = (id, key, value) => {
    setReportConfig(prev => ({
      ...prev,
      filters: prev.filters.map(f => 
        f.id === id ? { ...f, [key]: value } : f
      )
    }));
  };

  const removeFilter = (id) => {
    setReportConfig(prev => ({
      ...prev,
      filters: prev.filters.filter(f => f.id !== id)
    }));
  };

  const saveReport = () => {
    if (!reportConfig.name.trim()) {
      toast.error("Error", "Please enter a report name");
      return;
    }

    const newReport = {
      ...reportConfig,
      id: Date.now(),
      createdAt: new Date().toISOString()
    };

    const updated = [...savedReports, newReport];
    setSavedReports(updated);
    localStorage.setItem('custom_reports', JSON.stringify(updated));
    toast.success("Report Saved", `"${reportConfig.name}" has been saved`);
  };

  const loadReport = (report) => {
    setReportConfig(report);
    toast.info("Report Loaded", `"${report.name}" loaded successfully`);
  };

  const deleteReport = (reportId) => {
    const updated = savedReports.filter(r => r.id !== reportId);
    setSavedReports(updated);
    localStorage.setItem('custom_reports', JSON.stringify(updated));
    toast.success("Report Deleted", "Saved report removed");
  };

  const runReport = () => {
    if (reportConfig.selectedFields.length === 0) {
      toast.error("Error", "Please select at least one field");
      return;
    }

    toast.success("Running Report", "Generating your custom report...");
    onRunReport?.(reportConfig);
  };

  const availableFields = AVAILABLE_FIELDS[reportConfig.entity] || [];

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Report Builder */}
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Build Custom Report
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Report Name */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Report Name
              </label>
              <Input
                value={reportConfig.name}
                onChange={(e) => setReportConfig({ ...reportConfig, name: e.target.value })}
                placeholder="e.g., Monthly Carer Hours Report"
              />
            </div>

            {/* Data Source */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Data Source
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {AVAILABLE_ENTITIES.map((entity) => {
                  const EntityIcon = entity.icon;
                  return (
                    <button
                      key={entity.id}
                      onClick={() => setReportConfig({ 
                        ...reportConfig, 
                        entity: entity.id,
                        selectedFields: []
                      })}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        reportConfig.entity === entity.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <EntityIcon className="w-5 h-5 mx-auto mb-1" />
                      <p className="text-sm font-medium">{entity.label}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Fields Selection */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Select Fields ({reportConfig.selectedFields.length} selected)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-4 bg-gray-50 rounded-lg max-h-48 overflow-y-auto">
                {availableFields.map((field) => (
                  <div key={field} className="flex items-center gap-2">
                    <Checkbox
                      checked={reportConfig.selectedFields.includes(field)}
                      onCheckedChange={() => toggleField(field)}
                      id={field}
                    />
                    <label 
                      htmlFor={field}
                      className="text-sm text-gray-700 cursor-pointer"
                    >
                      {field.replace('_', ' ')}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Date Range
              </label>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="date"
                  value={reportConfig.dateRange.start}
                  onChange={(e) => setReportConfig({
                    ...reportConfig,
                    dateRange: { ...reportConfig.dateRange, start: e.target.value }
                  })}
                  placeholder="Start date"
                />
                <Input
                  type="date"
                  value={reportConfig.dateRange.end}
                  onChange={(e) => setReportConfig({
                    ...reportConfig,
                    dateRange: { ...reportConfig.dateRange, end: e.target.value }
                  })}
                  placeholder="End date"
                />
              </div>
            </div>

            {/* Filters */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">
                  Filters ({reportConfig.filters.length})
                </label>
                <Button variant="outline" size="sm" onClick={addFilter}>
                  <Plus className="w-3 h-3 mr-1" />
                  Add Filter
                </Button>
              </div>
              <div className="space-y-2">
                {reportConfig.filters.map((filter) => (
                  <div key={filter.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <select
                      value={filter.field}
                      onChange={(e) => updateFilter(filter.id, 'field', e.target.value)}
                      className="flex-1 px-2 py-1 border rounded text-sm"
                    >
                      <option value="">Select field</option>
                      {availableFields.map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                    <select
                      value={filter.operator}
                      onChange={(e) => updateFilter(filter.id, 'operator', e.target.value)}
                      className="px-2 py-1 border rounded text-sm"
                    >
                      <option value="equals">Equals</option>
                      <option value="contains">Contains</option>
                      <option value="greater_than">Greater than</option>
                      <option value="less_than">Less than</option>
                    </select>
                    <Input
                      value={filter.value}
                      onChange={(e) => updateFilter(filter.id, 'value', e.target.value)}
                      placeholder="Value"
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFilter(filter.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Visualization Type */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Visualization Type
              </label>
              <div className="grid grid-cols-4 gap-2">
                {CHART_TYPES.map((chart) => {
                  const ChartIcon = chart.icon;
                  return (
                    <button
                      key={chart.id}
                      onClick={() => setReportConfig({ ...reportConfig, chartType: chart.id })}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        reportConfig.chartType === chart.id
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <ChartIcon className="w-5 h-5 mx-auto mb-1" />
                      <p className="text-xs font-medium">{chart.label}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                onClick={runReport}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                <Play className="w-4 h-4 mr-2" />
                Run Report
              </Button>
              <Button
                variant="outline"
                onClick={saveReport}
              >
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Saved Reports */}
      <div>
        <Card>
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
            <CardTitle className="text-lg">Saved Reports</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {savedReports.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm">No saved reports yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {savedReports.map((report) => (
                  <Card key={report.id} className="hover:shadow-md transition-all">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm text-gray-900 truncate">
                            {report.name}
                          </h4>
                          <p className="text-xs text-gray-500">
                            {report.selectedFields.length} fields • {report.entity}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => loadReport(report)}
                          className="flex-1 text-xs"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Load
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            loadReport(report);
                            runReport();
                          }}
                          className="flex-1 text-xs"
                        >
                          <Play className="w-3 h-3 mr-1" />
                          Run
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteReport(report.id)}
                          className="text-red-600"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}