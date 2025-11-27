import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Clock, 
  Calendar,
  MapPin,
  Download,
  TrendingUp
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { format, parseISO, differenceInMinutes } from "date-fns";

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

const VISIT_TYPE_LABELS = {
  personal_care: 'Personal Care',
  medication: 'Medication',
  meal_prep: 'Meal Prep',
  companionship: 'Companionship',
  domestic: 'Domestic',
  health_check: 'Health Check',
  respite: 'Respite',
  other: 'Other'
};

export default function ClientVisitsReport({ 
  visits = [],
  shifts = [],
  clients = [],
  staff = [],
  carers = [],
  dateFrom,
  dateTo,
  selectedClient = "all"
}) {
  const allStaff = [...staff, ...carers];

  // Process visit data
  const visitData = useMemo(() => {
    const from = parseISO(dateFrom);
    const to = parseISO(dateTo);

    // Combine visits and shifts
    const allVisits = [];

    // Process visits entity
    visits.forEach(v => {
      if (!v) return;
      try {
        const vDate = v.scheduled_date ? parseISO(v.scheduled_date) : 
                      v.scheduled_start ? parseISO(v.scheduled_start) : null;
        if (!vDate || vDate < from || vDate > to) return;
        if (selectedClient !== "all" && v.client_id !== selectedClient) return;

        allVisits.push({
          id: v.id,
          clientId: v.client_id,
          staffId: v.staff_id || v.assigned_staff_id,
          date: v.scheduled_date || format(vDate, 'yyyy-MM-dd'),
          duration: v.duration_minutes || 60,
          type: v.visit_type || 'other',
          status: v.status || 'scheduled',
          source: 'visit'
        });
      } catch {}
    });

    // Process shifts (domiciliary/client-based)
    shifts.forEach(s => {
      if (!s || !s.client_id || s.care_type !== 'domiciliary_care') return;
      try {
        const sDate = parseISO(s.date);
        if (sDate < from || sDate > to) return;
        if (selectedClient !== "all" && s.client_id !== selectedClient) return;

        allVisits.push({
          id: s.id,
          clientId: s.client_id,
          staffId: s.carer_id,
          date: s.date,
          duration: (s.duration_hours || 1) * 60,
          type: s.shift_type || 'other',
          status: s.status || 'scheduled',
          source: 'shift'
        });
      } catch {}
    });

    // Group by client
    const clientData = {};
    allVisits.forEach(v => {
      if (!clientData[v.clientId]) {
        clientData[v.clientId] = {
          totalVisits: 0,
          totalMinutes: 0,
          completedVisits: 0,
          cancelledVisits: 0,
          visitTypes: {},
          staffVisits: {},
          weeklyVisits: {}
        };
      }

      clientData[v.clientId].totalVisits += 1;
      clientData[v.clientId].totalMinutes += v.duration;

      if (v.status === 'completed') clientData[v.clientId].completedVisits += 1;
      if (v.status === 'cancelled') clientData[v.clientId].cancelledVisits += 1;

      // Visit types
      const typeKey = v.type || 'other';
      clientData[v.clientId].visitTypes[typeKey] = (clientData[v.clientId].visitTypes[typeKey] || 0) + 1;

      // Staff visits
      if (v.staffId) {
        clientData[v.clientId].staffVisits[v.staffId] = (clientData[v.clientId].staffVisits[v.staffId] || 0) + 1;
      }
    });

    // Convert to array with enriched data
    return Object.entries(clientData).map(([clientId, data]) => {
      const client = clients.find(c => c?.id === clientId);
      const avgDuration = data.totalVisits > 0 ? data.totalMinutes / data.totalVisits : 0;
      const numWeeks = Math.max(1, Math.ceil((to - from) / (7 * 24 * 60 * 60 * 1000)));
      const visitsPerWeek = data.totalVisits / numWeeks;

      // Most common visit type
      const topType = Object.entries(data.visitTypes).sort((a, b) => b[1] - a[1])[0];
      
      // Primary carer (most visits)
      const topCarer = Object.entries(data.staffVisits).sort((a, b) => b[1] - a[1])[0];
      const primaryCarer = topCarer ? allStaff.find(s => s?.id === topCarer[0]) : null;

      return {
        clientId,
        name: client?.full_name || 'Unknown',
        address: client?.address?.postcode || '',
        ...data,
        totalHours: data.totalMinutes / 60,
        avgDuration,
        visitsPerWeek,
        primaryVisitType: topType ? topType[0] : 'other',
        primaryCarer: primaryCarer?.full_name || 'Various',
        completionRate: data.totalVisits > 0 
          ? (data.completedVisits / (data.totalVisits - data.cancelledVisits)) * 100 
          : 0
      };
    }).sort((a, b) => b.totalVisits - a.totalVisits);
  }, [visits, shifts, clients, allStaff, dateFrom, dateTo, selectedClient]);

  // Summary
  const summary = useMemo(() => {
    const totalVisits = visitData.reduce((sum, c) => sum + c.totalVisits, 0);
    const totalHours = visitData.reduce((sum, c) => sum + c.totalHours, 0);
    const completedVisits = visitData.reduce((sum, c) => sum + c.completedVisits, 0);
    const cancelledVisits = visitData.reduce((sum, c) => sum + c.cancelledVisits, 0);
    const avgDuration = totalVisits > 0 
      ? visitData.reduce((sum, c) => sum + c.totalMinutes, 0) / totalVisits 
      : 0;

    // Visit type breakdown
    const typeBreakdown = {};
    visitData.forEach(c => {
      Object.entries(c.visitTypes).forEach(([type, count]) => {
        typeBreakdown[type] = (typeBreakdown[type] || 0) + count;
      });
    });

    return { totalVisits, totalHours, completedVisits, cancelledVisits, avgDuration, typeBreakdown };
  }, [visitData]);

  // Chart data
  const clientChartData = visitData.slice(0, 10).map(c => ({
    name: c.name.split(' ')[0],
    Visits: c.totalVisits,
    Hours: c.totalHours
  }));

  const typeChartData = Object.entries(summary.typeBreakdown).map(([type, count]) => ({
    name: VISIT_TYPE_LABELS[type] || type,
    value: count
  }));

  const exportReport = () => {
    const csv = [
      "Client Visits Report",
      `Period: ${dateFrom} to ${dateTo}`,
      "",
      "Client Name,Location,Total Visits,Total Hours,Avg Duration (mins),Visits/Week,Completed,Cancelled,Primary Type,Primary Carer",
      ...visitData.map(c => 
        `"${c.name}","${c.address}",${c.totalVisits},${c.totalHours.toFixed(1)},${c.avgDuration.toFixed(0)},${c.visitsPerWeek.toFixed(1)},${c.completedVisits},${c.cancelledVisits},"${VISIT_TYPE_LABELS[c.primaryVisitType] || c.primaryVisitType}","${c.primaryCarer}"`
      )
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `client-visits-report-${dateFrom}-${dateTo}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Calendar className="w-6 h-6 mx-auto mb-2 text-blue-500" />
            <p className="text-2xl font-bold">{summary.totalVisits}</p>
            <p className="text-xs text-gray-500">Total Visits</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="w-6 h-6 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold">{summary.totalHours.toFixed(0)}</p>
            <p className="text-xs text-gray-500">Total Hours</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-6 h-6 mx-auto mb-2 text-purple-500" />
            <p className="text-2xl font-bold">{summary.avgDuration.toFixed(0)}</p>
            <p className="text-xs text-gray-500">Avg Duration (mins)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="w-6 h-6 mx-auto mb-2 text-cyan-500" />
            <p className="text-2xl font-bold">{visitData.length}</p>
            <p className="text-xs text-gray-500">Clients Served</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Badge className={summary.cancelledVisits > 5 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}>
              {summary.cancelledVisits}
            </Badge>
            <p className="text-xs text-gray-500 mt-2">Cancelled</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Visits by Client</CardTitle>
            <Button variant="outline" size="sm" onClick={exportReport}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={clientChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis yAxisId="left" orientation="left" stroke="#3B82F6" />
                <YAxis yAxisId="right" orientation="right" stroke="#10B981" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="Visits" fill="#3B82F6" name="Visits" />
                <Bar yAxisId="right" dataKey="Hours" fill="#10B981" name="Hours" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Visit Types</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={typeChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {typeChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle>Client Visit Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Client</th>
                  <th className="px-3 py-2 text-left font-medium">Location</th>
                  <th className="px-3 py-2 text-right font-medium">Visits</th>
                  <th className="px-3 py-2 text-right font-medium">Hours</th>
                  <th className="px-3 py-2 text-right font-medium">Avg Duration</th>
                  <th className="px-3 py-2 text-right font-medium">Per Week</th>
                  <th className="px-3 py-2 text-left font-medium">Primary Type</th>
                  <th className="px-3 py-2 text-left font-medium">Primary Carer</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {visitData.map(client => (
                  <tr key={client.clientId} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium">{client.name}</td>
                    <td className="px-3 py-2 text-gray-600">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {client.address || '-'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-medium">{client.totalVisits}</td>
                    <td className="px-3 py-2 text-right">{client.totalHours.toFixed(1)}h</td>
                    <td className="px-3 py-2 text-right">{client.avgDuration.toFixed(0)} mins</td>
                    <td className="px-3 py-2 text-right">{client.visitsPerWeek.toFixed(1)}</td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className="text-xs">
                        {VISIT_TYPE_LABELS[client.primaryVisitType] || client.primaryVisitType}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-gray-600">{client.primaryCarer}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}