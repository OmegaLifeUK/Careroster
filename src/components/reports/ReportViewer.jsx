import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Mail,
  Printer,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Users,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock
} from "lucide-react";
import { format } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line
} from "recharts";

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

export default function ReportViewer({ report, onClose }) {
  const data = report.report_data || {};
  const summary = data.summary || {};
  const period = data.period || {};

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    const content = JSON.stringify(report, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.report_name.replace(/\s+/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderSummaryCards = () => {
    const cards = [];
    
    Object.entries(summary).forEach(([key, value]) => {
      if (typeof value !== 'object') {
        let icon = <FileText className="w-5 h-5" />;
        let color = "bg-blue-100 text-blue-600";
        
        if (key.includes('compliance') || key.includes('rate')) {
          icon = <CheckCircle className="w-5 h-5" />;
          color = Number(value) >= 90 ? "bg-green-100 text-green-600" : 
                  Number(value) >= 70 ? "bg-amber-100 text-amber-600" : "bg-red-100 text-red-600";
        } else if (key.includes('incident') || key.includes('overdue')) {
          icon = <AlertTriangle className="w-5 h-5" />;
          color = "bg-red-100 text-red-600";
        } else if (key.includes('staff') || key.includes('client')) {
          icon = <Users className="w-5 h-5" />;
          color = "bg-purple-100 text-purple-600";
        }

        cards.push(
          <Card key={key}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${color}`}>
                {icon}
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {typeof value === 'number' && key.includes('rate') ? `${value}%` : value}
                </p>
                <p className="text-xs text-gray-500 capitalize">{key.replace(/_/g, ' ')}</p>
              </div>
            </CardContent>
          </Card>
        );
      }
    });

    return cards;
  };

  const renderCharts = () => {
    const charts = [];

    // By Type/Category charts
    if (summary.by_type) {
      const chartData = Object.entries(summary.by_type).map(([key, value]) => ({
        name: key.replace(/_/g, ' '),
        value: value
      }));
      
      charts.push(
        <Card key="by-type" className="col-span-1">
          <CardHeader>
            <CardTitle className="text-sm">By Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      );
    }

    if (summary.by_severity) {
      const chartData = Object.entries(summary.by_severity).map(([key, value]) => ({
        name: key,
        value: value
      }));

      charts.push(
        <Card key="by-severity" className="col-span-1">
          <CardHeader>
            <CardTitle className="text-sm">By Severity</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      );
    }

    if (summary.by_category) {
      const chartData = Object.entries(summary.by_category).map(([key, value]) => ({
        name: key.replace(/_/g, ' '),
        total: value.total || value,
        completed: value.completed || 0
      }));

      charts.push(
        <Card key="by-category" className="col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">By Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="total" fill="#3B82F6" name="Total" />
                <Bar dataKey="completed" fill="#10B981" name="Completed" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      );
    }

    if (summary.by_pay_bucket) {
      const chartData = Object.entries(summary.by_pay_bucket).map(([key, value]) => ({
        name: key.replace(/_/g, ' '),
        hours: value.hours?.toFixed(1) || 0,
        pay: value.pay?.toFixed(0) || 0
      }));

      charts.push(
        <Card key="by-pay-bucket" className="col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Pay Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="left" orientation="left" stroke="#3B82F6" />
                <YAxis yAxisId="right" orientation="right" stroke="#10B981" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="hours" fill="#3B82F6" name="Hours" />
                <Bar yAxisId="right" dataKey="pay" fill="#10B981" name="Pay (£)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      );
    }

    if (summary.performance_ratings) {
      const chartData = Object.entries(summary.performance_ratings).map(([key, value]) => ({
        name: key.replace(/_/g, ' '),
        value: value
      }));

      charts.push(
        <Card key="performance" className="col-span-1">
          <CardHeader>
            <CardTitle className="text-sm">Performance Ratings</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  dataKey="value"
                  label
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={
                        entry.name === 'exceeds' ? '#10B981' :
                        entry.name === 'meets' ? '#3B82F6' :
                        entry.name === 'requires improvement' ? '#F59E0B' : '#EF4444'
                      } 
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      );
    }

    return charts;
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>{report.report_name}</DialogTitle>
              <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                <Calendar className="w-4 h-4" />
                Generated {format(new Date(report.generated_date || report.created_date), 'MMM d, yyyy HH:mm')}
                {period.start && period.end && (
                  <>
                    <span>•</span>
                    <span>Period: {period.start} to {period.end}</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-1" />
                Print
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="w-4 h-4 mr-1" />
                Export
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {renderSummaryCards()}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderCharts()}
          </div>

          {/* Detail Lists */}
          {data.incidents && data.incidents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Recent Incidents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {data.incidents.map((incident, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div>
                        <p className="font-medium text-sm">{incident.incident_type?.replace(/_/g, ' ')}</p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(incident.incident_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <Badge className={
                        incident.severity === 'critical' ? 'bg-red-100 text-red-700' :
                        incident.severity === 'serious' ? 'bg-orange-100 text-orange-700' :
                        incident.severity === 'moderate' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }>
                        {incident.severity}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {data.by_client && Object.keys(data.by_client).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">By Client</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {Object.entries(data.by_client).map(([clientId, clientData]) => (
                    <div key={clientId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div>
                        <p className="font-medium text-sm">{clientData.name}</p>
                        <p className="text-xs text-gray-500">
                          {clientData.records?.length || 0} progress record(s)
                        </p>
                      </div>
                      {clientData.records?.[0]?.overall_progress && (
                        <Badge className={
                          clientData.records[0].overall_progress.includes('improvement') ? 'bg-green-100 text-green-700' :
                          clientData.records[0].overall_progress.includes('decline') ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }>
                          {clientData.records[0].overall_progress.replace(/_/g, ' ')}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {report.sent_to && report.sent_to.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Mail className="w-4 h-4" />
              Sent to: {report.sent_to.join(', ')}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}