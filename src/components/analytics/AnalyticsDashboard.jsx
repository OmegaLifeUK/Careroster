import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Calendar,
  Clock,
  DollarSign,
  Activity,
  AlertCircle
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from "recharts";
import { format, subDays, parseISO, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function AnalyticsDashboard({ shifts, carers, clients, timeRange = 30 }) {
  const analytics = useMemo(() => {
    const now = new Date();
    const startDate = subDays(now, timeRange);

    // Filter data for time range
    const recentShifts = shifts.filter(s => {
      if (!s.date) return false;
      try {
        const shiftDate = parseISO(s.date);
        return shiftDate >= startDate && shiftDate <= now;
      } catch {
        return false;
      }
    });

    // 1. Shift Status Distribution
    const statusDistribution = {};
    recentShifts.forEach(s => {
      statusDistribution[s.status] = (statusDistribution[s.status] || 0) + 1;
    });

    const statusData = Object.entries(statusDistribution).map(([status, count]) => ({
      name: status.replace('_', ' '),
      value: count
    }));

    // 2. Daily Shift Trend
    const dailyShifts = {};
    recentShifts.forEach(s => {
      const date = s.date;
      dailyShifts[date] = (dailyShifts[date] || 0) + 1;
    });

    const trendData = Object.entries(dailyShifts)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14) // Last 14 days
      .map(([date, count]) => ({
        date: format(parseISO(date), 'MMM dd'),
        shifts: count
      }));

    // 3. Carer Workload
    const carerWorkload = {};
    recentShifts.forEach(s => {
      if (s.carer_id) {
        if (!carerWorkload[s.carer_id]) {
          carerWorkload[s.carer_id] = { hours: 0, shifts: 0 };
        }
        carerWorkload[s.carer_id].hours += s.duration_hours || 0;
        carerWorkload[s.carer_id].shifts += 1;
      }
    });

    const workloadData = Object.entries(carerWorkload)
      .map(([carerId, data]) => {
        const carer = carers.find(c => c.id === carerId);
        return {
          name: carer?.full_name?.split(' ')[0] || 'Unknown',
          hours: data.hours,
          shifts: data.shifts
        };
      })
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 10);

    // 4. Shift Type Distribution
    const shiftTypes = {};
    recentShifts.forEach(s => {
      if (s.shift_type) {
        shiftTypes[s.shift_type] = (shiftTypes[s.shift_type] || 0) + 1;
      }
    });

    const shiftTypeData = Object.entries(shiftTypes).map(([type, count]) => ({
      name: type,
      value: count
    }));

    // 5. Key Metrics
    const totalHours = recentShifts.reduce((sum, s) => sum + (s.duration_hours || 0), 0);
    const completedShifts = recentShifts.filter(s => s.status === 'completed').length;
    const completionRate = recentShifts.length > 0 
      ? ((completedShifts / recentShifts.length) * 100).toFixed(1)
      : 0;
    const unfilledShifts = recentShifts.filter(s => s.status === 'unfilled').length;
    const avgShiftDuration = totalHours / (recentShifts.length || 1);

    // 6. Utilization Rate
    const activeCarers = carers.filter(c => c.status === 'active').length;
    const utilizationRate = activeCarers > 0
      ? ((completedShifts / (activeCarers * timeRange)) * 100).toFixed(1)
      : 0;

    // 7. Compare with previous period
    const previousStartDate = subDays(startDate, timeRange);
    const previousShifts = shifts.filter(s => {
      if (!s.date) return false;
      try {
        const shiftDate = parseISO(s.date);
        return shiftDate >= previousStartDate && shiftDate < startDate;
      } catch {
        return false;
      }
    });

    const previousCompleted = previousShifts.filter(s => s.status === 'completed').length;
    const shiftGrowth = previousCompleted > 0
      ? (((completedShifts - previousCompleted) / previousCompleted) * 100).toFixed(1)
      : 0;

    return {
      statusData,
      trendData,
      workloadData,
      shiftTypeData,
      metrics: {
        totalShifts: recentShifts.length,
        completedShifts,
        completionRate,
        unfilledShifts,
        totalHours: totalHours.toFixed(1),
        avgShiftDuration: avgShiftDuration.toFixed(1),
        utilizationRate,
        shiftGrowth
      }
    };
  }, [shifts, carers, timeRange]);

  const MetricCard = ({ title, value, subtitle, icon: Icon, trend, trendValue }) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">{title}</p>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            {subtitle && (
              <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
            )}
          </div>
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <Icon className="w-6 h-6 text-blue-600" />
          </div>
        </div>
        {trend && (
          <div className="mt-4 flex items-center gap-2">
            {trend === 'up' ? (
              <TrendingUp className="w-4 h-4 text-green-600" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-600" />
            )}
            <span className={`text-sm font-medium ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
              {trendValue}%
            </span>
            <span className="text-sm text-gray-500">vs previous period</span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Shifts"
          value={analytics.metrics.totalShifts}
          subtitle="Last 30 days"
          icon={Calendar}
          trend={parseFloat(analytics.metrics.shiftGrowth) >= 0 ? 'up' : 'down'}
          trendValue={Math.abs(analytics.metrics.shiftGrowth)}
        />
        <MetricCard
          title="Completed"
          value={analytics.metrics.completedShifts}
          subtitle={`${analytics.metrics.completionRate}% completion rate`}
          icon={Activity}
        />
        <MetricCard
          title="Total Hours"
          value={analytics.metrics.totalHours}
          subtitle={`${analytics.metrics.avgShiftDuration}h avg per shift`}
          icon={Clock}
        />
        <MetricCard
          title="Unfilled"
          value={analytics.metrics.unfilledShifts}
          subtitle={analytics.metrics.unfilledShifts > 0 ? "Needs attention" : "All covered"}
          icon={AlertCircle}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Shift Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Shift Trend (Last 14 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="shifts" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Shift Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {analytics.statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Carer Workload */}
        <Card>
          <CardHeader>
            <CardTitle>Top Carers by Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.workloadData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={80} />
                <Tooltip />
                <Legend />
                <Bar dataKey="hours" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Shift Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Shifts by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.shiftTypeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Utilization Metric */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Carer Utilization Rate</h3>
              <p className="text-sm text-gray-600">
                Measures how efficiently your care team is being utilized
              </p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold text-blue-600">{analytics.metrics.utilizationRate}%</p>
              <Badge className={
                parseFloat(analytics.metrics.utilizationRate) >= 70 
                  ? "bg-green-100 text-green-800"
                  : parseFloat(analytics.metrics.utilizationRate) >= 50
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-red-100 text-red-800"
              }>
                {parseFloat(analytics.metrics.utilizationRate) >= 70 
                  ? "Excellent"
                  : parseFloat(analytics.metrics.utilizationRate) >= 50
                    ? "Good"
                    : "Needs Improvement"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}