import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  CheckCircle,
  Download
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format, parseISO, startOfWeek, endOfWeek, eachWeekOfInterval, getWeek } from "date-fns";

export default function StaffHoursReport({ 
  timesheets = [], 
  shifts = [],
  staff = [],
  carers = [],
  availability = [],
  dateFrom,
  dateTo,
  selectedStaff = "all",
  periodType = "weekly" // "weekly" or "monthly"
}) {
  const allStaff = [...staff, ...carers];

  // Get contracted hours for staff
  const getContractedHours = (staffId) => {
    const staffMember = allStaff.find(s => s?.id === staffId);
    const avail = availability.find(a => a?.carer_id === staffId && a?.max_hours_per_week);
    if (avail?.max_hours_per_week) return avail.max_hours_per_week;
    if (staffMember?.employment_type === 'full_time') return 40;
    if (staffMember?.employment_type === 'part_time') return 20;
    return 40; // default
  };

  // Calculate staff hours data
  const staffHoursData = useMemo(() => {
    const from = parseISO(dateFrom);
    const to = parseISO(dateTo);

    // Group by staff
    const staffData = {};

    // Process timesheets
    timesheets.forEach(t => {
      if (!t?.staff_id) return;
      try {
        const tDate = parseISO(t.timesheet_date);
        if (tDate < from || tDate > to) return;
        if (selectedStaff !== "all" && t.staff_id !== selectedStaff) return;

        if (!staffData[t.staff_id]) {
          staffData[t.staff_id] = {
            totalHours: 0,
            standardHours: 0,
            overtimeHours: 0,
            weekendHours: 0,
            nightHours: 0,
            shifts: 0,
            weeklyBreakdown: {}
          };
        }

        staffData[t.staff_id].totalHours += t.actual_hours || 0;
        staffData[t.staff_id].shifts += 1;

        if (t.pay_bucket === 'overtime') {
          staffData[t.staff_id].overtimeHours += t.actual_hours || 0;
        } else if (t.pay_bucket === 'weekend') {
          staffData[t.staff_id].weekendHours += t.actual_hours || 0;
        } else if (t.pay_bucket === 'night') {
          staffData[t.staff_id].nightHours += t.actual_hours || 0;
        } else {
          staffData[t.staff_id].standardHours += t.actual_hours || 0;
        }

        // Weekly breakdown
        const weekNum = getWeek(tDate);
        const weekKey = `W${weekNum}`;
        if (!staffData[t.staff_id].weeklyBreakdown[weekKey]) {
          staffData[t.staff_id].weeklyBreakdown[weekKey] = 0;
        }
        staffData[t.staff_id].weeklyBreakdown[weekKey] += t.actual_hours || 0;
      } catch {}
    });

    // Also process shifts for hours if no timesheets
    shifts.forEach(s => {
      if (!s?.carer_id || s.status === 'cancelled') return;
      try {
        const sDate = parseISO(s.date);
        if (sDate < from || sDate > to) return;
        if (selectedStaff !== "all" && s.carer_id !== selectedStaff) return;

        if (!staffData[s.carer_id]) {
          staffData[s.carer_id] = {
            totalHours: 0,
            standardHours: 0,
            overtimeHours: 0,
            weekendHours: 0,
            nightHours: 0,
            shifts: 0,
            weeklyBreakdown: {}
          };
        }

        // Only count if no timesheet data
        if (staffData[s.carer_id].shifts === 0) {
          staffData[s.carer_id].totalHours += s.duration_hours || 0;
          staffData[s.carer_id].shifts += 1;
        }
      } catch {}
    });

    // Calculate utilization and flags
    return Object.entries(staffData).map(([staffId, data]) => {
      const staffMember = allStaff.find(s => s?.id === staffId);
      const contracted = getContractedHours(staffId);
      const numWeeks = Math.max(1, Math.ceil((to - from) / (7 * 24 * 60 * 60 * 1000)));
      const avgWeeklyHours = data.totalHours / numWeeks;
      const utilization = contracted ? (avgWeeklyHours / contracted) * 100 : 0;

      return {
        staffId,
        name: staffMember?.full_name || 'Unknown',
        employmentType: staffMember?.employment_type || 'unknown',
        contractedHours: contracted,
        ...data,
        avgWeeklyHours,
        utilization,
        status: utilization > 110 ? 'overtime' : utilization < 70 ? 'underutilized' : 'optimal',
        overtimePercent: data.totalHours > 0 ? (data.overtimeHours / data.totalHours) * 100 : 0
      };
    }).sort((a, b) => b.totalHours - a.totalHours);
  }, [timesheets, shifts, allStaff, availability, dateFrom, dateTo, selectedStaff]);

  // Summary stats
  const summary = useMemo(() => {
    const totalHours = staffHoursData.reduce((sum, s) => sum + s.totalHours, 0);
    const totalOvertime = staffHoursData.reduce((sum, s) => sum + s.overtimeHours, 0);
    const underutilized = staffHoursData.filter(s => s.status === 'underutilized').length;
    const overworked = staffHoursData.filter(s => s.status === 'overtime').length;
    const avgUtilization = staffHoursData.length > 0 
      ? staffHoursData.reduce((sum, s) => sum + s.utilization, 0) / staffHoursData.length 
      : 0;

    return { totalHours, totalOvertime, underutilized, overworked, avgUtilization };
  }, [staffHoursData]);

  // Chart data
  const chartData = staffHoursData.slice(0, 15).map(s => ({
    name: s.name.split(' ')[0], // First name only for chart
    Standard: s.standardHours,
    Overtime: s.overtimeHours,
    Weekend: s.weekendHours,
    Night: s.nightHours,
    contracted: s.contractedHours * (Math.ceil((parseISO(dateTo) - parseISO(dateFrom)) / (7 * 24 * 60 * 60 * 1000)) || 1)
  }));

  const exportReport = () => {
    const csv = [
      "Staff Hours Report",
      `Period: ${dateFrom} to ${dateTo}`,
      "",
      "Staff Name,Employment Type,Contracted Weekly,Total Hours,Standard,Overtime,Weekend,Night,Avg Weekly,Utilization %,Status",
      ...staffHoursData.map(s => 
        `"${s.name}",${s.employmentType},${s.contractedHours},${s.totalHours.toFixed(1)},${s.standardHours.toFixed(1)},${s.overtimeHours.toFixed(1)},${s.weekendHours.toFixed(1)},${s.nightHours.toFixed(1)},${s.avgWeeklyHours.toFixed(1)},${s.utilization.toFixed(1)},${s.status}`
      )
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `staff-hours-report-${dateFrom}-${dateTo}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="w-6 h-6 mx-auto mb-2 text-blue-500" />
            <p className="text-2xl font-bold">{summary.totalHours.toFixed(0)}</p>
            <p className="text-xs text-gray-500">Total Hours</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-6 h-6 mx-auto mb-2 text-orange-500" />
            <p className="text-2xl font-bold text-orange-600">{summary.totalOvertime.toFixed(0)}</p>
            <p className="text-xs text-gray-500">Overtime Hours</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="w-6 h-6 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold text-green-600">{summary.avgUtilization.toFixed(0)}%</p>
            <p className="text-xs text-gray-500">Avg Utilization</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-red-500" />
            <p className="text-2xl font-bold text-red-600">{summary.overworked}</p>
            <p className="text-xs text-gray-500">Over Capacity</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingDown className="w-6 h-6 mx-auto mb-2 text-amber-500" />
            <p className="text-2xl font-bold text-amber-600">{summary.underutilized}</p>
            <p className="text-xs text-gray-500">Underutilized</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Hours by Staff Member</CardTitle>
          <Button variant="outline" size="sm" onClick={exportReport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Standard" stackId="hours" fill="#3B82F6" name="Standard" />
              <Bar dataKey="Overtime" stackId="hours" fill="#EF4444" name="Overtime" />
              <Bar dataKey="Weekend" stackId="hours" fill="#8B5CF6" name="Weekend" />
              <Bar dataKey="Night" stackId="hours" fill="#1F2937" name="Night" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle>Staff Hours Detail</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Staff Member</th>
                  <th className="px-3 py-2 text-left font-medium">Type</th>
                  <th className="px-3 py-2 text-right font-medium">Contracted</th>
                  <th className="px-3 py-2 text-right font-medium">Total</th>
                  <th className="px-3 py-2 text-right font-medium">Overtime</th>
                  <th className="px-3 py-2 text-right font-medium">Avg/Week</th>
                  <th className="px-3 py-2 text-center font-medium">Utilization</th>
                  <th className="px-3 py-2 text-center font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {staffHoursData.map(staff => (
                  <tr key={staff.staffId} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium">{staff.name}</td>
                    <td className="px-3 py-2 capitalize text-gray-600">
                      {staff.employmentType?.replace('_', ' ') || '-'}
                    </td>
                    <td className="px-3 py-2 text-right">{staff.contractedHours}h/wk</td>
                    <td className="px-3 py-2 text-right font-medium">{staff.totalHours.toFixed(1)}h</td>
                    <td className="px-3 py-2 text-right text-orange-600">
                      {staff.overtimeHours > 0 ? `${staff.overtimeHours.toFixed(1)}h` : '-'}
                    </td>
                    <td className="px-3 py-2 text-right">{staff.avgWeeklyHours.toFixed(1)}h</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${
                              staff.utilization > 110 ? 'bg-red-500' :
                              staff.utilization < 70 ? 'bg-amber-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(staff.utilization, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs w-10">{staff.utilization.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Badge className={
                        staff.status === 'overtime' ? 'bg-red-100 text-red-700' :
                        staff.status === 'underutilized' ? 'bg-amber-100 text-amber-700' :
                        'bg-green-100 text-green-700'
                      }>
                        {staff.status === 'overtime' ? 'Over' :
                         staff.status === 'underutilized' ? 'Under' : 'OK'}
                      </Badge>
                    </td>
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