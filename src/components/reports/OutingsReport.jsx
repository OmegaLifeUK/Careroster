import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  MapPin, 
  Car, 
  Users, 
  Calendar,
  Download,
  CheckCircle,
  AlertTriangle,
  Clock
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { format, parseISO } from "date-fns";

const COLORS = ['#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#3B82F6', '#84CC16'];

const OUTING_TYPE_LABELS = {
  outing_activity: 'Activity / Leisure',
  outing_gp_clinic: 'GP / Clinic',
  outing_hospital: 'Hospital',
  outing_school: 'School / Education',
  outing_shopping: 'Shopping',
  outing_day_trip: 'Day Trip',
  outing_community: 'Community Event',
  outing_other: 'Other'
};

const TRANSPORT_LABELS = {
  walking: 'Walking',
  car: 'Car',
  taxi: 'Taxi',
  bus: 'Bus',
  minibus: 'Minibus',
  wheelchair_transport: 'Wheelchair Transport',
  ambulance: 'Ambulance',
  other: 'Other'
};

export default function OutingsReport({ 
  dailyLogs = [],
  clients = [],
  staff = [],
  dateFrom,
  dateTo,
  selectedClient = "all",
  selectedStaff = "all"
}) {
  // Filter and process outings
  const outingsData = useMemo(() => {
    const from = parseISO(dateFrom);
    const to = parseISO(dateTo);

    const filteredOutings = dailyLogs.filter(log => {
      if (!log?.entry_type?.startsWith('outing_')) return false;
      try {
        const logDate = parseISO(log.log_date);
        if (logDate < from || logDate > to) return false;
        if (selectedClient !== "all" && log.client_id !== selectedClient) return false;
        // Filter by staff if any accompanying staff match
        if (selectedStaff !== "all") {
          const accompanyingStaff = log.accompanying_staff || [];
          if (!accompanyingStaff.includes(selectedStaff)) return false;
        }
        return true;
      } catch {
        return false;
      }
    });

    return filteredOutings.map(log => {
      const client = clients.find(c => c?.id === log.client_id);
      const accompanyingNames = (log.accompanying_staff || [])
        .map(staffId => staff.find(s => s?.id === staffId)?.full_name || 'Unknown')
        .join(', ');

      return {
        ...log,
        clientName: client?.full_name || 'Unknown',
        accompanyingStaffNames: accompanyingNames || 'Not recorded',
        typeLabel: OUTING_TYPE_LABELS[log.entry_type] || log.entry_type,
        transportLabel: TRANSPORT_LABELS[log.outing_transport] || log.outing_transport || 'Not specified'
      };
    }).sort((a, b) => (b.log_date || '').localeCompare(a.log_date || ''));
  }, [dailyLogs, clients, staff, dateFrom, dateTo, selectedClient, selectedStaff]);

  // Summary statistics
  const summary = useMemo(() => {
    const totalOutings = outingsData.length;
    const riskAssessed = outingsData.filter(o => o.risk_assessment_completed).length;
    const withFollowUp = outingsData.filter(o => o.follow_up_required).length;

    // By type
    const byType = {};
    outingsData.forEach(o => {
      byType[o.entry_type] = (byType[o.entry_type] || 0) + 1;
    });

    // By transport
    const byTransport = {};
    outingsData.forEach(o => {
      const transport = o.outing_transport || 'not_specified';
      byTransport[transport] = (byTransport[transport] || 0) + 1;
    });

    // By client
    const byClient = {};
    outingsData.forEach(o => {
      byClient[o.client_id] = (byClient[o.client_id] || 0) + 1;
    });

    // Top destinations
    const destinations = {};
    outingsData.forEach(o => {
      if (o.outing_destination) {
        destinations[o.outing_destination] = (destinations[o.outing_destination] || 0) + 1;
      }
    });

    const topDestinations = Object.entries(destinations)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      totalOutings,
      riskAssessed,
      riskAssessmentRate: totalOutings > 0 ? (riskAssessed / totalOutings) * 100 : 0,
      withFollowUp,
      byType,
      byTransport,
      byClient,
      topDestinations,
      uniqueClients: Object.keys(byClient).length
    };
  }, [outingsData]);

  // Chart data
  const typeChartData = Object.entries(summary.byType).map(([type, count]) => ({
    name: OUTING_TYPE_LABELS[type] || type,
    value: count
  }));

  const transportChartData = Object.entries(summary.byTransport).map(([transport, count]) => ({
    name: TRANSPORT_LABELS[transport] || transport,
    count
  }));

  const exportReport = () => {
    const csv = [
      "Outings Report",
      `Period: ${dateFrom} to ${dateTo}`,
      "",
      "Date,Client,Type,Destination,Transport,Accompanying Staff,Risk Assessed,Outcome,Follow-up",
      ...outingsData.map(o => 
        `${o.log_date},"${o.clientName}","${o.typeLabel}","${o.outing_destination || ''}","${o.transportLabel}","${o.accompanyingStaffNames}",${o.risk_assessment_completed ? 'Yes' : 'No'},"${(o.outing_outcome || '').replace(/"/g, '""')}",${o.follow_up_required ? 'Yes' : 'No'}`
      )
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `outings-report-${dateFrom}-${dateTo}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-cyan-50 border-cyan-200">
          <CardContent className="p-4 text-center">
            <MapPin className="w-6 h-6 mx-auto mb-2 text-cyan-600" />
            <p className="text-2xl font-bold text-cyan-700">{summary.totalOutings}</p>
            <p className="text-xs text-cyan-600">Total Outings</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="w-6 h-6 mx-auto mb-2 text-blue-500" />
            <p className="text-2xl font-bold">{summary.uniqueClients}</p>
            <p className="text-xs text-gray-500">Clients</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="w-6 h-6 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold text-green-600">{summary.riskAssessmentRate.toFixed(0)}%</p>
            <p className="text-xs text-gray-500">Risk Assessed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Car className="w-6 h-6 mx-auto mb-2 text-purple-500" />
            <p className="text-2xl font-bold">{Object.keys(summary.byTransport).length}</p>
            <p className="text-xs text-gray-500">Transport Types</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-orange-500" />
            <p className="text-2xl font-bold text-orange-600">{summary.withFollowUp}</p>
            <p className="text-xs text-gray-500">Need Follow-up</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Outings by Type</CardTitle>
            <Button variant="outline" size="sm" onClick={exportReport}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
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

        <Card>
          <CardHeader>
            <CardTitle>Transport Methods</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={transportChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={120} />
                <Tooltip />
                <Bar dataKey="count" fill="#06B6D4" name="Outings" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Destinations */}
      {summary.topDestinations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Destinations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {summary.topDestinations.map(([destination, count], idx) => (
                <div key={destination} className="p-3 bg-gray-50 rounded-lg text-center">
                  <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-cyan-100 flex items-center justify-center">
                    <span className="text-cyan-700 font-bold text-sm">{idx + 1}</span>
                  </div>
                  <p className="font-medium text-sm truncate">{destination}</p>
                  <p className="text-xs text-gray-500">{count} visits</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle>Outing Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Date</th>
                  <th className="px-3 py-2 text-left font-medium">Client</th>
                  <th className="px-3 py-2 text-left font-medium">Type</th>
                  <th className="px-3 py-2 text-left font-medium">Destination</th>
                  <th className="px-3 py-2 text-left font-medium">Transport</th>
                  <th className="px-3 py-2 text-left font-medium">Staff</th>
                  <th className="px-3 py-2 text-center font-medium">Risk</th>
                  <th className="px-3 py-2 text-left font-medium">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {outingsData.slice(0, 50).map(outing => (
                  <tr key={outing.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-gray-400" />
                        {outing.log_date ? format(parseISO(outing.log_date), 'd MMM') : '-'}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-medium">{outing.clientName}</td>
                    <td className="px-3 py-2">
                      <Badge className="bg-cyan-100 text-cyan-700 text-xs">
                        {outing.typeLabel}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      <span className="flex items-center gap-1 text-gray-700">
                        <MapPin className="w-3 h-3" />
                        {outing.outing_destination || '-'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="flex items-center gap-1 text-gray-600">
                        <Car className="w-3 h-3" />
                        {outing.transportLabel}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-600 max-w-[150px] truncate">
                      {outing.accompanyingStaffNames}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {outing.risk_assessment_completed ? (
                        <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-500 mx-auto" />
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-600 max-w-[200px] truncate">
                      {outing.outing_outcome || '-'}
                      {outing.follow_up_required && (
                        <Badge className="ml-2 bg-orange-100 text-orange-700 text-[10px]">
                          Follow-up
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {outingsData.length > 50 && (
              <p className="text-center text-sm text-gray-500 mt-4">
                Showing 50 of {outingsData.length} outings. Export for full data.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}