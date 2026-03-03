import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis
} from "recharts";
import {
  TrendingUp, TrendingDown, Clock, CheckCircle, ThumbsUp,
  AlertTriangle, Users, Activity, Award, Target, BarChart3,
  Star, BookOpen, ClipboardList, Navigation, Zap
} from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, differenceInMinutes, subDays, subMonths } from "date-fns";

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

function MetricCard({ title, value, subtitle, icon: Icon, color = "blue", trend }) {
  const colorMap = {
    green: "text-green-600 bg-green-50",
    blue: "text-blue-600 bg-blue-50",
    purple: "text-purple-600 bg-purple-50",
    orange: "text-orange-600 bg-orange-50",
    red: "text-red-600 bg-red-50",
    teal: "text-teal-600 bg-teal-50",
    yellow: "text-yellow-600 bg-yellow-50",
  };
  const cls = colorMap[color] || colorMap.blue;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
            {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
            {trend !== undefined && (
              <div className="flex items-center gap-1 mt-2">
                {trend >= 0 ? (
                  <TrendingUp className="w-3 h-3 text-green-600" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-red-600" />
                )}
                <span className={`text-xs font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {trend >= 0 ? '+' : ''}{trend}% vs last period
                </span>
              </div>
            )}
          </div>
          <div className={`p-2 rounded-lg ${cls}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RatingStars({ rating }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={`w-4 h-4 ${i <= Math.round(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
        />
      ))}
    </div>
  );
}

function TrainingFlag({ label, severity = "medium" }) {
  const colors = { low: "bg-yellow-100 text-yellow-800", medium: "bg-orange-100 text-orange-800", high: "bg-red-100 text-red-800" };
  return <Badge className={`text-xs ${colors[severity]}`}>{label}</Badge>;
}

export default function CarerPerformanceDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [selectedCarer, setSelectedCarer] = useState("all");
  const [activeTab, setActiveTab] = useState("overview");

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
    queryFn: () => base44.entities.ClientFeedback.list('-created_date', 300),
  });

  const { data: careTasks = [] } = useQuery({
    queryKey: ['care-tasks'],
    queryFn: () => base44.entities.CareTask.list('-scheduled_date', 500),
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ['incidents'],
    queryFn: () => base44.entities.Incident.list('-created_date', 200),
  });

  const { data: training = [] } = useQuery({
    queryKey: ['training-assignments'],
    queryFn: () => base44.entities.TrainingAssignment.list(),
  });

  const allCarers = useMemo(() => [...staff, ...carers], [staff, carers]);

  const getPeriodRange = () => {
    const now = new Date();
    if (selectedPeriod === "week") return { start: subDays(now, 7), end: now };
    if (selectedPeriod === "month") return { start: startOfMonth(now), end: endOfMonth(now) };
    return { start: subMonths(now, 3), end: now };
  };

  const periodRange = getPeriodRange();

  const inPeriod = (dateStr) => {
    if (!dateStr) return false;
    try {
      return isWithinInterval(parseISO(dateStr), periodRange);
    } catch { return false; }
  };

  const matchesCarer = (v) => {
    if (selectedCarer === "all") return true;
    return v.staff_id === selectedCarer || v.assigned_staff_id === selectedCarer || v.carer_id === selectedCarer;
  };

  const filteredVisits = useMemo(() =>
    visits.filter(v => inPeriod(v.scheduled_start || v.date) && matchesCarer(v)),
    [visits, selectedCarer, selectedPeriod]
  );

  const filteredTasks = useMemo(() =>
    careTasks.filter(t => inPeriod(t.scheduled_date) && (selectedCarer === "all" || t.assigned_carer_id === selectedCarer)),
    [careTasks, selectedCarer, selectedPeriod]
  );

  const filteredFeedback = useMemo(() =>
    feedback.filter(f => inPeriod(f.created_date) && (selectedCarer === "all" || f.staff_id === selectedCarer || f.carer_id === selectedCarer)),
    [feedback, selectedCarer, selectedPeriod]
  );

  // Core KPIs
  const kpis = useMemo(() => {
    const totalVisits = filteredVisits.length;
    const completedVisits = filteredVisits.filter(v => v.status === 'completed' || v.attendance_status === 'attended').length;
    const completionRate = totalVisits > 0 ? (completedVisits / totalVisits * 100) : 0;

    const clockedVisits = filteredVisits.filter(v => v.actual_start || v.actual_start_time);
    const onTimeVisits = clockedVisits.filter(v => {
      try {
        const sched = new Date(v.scheduled_start || v.date);
        const actual = new Date(v.actual_start || v.actual_start_time);
        const diff = differenceInMinutes(actual, sched);
        return diff >= -10 && diff <= 15;
      } catch { return false; }
    }).length;
    const onTimeRate = clockedVisits.length > 0 ? (onTimeVisits / clockedVisits.length * 100) : 0;

    const totalTasks = filteredTasks.length;
    const completedTasks = filteredTasks.filter(t => t.task_status === 'completed').length;
    const taskCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks * 100) : 0;

    const ratings = filteredFeedback.filter(f => f.rating > 0).map(f => f.rating);
    const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
    const positiveFeedback = filteredFeedback.filter(f => f.rating >= 4).length;
    const positiveFeedbackRate = filteredFeedback.length > 0 ? (positiveFeedback / filteredFeedback.length * 100) : 0;

    return {
      completionRate: completionRate.toFixed(1),
      onTimeRate: onTimeRate.toFixed(1),
      taskCompletionRate: taskCompletionRate.toFixed(1),
      avgRating: avgRating.toFixed(1),
      positiveFeedbackRate: positiveFeedbackRate.toFixed(1),
      totalVisits,
      completedVisits,
      onTimeVisits,
      clockedVisits: clockedVisits.length,
      totalTasks,
      completedTasks,
      feedbackCount: filteredFeedback.length,
    };
  }, [filteredVisits, filteredTasks, filteredFeedback]);

  // Per-carer breakdown
  const carerBreakdown = useMemo(() => {
    const list = selectedCarer === "all" ? allCarers.slice(0, 15) : allCarers.filter(c => c.id === selectedCarer);
    return list.map(carer => {
      const cv = filteredVisits.filter(v => v.staff_id === carer.id || v.assigned_staff_id === carer.id || v.carer_id === carer.id);
      const done = cv.filter(v => v.status === 'completed' || v.attendance_status === 'attended').length;
      const clocked = cv.filter(v => v.actual_start || v.actual_start_time);
      const onTime = clocked.filter(v => {
        try {
          const diff = differenceInMinutes(new Date(v.actual_start || v.actual_start_time), new Date(v.scheduled_start || v.date));
          return diff >= -10 && diff <= 15;
        } catch { return false; }
      }).length;

      const ct = careTasks.filter(t => t.assigned_carer_id === carer.id && inPeriod(t.scheduled_date));
      const ctDone = ct.filter(t => t.task_status === 'completed').length;

      const fb = feedback.filter(f => (f.staff_id === carer.id || f.carer_id === carer.id) && inPeriod(f.created_date));
      const ratings = fb.filter(f => f.rating > 0).map(f => f.rating);
      const avgR = ratings.length > 0 ? (ratings.reduce((a, b) => a + b, 0) / ratings.length) : null;

      const carerTraining = training.filter(t => t.staff_id === carer.id || t.assigned_to_staff_id === carer.id);
      const overdueTraining = carerTraining.filter(t => t.status !== 'completed' && t.due_date && new Date(t.due_date) < new Date()).length;

      const carerIncidents = incidents.filter(i => i.staff_id === carer.id || i.reported_by_id === carer.id).length;

      const completionRate = cv.length > 0 ? (done / cv.length * 100) : 0;
      const onTimeRate = clocked.length > 0 ? (onTime / clocked.length * 100) : 0;
      const taskRate = ct.length > 0 ? (ctDone / ct.length * 100) : 0;

      // Training flags
      const flags = [];
      if (completionRate < 75 && cv.length > 0) flags.push({ label: "Low visit completion", severity: "high" });
      if (onTimeRate < 70 && clocked.length > 3) flags.push({ label: "Punctuality concern", severity: "medium" });
      if (taskRate < 70 && ct.length > 3) flags.push({ label: "Task completion low", severity: "medium" });
      if (avgR !== null && avgR < 3.5 && ratings.length >= 2) flags.push({ label: "Client satisfaction low", severity: "high" });
      if (overdueTraining > 0) flags.push({ label: `${overdueTraining} overdue training`, severity: "medium" });
      if (carerIncidents >= 2) flags.push({ label: "Multiple incidents", severity: "high" });

      const score = (
        (completionRate * 0.3) +
        (onTimeRate * 0.25) +
        (taskRate * 0.25) +
        ((avgR || 3) / 5 * 100 * 0.2)
      );

      return {
        id: carer.id,
        name: carer.full_name || 'Unknown',
        totalVisits: cv.length,
        completedVisits: done,
        completionRate,
        onTimeRate,
        taskRate,
        avgRating: avgR,
        feedbackCount: fb.length,
        overdueTraining,
        incidents: carerIncidents,
        flags,
        score: parseFloat(score.toFixed(1)),
      };
    }).sort((a, b) => b.score - a.score);
  }, [allCarers, filteredVisits, careTasks, feedback, training, incidents, selectedCarer]);

  // Feedback trend over time
  const feedbackTrend = useMemo(() => {
    const days = selectedPeriod === "week" ? 7 : selectedPeriod === "month" ? 4 : 12;
    const step = selectedPeriod === "week" ? 1 : selectedPeriod === "month" ? 7 : 7;
    const data = [];
    for (let i = days - 1; i >= 0; i--) {
      const to = subDays(new Date(), i * step);
      const from = subDays(to, step);
      const slice = filteredFeedback.filter(f => {
        try { const d = parseISO(f.created_date); return d >= from && d <= to; } catch { return false; }
      });
      const ratings = slice.filter(f => f.rating > 0).map(f => f.rating);
      const avg = ratings.length > 0 ? parseFloat((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2)) : null;
      data.push({
        label: format(to, selectedPeriod === "week" ? 'EEE' : 'MMM d'),
        avg,
        count: slice.length,
        positive: slice.filter(f => f.rating >= 4).length,
      });
    }
    return data;
  }, [filteredFeedback, selectedPeriod]);

  // Visit completion trend
  const visitTrend = useMemo(() => {
    const days = selectedPeriod === "week" ? 7 : selectedPeriod === "month" ? 30 : 90;
    const groupBy = selectedPeriod === "quarter" ? 7 : 1;
    const buckets = Math.ceil(days / groupBy);
    return Array.from({ length: buckets }, (_, i) => {
      const from = subDays(new Date(), (buckets - 1 - i) * groupBy + groupBy);
      const to = subDays(new Date(), (buckets - 1 - i) * groupBy);
      const slice = filteredVisits.filter(v => {
        try { const d = parseISO(v.scheduled_start || v.date); return d >= from && d <= to; } catch { return false; }
      });
      return {
        label: format(to, groupBy > 1 ? 'MMM d' : 'EEE d'),
        total: slice.length,
        completed: slice.filter(v => v.status === 'completed' || v.attendance_status === 'attended').length,
        onTime: slice.filter(v => {
          if (!v.actual_start) return false;
          try { const diff = differenceInMinutes(new Date(v.actual_start), new Date(v.scheduled_start || v.date)); return diff >= -10 && diff <= 15; } catch { return false; }
        }).length,
      };
    });
  }, [filteredVisits, selectedPeriod]);

  // Radar for selected carer
  const radarData = useMemo(() => {
    const c = carerBreakdown[0];
    if (!c) return [];
    return [
      { metric: 'Visit Completion', value: c.completionRate },
      { metric: 'Punctuality', value: c.onTimeRate },
      { metric: 'Task Completion', value: c.taskRate },
      { metric: 'Client Rating', value: c.avgRating ? (c.avgRating / 5 * 100) : 0 },
      { metric: 'No Incidents', value: Math.max(0, 100 - c.incidents * 20) },
      { metric: 'Training', value: Math.max(0, 100 - c.overdueTraining * 25) },
    ];
  }, [carerBreakdown]);

  const needsTraining = carerBreakdown.filter(c => c.flags.length > 0);

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-blue-600" />
              Carer Performance Dashboard
            </h1>
            <p className="text-gray-500 mt-1">KPIs for on-time arrivals, task completion & client satisfaction</p>
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
              <SelectTrigger className="w-52">
                <SelectValue placeholder="All Carers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Carers</SelectItem>
                {allCarers.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <MetricCard title="Visit Completion" value={`${kpis.completionRate}%`} subtitle={`${kpis.completedVisits}/${kpis.totalVisits} visits`} icon={CheckCircle} color="green" />
          <MetricCard title="On-Time Arrivals" value={`${kpis.onTimeRate}%`} subtitle={`${kpis.onTimeVisits}/${kpis.clockedVisits} clocked`} icon={Clock} color="blue" />
          <MetricCard title="Task Completion" value={`${kpis.taskCompletionRate}%`} subtitle={`${kpis.completedTasks}/${kpis.totalTasks} tasks`} icon={ClipboardList} color="purple" />
          <MetricCard title="Avg Client Rating" value={`${kpis.avgRating}/5`} subtitle={`${kpis.feedbackCount} reviews`} icon={Star} color="yellow" />
          <MetricCard title="Positive Feedback" value={`${kpis.positiveFeedbackRate}%`} subtitle="Rated 4★ or above" icon={ThumbsUp} color="teal" />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="carers">Carer Breakdown</TabsTrigger>
            <TabsTrigger value="feedback">Feedback Trends</TabsTrigger>
            <TabsTrigger value="training">Training Needs</TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Visit completion trend */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    Visit Completion Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={visitTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="total" stroke="#94a3b8" strokeWidth={1} name="Total" dot={false} />
                      <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} name="Completed" dot={false} />
                      <Line type="monotone" dataKey="onTime" stroke="#3b82f6" strokeWidth={2} name="On Time" dot={false} strokeDasharray="5 5" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Positive feedback trend */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ThumbsUp className="w-4 h-4 text-yellow-600" />
                    Positive Feedback Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={feedbackTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" domain={[0, 5]} />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="positive" fill="#10b981" name="Positive (4★+)" />
                      <Bar yAxisId="left" dataKey="count" fill="#e2e8f0" name="Total reviews" />
                      <Line yAxisId="right" type="monotone" dataKey="avg" stroke="#f59e0b" strokeWidth={2} name="Avg Rating" dot />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Top performers */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Award className="w-4 h-4 text-yellow-500" />
                    Top Performers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {carerBreakdown.slice(0, 8).map((c, idx) => (
                      <div key={c.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          idx === 0 ? 'bg-yellow-400 text-yellow-900' :
                          idx === 1 ? 'bg-gray-300 text-gray-700' :
                          idx === 2 ? 'bg-orange-400 text-orange-900' :
                          'bg-blue-100 text-blue-700'
                        }`}>{idx + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{c.name}</p>
                          <div className="flex gap-2 flex-wrap">
                            <span className="text-xs text-gray-500">{c.completionRate.toFixed(0)}% visits</span>
                            <span className="text-xs text-gray-500">{c.onTimeRate.toFixed(0)}% on-time</span>
                            {c.avgRating && <span className="text-xs text-yellow-600">{c.avgRating.toFixed(1)}★</span>}
                          </div>
                        </div>
                        <Badge className={`text-xs ${c.score >= 80 ? 'bg-green-100 text-green-700' : c.score >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                          {c.score}pts
                        </Badge>
                      </div>
                    ))}
                    {carerBreakdown.length === 0 && <p className="text-sm text-gray-500 text-center py-4">No carer data for this period</p>}
                  </div>
                </CardContent>
              </Card>

              {/* Radar chart for selected carer / top carer */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Zap className="w-4 h-4 text-purple-600" />
                    Performance Radar {carerBreakdown[0] ? `— ${carerBreakdown[0].name}` : ''}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {radarData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <RadarChart data={radarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                        <Radar name="Score" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.25} />
                        <Tooltip formatter={(v) => `${v.toFixed(0)}%`} />
                      </RadarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-16">No data available</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* CARER BREAKDOWN TAB */}
          <TabsContent value="carers">
            <div className="space-y-4">
              {/* Bar chart comparison */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">KPI Comparison Across Carers</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={carerBreakdown.slice(0, 12).map(c => ({
                      name: c.name.split(' ')[0],
                      'Visits %': parseFloat(c.completionRate.toFixed(0)),
                      'On-Time %': parseFloat(c.onTimeRate.toFixed(0)),
                      'Tasks %': parseFloat(c.taskRate.toFixed(0)),
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Visits %" fill="#10b981" />
                      <Bar dataKey="On-Time %" fill="#3b82f6" />
                      <Bar dataKey="Tasks %" fill="#8b5cf6" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Detailed Carer Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-500 border-b">
                          <th className="pb-3 pr-4 font-medium">Carer</th>
                          <th className="pb-3 pr-4 font-medium">Visits Done</th>
                          <th className="pb-3 pr-4 font-medium">On-Time</th>
                          <th className="pb-3 pr-4 font-medium">Tasks</th>
                          <th className="pb-3 pr-4 font-medium">Rating</th>
                          <th className="pb-3 pr-4 font-medium">Score</th>
                          <th className="pb-3 font-medium">Flags</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {carerBreakdown.map(c => (
                          <tr key={c.id} className="hover:bg-gray-50">
                            <td className="py-3 pr-4 font-medium">{c.name}</td>
                            <td className="py-3 pr-4">
                              <div className="flex items-center gap-2">
                                <Progress value={c.completionRate} className="w-16 h-2" />
                                <span className={c.completionRate >= 85 ? 'text-green-600' : c.completionRate >= 70 ? 'text-yellow-600' : 'text-red-600'}>
                                  {c.completionRate.toFixed(0)}%
                                </span>
                              </div>
                            </td>
                            <td className="py-3 pr-4">
                              <div className="flex items-center gap-2">
                                <Progress value={c.onTimeRate} className="w-16 h-2" />
                                <span className={c.onTimeRate >= 80 ? 'text-green-600' : c.onTimeRate >= 65 ? 'text-yellow-600' : 'text-red-600'}>
                                  {c.onTimeRate.toFixed(0)}%
                                </span>
                              </div>
                            </td>
                            <td className="py-3 pr-4">
                              <span className={c.taskRate >= 80 ? 'text-green-600' : c.taskRate >= 65 ? 'text-yellow-600' : 'text-red-600'}>
                                {c.taskRate.toFixed(0)}%
                              </span>
                            </td>
                            <td className="py-3 pr-4">
                              {c.avgRating ? (
                                <div className="flex items-center gap-1">
                                  <RatingStars rating={c.avgRating} />
                                  <span className="text-xs text-gray-500">({c.feedbackCount})</span>
                                </div>
                              ) : <span className="text-gray-400 text-xs">No data</span>}
                            </td>
                            <td className="py-3 pr-4">
                              <Badge className={`${c.score >= 80 ? 'bg-green-100 text-green-700' : c.score >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                {c.score}
                              </Badge>
                            </td>
                            <td className="py-3">
                              <div className="flex flex-wrap gap-1">
                                {c.flags.length === 0
                                  ? <span className="text-green-600 text-xs">✓ All good</span>
                                  : c.flags.map((f, i) => <TrainingFlag key={i} label={f.label} severity={f.severity} />)
                                }
                              </div>
                            </td>
                          </tr>
                        ))}
                        {carerBreakdown.length === 0 && (
                          <tr><td colSpan={7} className="py-8 text-center text-gray-500">No data for selected period</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* FEEDBACK TRENDS TAB */}
          <TabsContent value="feedback">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Average Rating Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={feedbackTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 5]} />
                      <Tooltip />
                      <Line type="monotone" dataKey="avg" stroke="#f59e0b" strokeWidth={2} name="Avg Rating" dot />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Positive vs Other Feedback</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={feedbackTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="positive" fill="#10b981" name="Positive (4-5★)" stackId="a" />
                      <Bar dataKey="count" fill="#e2e8f0" name="Other" stackId="a"
                        label={false}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Per-carer ratings */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">Client Satisfaction by Carer</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {carerBreakdown.filter(c => c.avgRating !== null).map(c => (
                      <div key={c.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {c.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{c.name}</p>
                          <RatingStars rating={c.avgRating} />
                          <p className="text-xs text-gray-500 mt-0.5">{c.feedbackCount} review{c.feedbackCount !== 1 ? 's' : ''}</p>
                        </div>
                        <span className={`text-lg font-bold ${c.avgRating >= 4 ? 'text-green-600' : c.avgRating >= 3 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {c.avgRating.toFixed(1)}
                        </span>
                      </div>
                    ))}
                    {carerBreakdown.filter(c => c.avgRating !== null).length === 0 && (
                      <p className="text-sm text-gray-500 col-span-3 text-center py-8">No feedback data for this period</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TRAINING NEEDS TAB */}
          <TabsContent value="training">
            <div className="space-y-6">
              {needsTraining.length > 0 ? (
                <>
                  <div className="flex items-center gap-2 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                    <p className="text-sm text-amber-800">
                      <strong>{needsTraining.length} carer{needsTraining.length !== 1 ? 's' : ''}</strong> have been flagged for potential training or performance support.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {needsTraining.map(c => (
                      <Card key={c.id} className="border-l-4 border-l-orange-400">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="font-semibold text-gray-900">{c.name}</p>
                              <p className="text-xs text-gray-500">{c.totalVisits} visits in period</p>
                            </div>
                            <Badge className={`${c.flags.some(f => f.severity === 'high') ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                              {c.flags.length} issue{c.flags.length !== 1 ? 's' : ''}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                            <div className="bg-gray-50 rounded p-2">
                              <p className="text-xs text-gray-500">Visits</p>
                              <p className={`text-sm font-bold ${c.completionRate >= 80 ? 'text-green-600' : 'text-red-600'}`}>{c.completionRate.toFixed(0)}%</p>
                            </div>
                            <div className="bg-gray-50 rounded p-2">
                              <p className="text-xs text-gray-500">On-Time</p>
                              <p className={`text-sm font-bold ${c.onTimeRate >= 75 ? 'text-green-600' : 'text-red-600'}`}>{c.onTimeRate.toFixed(0)}%</p>
                            </div>
                            <div className="bg-gray-50 rounded p-2">
                              <p className="text-xs text-gray-500">Rating</p>
                              <p className={`text-sm font-bold ${!c.avgRating || c.avgRating >= 3.5 ? 'text-green-600' : 'text-red-600'}`}>
                                {c.avgRating ? `${c.avgRating.toFixed(1)}★` : 'N/A'}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Recommended Actions</p>
                            <div className="flex flex-wrap gap-1.5">
                              {c.flags.map((f, i) => <TrainingFlag key={i} label={f.label} severity={f.severity} />)}
                            </div>
                            <div className="text-xs text-gray-600 space-y-1 pt-1">
                              {c.flags.some(f => f.label.includes('punctuality') || f.label.includes('Punctuality')) && (
                                <p>→ <strong>Time management training</strong> recommended</p>
                              )}
                              {c.flags.some(f => f.label.includes('completion') || f.label.includes('visit')) && (
                                <p>→ <strong>1-1 supervision</strong> to review case load</p>
                              )}
                              {c.flags.some(f => f.label.includes('satisfaction') || f.label.includes('Rating')) && (
                                <p>→ <strong>Communication skills training</strong> / shadow session</p>
                              )}
                              {c.overdueTraining > 0 && (
                                <p>→ <strong>Complete {c.overdueTraining} overdue training module{c.overdueTraining > 1 ? 's' : ''}</strong></p>
                              )}
                              {c.incidents >= 2 && (
                                <p>→ <strong>Incident review</strong> and debrief required</p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-16">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900">All Carers Performing Well</h3>
                  <p className="text-gray-500 mt-2">No training needs identified for the selected period.</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}