import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from "recharts";
import { 
  TrendingUp, TrendingDown, Clock, CheckCircle, ThumbsUp, 
  AlertTriangle, Users, Calendar, Navigation, Activity,
  Award, Target, BarChart3
} from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, differenceInMinutes } from "date-fns";

export default function CarerPerformanceDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [selectedCarer, setSelectedCarer] = useState("all");

  const { data: visits = [] } = useQuery({
    queryKey: ['visits'],
    queryFn: () => base44.entities.Visit.list('-scheduled_start', 500),
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: () => base44.entities.Staff.list(),
  });

  const { data: carers = [] } = useQuery({
    queryKey: ['carers'],
    queryFn: () => base44.entities.Carer.list(),
  });

  const { data: feedback = [] } = useQuery({
    queryKey: ['client-feedback'],
    queryFn: () => base44.entities.ClientFeedback.list('-created_date', 200),
  });

  const allCarers = useMemo(() => {
    return [...staff, ...carers].filter(c => c && c.is_active !== false);
  }, [staff, carers]);

  const getPeriodDates = () => {
    const now = new Date();
    if (selectedPeriod === "week") {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { start: weekAgo, end: now };
    } else if (selectedPeriod === "month") {
      return { start: startOfMonth(now), end: endOfMonth(now) };
    } else {
      const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      return { start: threeMonthsAgo, end: now };
    }
  };

  const periodDates = getPeriodDates();

  const filteredVisits = useMemo(() => {
    return visits.filter(v => {
      if (!v.scheduled_start) return false;
      try {
        const visitDate = parseISO(v.scheduled_start);
        const inPeriod = isWithinInterval(visitDate, periodDates);
        if (!inPeriod) return false;
        
        if (selectedCarer === "all") return true;
        return (v.staff_id === selectedCarer || v.assigned_staff_id === selectedCarer);
      } catch {
        return false;
      }
    });
  }, [visits, selectedCarer, periodDates]);

  const metrics = useMemo(() => {
    const completed = filteredVisits.filter(v => v.status === 'completed');
    const total = filteredVisits.length;
    const completionRate = total > 0 ? (completed.length / total * 100).toFixed(1) : 0;

    // On-time arrivals
    const onTime = completed.filter(v => {
      if (!v.scheduled_start || !v.actual_start) return false;
      try {
        const scheduled = new Date(v.scheduled_start);
        const actual = new Date(v.actual_start);
        const diff = differenceInMinutes(actual, scheduled);
        return diff >= -5 && diff <= 15; // Within 5 mins early to 15 mins late
      } catch {
        return false;
      }
    }).length;
    const onTimeRate = completed.length > 0 ? (onTime / completed.length * 100).toFixed(1) : 0;

    // Travel efficiency
    const totalPlannedTravel = filteredVisits.reduce((sum, v) => sum + (v.estimated_travel_to_next || 0), 0);
    const totalActualTravel = filteredVisits.reduce((sum, v) => {
      if (!v.scheduled_end || !v.actual_end) return sum;
      try {
        const nextVisit = filteredVisits.find(nv => 
          nv.scheduled_start > v.scheduled_end && 
          (nv.staff_id === v.staff_id || nv.assigned_staff_id === v.assigned_staff_id)
        );
        if (!nextVisit || !nextVisit.actual_start) return sum;
        const travel = differenceInMinutes(new Date(nextVisit.actual_start), new Date(v.actual_end));
        return sum + Math.max(0, travel);
      } catch {
        return sum;
      }
    }, 0);
    const travelEfficiency = totalPlannedTravel > 0 ? 
      ((totalPlannedTravel / totalActualTravel) * 100).toFixed(1) : 100;

    // Client feedback
    const relevantFeedback = selectedCarer === "all" 
      ? feedback 
      : feedback.filter(f => f.staff_id === selectedCarer);
    const avgRating = relevantFeedback.length > 0
      ? (relevantFeedback.reduce((sum, f) => sum + (f.rating || 0), 0) / relevantFeedback.length).toFixed(1)
      : 0;

    // Working time compliance
    const carersList = selectedCarer === "all" ? allCarers : allCarers.filter(c => c.id === selectedCarer);
    let wtrCompliant = 0;
    let wtrTotal = carersList.length;
    
    carersList.forEach(carer => {
      const carerVisits = filteredVisits.filter(v => 
        v.staff_id === carer.id || v.assigned_staff_id === carer.id
      );
      const totalHours = carerVisits.reduce((sum, v) => {
        if (v.duration_minutes) return sum + (v.duration_minutes / 60);
        if (v.scheduled_start && v.scheduled_end) {
          try {
            const start = new Date(v.scheduled_start);
            const end = new Date(v.scheduled_end);
            return sum + (differenceInMinutes(end, start) / 60);
          } catch {
            return sum;
          }
        }
        return sum;
      }, 0);
      
      const weeklyHours = totalHours / (selectedPeriod === "week" ? 1 : selectedPeriod === "month" ? 4 : 12);
      if (weeklyHours <= 48) wtrCompliant++;
    });
    const wtrComplianceRate = wtrTotal > 0 ? (wtrCompliant / wtrTotal * 100).toFixed(1) : 100;

    return {
      completionRate,
      onTimeRate,
      travelEfficiency,
      avgRating,
      wtrComplianceRate,
      totalVisits: total,
      completedVisits: completed.length,
      onTimeArrivals: onTime,
      feedbackCount: relevantFeedback.length
    };
  }, [filteredVisits, feedback, selectedCarer, allCarers, selectedPeriod]);

  const carerPerformanceData = useMemo(() => {
    const data = [];
    const carersToShow = selectedCarer === "all" 
      ? allCarers.slice(0, 10) 
      : allCarers.filter(c => c.id === selectedCarer);

    carersToShow.forEach(carer => {
      const carerVisits = filteredVisits.filter(v => 
        v.staff_id === carer.id || v.assigned_staff_id === carer.id
      );
      const completed = carerVisits.filter(v => v.status === 'completed');
      const onTime = completed.filter(v => {
        if (!v.scheduled_start || !v.actual_start) return false;
        try {
          const diff = differenceInMinutes(new Date(v.actual_start), new Date(v.scheduled_start));
          return diff >= -5 && diff <= 15;
        } catch {
          return false;
        }
      });

      data.push({
        name: carer.full_name || 'Unknown',
        completed: completed.length,
        onTime: onTime.length,
        total: carerVisits.length
      });
    });

    return data.sort((a, b) => b.completed - a.completed);
  }, [allCarers, filteredVisits, selectedCarer]);

  const visitTrendData = useMemo(() => {
    const data = [];
    const days = selectedPeriod === "week" ? 7 : selectedPeriod === "month" ? 30 : 90;
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = format(date, 'yyyy-MM-dd');
      
      const dayVisits = filteredVisits.filter(v => {
        if (!v.scheduled_start) return false;
        return format(parseISO(v.scheduled_start), 'yyyy-MM-dd') === dateStr;
      });
      
      data.push({
        date: format(date, selectedPeriod === "week" ? 'EEE' : 'MMM d'),
        completed: dayVisits.filter(v => v.status === 'completed').length,
        total: dayVisits.length
      });
    }
    
    return data;
  }, [filteredVisits, selectedPeriod]);

  const statusDistribution = useMemo(() => {
    const distribution = {};
    filteredVisits.forEach(v => {
      const status = v.status || 'draft';
      distribution[status] = (distribution[status] || 0) + 1;
    });
    
    return Object.entries(distribution).map(([status, count]) => ({
      name: status.replace('_', ' '),
      value: count
    }));
  }, [filteredVisits]);

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  const MetricCard = ({ title, value, subtitle, icon: Icon, trend, color = "blue" }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
        <Icon className={`w-4 h-4 text-${color}-600`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        {trend && (
          <div className="flex items-center gap-1 mt-2">
            {trend > 0 ? (
              <TrendingUp className="w-3 h-3 text-green-600" />
            ) : (
              <TrendingDown className="w-3 h-3 text-red-600" />
            )}
            <span className={`text-xs ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {Math.abs(trend)}% vs last period
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-blue-600" />
              Carer Performance Dashboard
            </h1>
            <p className="text-gray-500 mt-1">Track and analyze carer metrics and performance</p>
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">Last 3 Months</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={selectedCarer} onValueChange={setSelectedCarer}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Carers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Carers</SelectItem>
                {allCarers.map(carer => (
                  <SelectItem key={carer.id} value={carer.id}>
                    {carer.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <MetricCard
            title="Completion Rate"
            value={`${metrics.completionRate}%`}
            subtitle={`${metrics.completedVisits} of ${metrics.totalVisits} visits`}
            icon={CheckCircle}
            color="green"
          />
          <MetricCard
            title="On-Time Arrivals"
            value={`${metrics.onTimeRate}%`}
            subtitle={`${metrics.onTimeArrivals} on-time visits`}
            icon={Clock}
            color="blue"
          />
          <MetricCard
            title="Travel Efficiency"
            value={`${metrics.travelEfficiency}%`}
            subtitle="Planned vs actual travel"
            icon={Navigation}
            color="purple"
          />
          <MetricCard
            title="Client Satisfaction"
            value={`${metrics.avgRating}/5`}
            subtitle={`${metrics.feedbackCount} ratings`}
            icon={ThumbsUp}
            color="orange"
          />
          <MetricCard
            title="WTR Compliance"
            value={`${metrics.wtrComplianceRate}%`}
            subtitle="Working time regulations"
            icon={Activity}
            color="teal"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Visit Completion Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={visitTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} name="Completed" />
                  <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} name="Total" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-purple-600" />
                Carer Performance Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={carerPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="completed" fill="#10b981" name="Completed" />
                  <Bar dataKey="onTime" fill="#3b82f6" name="On Time" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-orange-600" />
                Visit Status Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusDistribution.map((entry, index) => (
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
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-teal-600" />
                Top Performers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {carerPerformanceData.slice(0, 8).map((carer, idx) => {
                  const completionRate = carer.total > 0 ? ((carer.completed / carer.total) * 100).toFixed(0) : 0;
                  return (
                    <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          idx === 0 ? 'bg-yellow-400 text-yellow-900' :
                          idx === 1 ? 'bg-gray-300 text-gray-700' :
                          idx === 2 ? 'bg-orange-400 text-orange-900' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {idx + 1}
                        </span>
                        <span className="font-medium text-sm">{carer.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-xs">
                          {carer.completed}/{carer.total}
                        </Badge>
                        <span className="text-sm font-semibold text-green-600">{completionRate}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <h3 className="font-semibold text-green-900">Strengths</h3>
                </div>
                <ul className="text-sm text-green-800 space-y-1">
                  {parseFloat(metrics.completionRate) >= 90 && (
                    <li>• Excellent completion rate ({metrics.completionRate}%)</li>
                  )}
                  {parseFloat(metrics.onTimeRate) >= 85 && (
                    <li>• Strong punctuality ({metrics.onTimeRate}%)</li>
                  )}
                  {parseFloat(metrics.avgRating) >= 4 && (
                    <li>• High client satisfaction ({metrics.avgRating}/5)</li>
                  )}
                  {parseFloat(metrics.wtrComplianceRate) >= 95 && (
                    <li>• Excellent WTR compliance ({metrics.wtrComplianceRate}%)</li>
                  )}
                </ul>
              </div>

              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  <h3 className="font-semibold text-yellow-900">Areas for Improvement</h3>
                </div>
                <ul className="text-sm text-yellow-800 space-y-1">
                  {parseFloat(metrics.completionRate) < 80 && (
                    <li>• Completion rate below target</li>
                  )}
                  {parseFloat(metrics.onTimeRate) < 75 && (
                    <li>• Punctuality needs improvement</li>
                  )}
                  {parseFloat(metrics.travelEfficiency) < 85 && (
                    <li>• Travel efficiency could be optimized</li>
                  )}
                  {parseFloat(metrics.avgRating) < 3.5 && (
                    <li>• Client satisfaction needs attention</li>
                  )}
                </ul>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-blue-900">Recommendations</h3>
                </div>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Review route optimization regularly</li>
                  <li>• Provide punctuality training if needed</li>
                  <li>• Monitor working hours for compliance</li>
                  <li>• Gather regular client feedback</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}