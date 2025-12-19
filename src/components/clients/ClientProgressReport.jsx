import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, TrendingDown, Minus, Plus, FileText, Calendar, 
  Brain, GraduationCap, Heart, Users, Star, Activity, Home,
  ChevronDown, ChevronRight, Download, Printer, AlertTriangle,
  CheckCircle, Target, Sparkles, Loader2
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { format, subMonths, parseISO, startOfMonth, endOfMonth, differenceInDays } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, BarChart, Bar, AreaChart, Area } from "recharts";

const AREAS = [
  { key: "behaviour", label: "Behaviour", icon: Brain, color: "#8B5CF6" },
  { key: "education_schooling", label: "Education/Schooling", icon: GraduationCap, color: "#3B82F6" },
  { key: "social_emotional", label: "Social & Emotional", icon: Heart, color: "#EC4899" },
  { key: "health_wellbeing", label: "Health & Wellbeing", icon: Activity, color: "#10B981" },
  { key: "independence_skills", label: "Independence Skills", icon: Home, color: "#F59E0B" },
  { key: "activities_engagement", label: "Activities & Engagement", icon: Star, color: "#6366F1" },
];

const TrendIcon = ({ trend }) => {
  if (trend === "improving") return <TrendingUp className="w-4 h-4 text-green-600" />;
  if (trend === "declining") return <TrendingDown className="w-4 h-4 text-red-600" />;
  return <Minus className="w-4 h-4 text-gray-400" />;
};

const RatingBadge = ({ rating }) => {
  const color = rating >= 8 ? "bg-green-100 text-green-800" 
    : rating >= 6 ? "bg-blue-100 text-blue-800"
    : rating >= 4 ? "bg-amber-100 text-amber-800"
    : "bg-red-100 text-red-800";
  return <Badge className={color}>{rating}/10</Badge>;
};

export default function ClientProgressReport({ clientId, client }) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [viewMode, setViewMode] = useState("overview");
  const [dateRange, setDateRange] = useState("6months");
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: progressRecords = [], isLoading } = useQuery({
    queryKey: ['client-progress', clientId],
    queryFn: async () => {
      const data = await base44.entities.ClientProgressRecord.filter({ client_id: clientId }, '-record_date');
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: behaviourCharts = [] } = useQuery({
    queryKey: ['behaviour-charts', clientId],
    queryFn: async () => {
      const data = await base44.entities.BehaviorChart.filter({ client_id: clientId }, '-chart_date');
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: dailyNotes = [] } = useQuery({
    queryKey: ['daily-notes', clientId],
    queryFn: async () => {
      const data = await base44.entities.DailyCareNote.filter({ client_id: clientId }, '-date', 100);
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: carePlans = [] } = useQuery({
    queryKey: ['care-plans', clientId],
    queryFn: async () => {
      const data = await base44.entities.CarePlan.filter({ client_id: clientId, status: 'active' });
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff-list'],
    queryFn: () => base44.entities.Staff.list(),
  });

  // Calculate trends from historical data
  const trendData = useMemo(() => {
    const months = dateRange === "3months" ? 3 : dateRange === "6months" ? 6 : 12;
    const cutoffDate = subMonths(new Date(), months);
    
    const filtered = progressRecords.filter(r => new Date(r.record_date) >= cutoffDate);
    
    return filtered.map(record => ({
      date: format(new Date(record.record_date), 'MMM d'),
      behaviour: record.behaviour?.overall_rating || 0,
      education: record.education_schooling?.overall_rating || 0,
      social: record.social_emotional?.overall_rating || 0,
      health: record.health_wellbeing?.overall_rating || 0,
      independence: record.independence_skills?.overall_rating || 0,
      activities: record.activities_engagement?.overall_rating || 0,
      overall: record.overall_rating || 0,
    })).reverse();
  }, [progressRecords, dateRange]);

  // Radar chart data for latest record
  const radarData = useMemo(() => {
    const latest = progressRecords[0];
    if (!latest) return [];
    
    return AREAS.map(area => ({
      area: area.label,
      value: latest[area.key]?.overall_rating || 0,
      fullMark: 10,
    }));
  }, [progressRecords]);

  // Calculate improvements/declines
  const progressSummary = useMemo(() => {
    if (progressRecords.length < 2) return null;
    
    const latest = progressRecords[0];
    const previous = progressRecords[1];
    
    const changes = AREAS.map(area => {
      const current = latest[area.key]?.overall_rating || 0;
      const prev = previous[area.key]?.overall_rating || 0;
      const change = current - prev;
      return {
        ...area,
        current,
        previous: prev,
        change,
        trend: latest[area.key]?.trend || 'stable',
      };
    });
    
    return {
      improvements: changes.filter(c => c.change > 0),
      declines: changes.filter(c => c.change < 0),
      stable: changes.filter(c => c.change === 0),
      overallChange: (latest.overall_rating || 0) - (previous.overall_rating || 0),
    };
  }, [progressRecords]);

  // AI Generate Progress Report
  const generateAIReport = async () => {
    setIsGeneratingAI(true);
    try {
      // Gather comprehensive context from multiple data sources
      const recentBehaviour = behaviourCharts.slice(0, 15);
      const recentNotes = dailyNotes.slice(0, 30);
      const activePlan = carePlans[0];
      const recentProgress = progressRecords.slice(0, 3);
      
      // Analyze trends from historical progress records
      const historicalTrends = recentProgress.map((r, idx) => ({
        date: r.record_date,
        ratings: {
          behaviour: r.behaviour?.overall_rating || 0,
          education: r.education_schooling?.overall_rating || 0,
          social: r.social_emotional?.overall_rating || 0,
          health: r.health_wellbeing?.overall_rating || 0,
          independence: r.independence_skills?.overall_rating || 0,
          activities: r.activities_engagement?.overall_rating || 0,
        },
        concerns: r.concerns || [],
        achievements: r.key_achievements || []
      }));
      
      const prompt = `You are an expert care professional analyzing progress data for ${client?.full_name || 'this client'}. 

TASK: Generate a comprehensive progress report that:
1. Summarizes key events and patterns from recent data
2. Identifies trends in behaviour, health, and wellbeing (improving, stable, or declining)
3. Analyzes progress against care plan objectives
4. Recommends specific interventions or care plan adjustments

RECENT BEHAVIOR DATA (last ${recentBehaviour.length} records):
${recentBehaviour.map(b => `- ${b.chart_date}: ${b.behavior_being_monitored}, Incidents: ${b.total_incidents || 0}, Triggers: ${b.triggers?.join(', ') || 'None'}, Interventions: ${b.interventions_used?.join(', ') || 'None'}, Summary: ${b.daily_summary || 'N/A'}`).join('\n')}

RECENT DAILY CARE NOTES (last ${recentNotes.length} days):
${recentNotes.map(n => `- ${n.date} (${n.shift_time}): Mood: ${n.mood_behaviour?.mood || 'N/A'}, Engagement: ${n.mood_behaviour?.engagement_level || 'N/A'}, Sleep: ${n.health_observations?.sleep_quality || 'N/A'}, Appetite: ${n.health_observations?.appetite || 'N/A'}, Activities: ${n.mobility_activities?.activities_participated?.join(', ') || 'None'}, Notes: ${n.general_notes || 'None'}`).join('\n')}

HISTORICAL PROGRESS TRENDS (last ${recentProgress.length} assessments):
${historicalTrends.map(t => `- ${t.date}: Behaviour ${t.ratings.behaviour}/10, Education ${t.ratings.education}/10, Social ${t.ratings.social}/10, Health ${t.ratings.health}/10, Independence ${t.ratings.independence}/10, Activities ${t.ratings.activities}/10`).join('\n')}
Previous Concerns: ${historicalTrends.flatMap(t => t.concerns).join('; ') || 'None'}
Previous Achievements: ${historicalTrends.flatMap(t => t.achievements).join('; ') || 'None'}

ACTIVE CARE PLAN OBJECTIVES:
${activePlan?.care_objectives?.map(o => `- ${o.objective} (Status: ${o.status || 'not_started'}, Target: ${o.target_date || 'N/A'})`).join('\n') || 'No active care plan objectives'}

CARE TASKS:
${activePlan?.care_tasks?.filter(t => t.is_active).map(t => `- ${t.task_name} (${t.frequency})`).join('\n') || 'No active tasks'}

CLIENT PROFILE:
- Care Needs: ${client.care_needs?.join(', ') || 'Not specified'}
- Mobility: ${client.mobility || 'Not specified'}
- Medical Notes: ${client.medical_notes || 'None'}

INSTRUCTIONS:
1. Analyze patterns and trends across all data sources
2. Provide objective ratings (1-10) based on evidence from the data
3. Identify specific achievements and concerning patterns
4. Suggest actionable recommendations that are specific, measurable, and achievable
5. Consider whether care plan adjustments are needed based on progress
6. Be balanced - highlight both positives and areas needing attention`;


      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            summary: {
              type: "object",
              properties: {
                key_events: { type: "array", items: { type: "string" }, description: "Significant events from the period" },
                patterns_identified: { type: "array", items: { type: "string" }, description: "Recurring patterns observed" },
                overall_assessment: { type: "string", description: "Brief overall assessment of progress" }
              }
            },
            behaviour: {
              type: "object",
              properties: {
                overall_rating: { type: "number", description: "1-10 rating" },
                trend: { type: "string", enum: ["improving", "stable", "declining"] },
                positive_behaviours: { type: "array", items: { type: "string" } },
                challenging_behaviours: { type: "array", items: { type: "string" } },
                incidents_count: { type: "number", description: "Number of incidents in period" },
                notes: { type: "string", description: "Detailed analysis with evidence from data" }
              }
            },
            education_schooling: {
              type: "object",
              properties: {
                overall_rating: { type: "number" },
                trend: { type: "string", enum: ["improving", "stable", "declining"] },
                attendance_percentage: { type: "number" },
                academic_progress: { type: "string", enum: ["above_expected", "at_expected", "below_expected", "significantly_below"] },
                engagement_level: { type: "string", enum: ["fully_engaged", "mostly_engaged", "sometimes_engaged", "rarely_engaged"] },
                subjects_excelling: { type: "array", items: { type: "string" } },
                subjects_struggling: { type: "array", items: { type: "string" } },
                notes: { type: "string" }
              }
            },
            social_emotional: {
              type: "object",
              properties: {
                overall_rating: { type: "number" },
                trend: { type: "string", enum: ["improving", "stable", "declining"] },
                peer_relationships: { type: "string", enum: ["excellent", "good", "fair", "poor"] },
                emotional_regulation: { type: "string", enum: ["excellent", "good", "developing", "needs_support"] },
                self_esteem: { type: "string", enum: ["high", "healthy", "low", "very_low"] },
                communication_skills: { type: "string", enum: ["excellent", "good", "developing", "needs_support"] },
                notes: { type: "string" }
              }
            },
            health_wellbeing: {
              type: "object",
              properties: {
                overall_rating: { type: "number" },
                trend: { type: "string", enum: ["improving", "stable", "declining"] },
                physical_health: { type: "string", enum: ["excellent", "good", "fair", "poor"] },
                mental_health: { type: "string", enum: ["excellent", "good", "fair", "poor", "requires_attention"] },
                sleep_quality: { type: "string", enum: ["good", "fair", "poor"] },
                appetite: { type: "string", enum: ["good", "fair", "poor", "variable"] },
                medication_compliance: { type: "string", enum: ["full", "mostly", "partial", "poor", "n_a"] },
                notes: { type: "string" }
              }
            },
            independence_skills: {
              type: "object",
              properties: {
                overall_rating: { type: "number" },
                trend: { type: "string", enum: ["improving", "stable", "declining"] },
                personal_care: { type: "string", enum: ["independent", "minimal_support", "moderate_support", "full_support"] },
                domestic_skills: { type: "string", enum: ["independent", "minimal_support", "moderate_support", "full_support"] },
                money_management: { type: "string", enum: ["independent", "minimal_support", "moderate_support", "full_support", "n_a"] },
                travel_independence: { type: "string", enum: ["fully_independent", "mostly_independent", "needs_support", "supervised_only"] },
                skills_developed: { type: "array", items: { type: "string" } },
                goals_achieved: { type: "array", items: { type: "string" } },
                notes: { type: "string" }
              }
            },
            activities_engagement: {
              type: "object",
              properties: {
                overall_rating: { type: "number" },
                trend: { type: "string", enum: ["improving", "stable", "declining"] },
                activities_participated: { type: "array", items: { type: "string" } },
                hobbies_interests: { type: "array", items: { type: "string" } },
                community_involvement: { type: "string", enum: ["active", "some", "minimal", "none"] },
                notes: { type: "string" }
              }
            },
            care_plan_goals: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  goal: { type: "string" },
                  progress: { type: "string", enum: ["achieved", "on_track", "partial", "not_started", "stalled"] },
                  notes: { type: "string" }
                }
              },
              description: "Progress against each care plan objective"
            },
            key_achievements: { 
              type: "array", 
              items: { type: "string" },
              description: "Specific, evidence-based achievements from the period"
            },
            concerns: { 
              type: "array", 
              items: { type: "string" },
              description: "Specific concerns with evidence and context"
            },
            recommendations: { 
              type: "array", 
              items: { 
                type: "object",
                properties: {
                  recommendation: { type: "string", description: "Specific, actionable recommendation" },
                  priority: { type: "string", enum: ["high", "medium", "low"] },
                  rationale: { type: "string", description: "Why this is needed" },
                  expected_outcome: { type: "string", description: "What improvement is expected" }
                }
              },
              description: "Actionable recommendations for care plan adjustments"
            },
            interventions_needed: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  area: { type: "string", description: "Area requiring intervention" },
                  intervention_type: { type: "string", description: "Type of intervention needed" },
                  urgency: { type: "string", enum: ["immediate", "short_term", "long_term"] },
                  details: { type: "string" }
                }
              },
              description: "Specific interventions to implement"
            },
            overall_progress: { type: "string", enum: ["significant_improvement", "improvement", "stable", "slight_decline", "significant_decline"] },
            overall_rating: { type: "number" }
          }
        }
      });

      // Pre-fill form with AI results
      setFormData(prev => ({
        ...prev,
        ...result,
        record_date: format(new Date(), 'yyyy-MM-dd'),
        record_type: 'weekly',
      }));
      setShowCreateDialog(true);
      
      // Show detailed summary toast
      const summaryMessage = result.summary?.overall_assessment || 'AI analysis complete';
      const interventionsCount = result.interventions_needed?.length || 0;
      const recommendationsCount = result.recommendations?.length || 0;
      
      toast.success(
        "AI Report Generated", 
        `${summaryMessage}. ${interventionsCount} interventions and ${recommendationsCount} recommendations identified. Review before saving.`
      );
    } catch (error) {
      console.error("AI generation error:", error);
      toast.error("Error", "Failed to generate AI report");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const [formData, setFormData] = useState({
    record_date: format(new Date(), 'yyyy-MM-dd'),
    record_type: 'weekly',
    behaviour: { overall_rating: 5, trend: 'stable', positive_behaviours: [], challenging_behaviours: [], notes: '' },
    education_schooling: { overall_rating: 5, trend: 'stable', notes: '' },
    social_emotional: { overall_rating: 5, trend: 'stable', notes: '' },
    health_wellbeing: { overall_rating: 5, trend: 'stable', notes: '' },
    independence_skills: { overall_rating: 5, trend: 'stable', skills_developed: [], notes: '' },
    activities_engagement: { overall_rating: 5, trend: 'stable', activities_participated: [], notes: '' },
    key_achievements: [],
    concerns: [],
    recommendations: [],
    overall_progress: 'stable',
    overall_rating: 5,
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      const saveData = {
        ...data,
        client_id: clientId,
        recorded_by: user.email,
      };
      if (selectedRecord) {
        return base44.entities.ClientProgressRecord.update(selectedRecord.id, saveData);
      }
      return base44.entities.ClientProgressRecord.create(saveData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-progress'] });
      toast.success("Saved", "Progress record saved successfully");
      setShowCreateDialog(false);
      setSelectedRecord(null);
      resetForm();
    },
  });

  const resetForm = () => {
    setFormData({
      record_date: format(new Date(), 'yyyy-MM-dd'),
      record_type: 'weekly',
      behaviour: { overall_rating: 5, trend: 'stable', positive_behaviours: [], challenging_behaviours: [], notes: '' },
      education_schooling: { overall_rating: 5, trend: 'stable', notes: '' },
      social_emotional: { overall_rating: 5, trend: 'stable', notes: '' },
      health_wellbeing: { overall_rating: 5, trend: 'stable', notes: '' },
      independence_skills: { overall_rating: 5, trend: 'stable', skills_developed: [], notes: '' },
      activities_engagement: { overall_rating: 5, trend: 'stable', activities_participated: [], notes: '' },
      key_achievements: [],
      concerns: [],
      recommendations: [],
      overall_progress: 'stable',
      overall_rating: 5,
    });
  };

  const exportReport = () => {
    const latest = progressRecords[0];
    if (!latest) return;
    
    const content = `
CLIENT PROGRESS REPORT
======================
Client: ${client?.full_name || 'N/A'}
Date: ${format(new Date(latest.record_date), 'MMMM d, yyyy')}
Type: ${latest.record_type}
Recorded By: ${latest.recorded_by}

OVERALL PROGRESS: ${latest.overall_progress?.replace(/_/g, ' ').toUpperCase()}
OVERALL RATING: ${latest.overall_rating}/10

AREA BREAKDOWN:
${AREAS.map(area => {
  const data = latest[area.key];
  return `
${area.label.toUpperCase()}
  Rating: ${data?.overall_rating || 'N/A'}/10
  Trend: ${data?.trend || 'N/A'}
  Notes: ${data?.notes || 'No notes'}
`;
}).join('')}

KEY ACHIEVEMENTS:
${latest.key_achievements?.map(a => `- ${a}`).join('\n') || 'None recorded'}

CONCERNS:
${latest.concerns?.map(c => `- ${c}`).join('\n') || 'None recorded'}

RECOMMENDATIONS:
${latest.recommendations?.map(r => `- ${r}`).join('\n') || 'None recorded'}
`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `progress-report-${client?.full_name?.replace(/\s+/g, '-') || 'client'}-${format(new Date(), 'yyyy-MM-dd')}.txt`;
    a.click();
  };

  const latestRecord = progressRecords[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Progress Report</h2>
          <p className="text-sm text-gray-500">Track improvements and areas needing attention</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3months">3 Months</SelectItem>
              <SelectItem value="6months">6 Months</SelectItem>
              <SelectItem value="12months">12 Months</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportReport} disabled={!latestRecord}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button 
            variant="outline" 
            onClick={generateAIReport}
            disabled={isGeneratingAI}
          >
            {isGeneratingAI ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            AI Generate
          </Button>
          <Button onClick={() => { resetForm(); setShowCreateDialog(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            New Record
          </Button>
        </div>
      </div>

      {/* Progress Summary Cards */}
      {progressSummary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <h3 className="font-semibold text-green-800">Improvements</h3>
              </div>
              {progressSummary.improvements.length > 0 ? (
                <ul className="space-y-1">
                  {progressSummary.improvements.map(item => (
                    <li key={item.key} className="text-sm text-green-700 flex items-center justify-between">
                      <span>{item.label}</span>
                      <span className="font-medium">+{item.change}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-green-600">No improvements recorded</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-5 h-5 text-red-600" />
                <h3 className="font-semibold text-red-800">Areas of Concern</h3>
              </div>
              {progressSummary.declines.length > 0 ? (
                <ul className="space-y-1">
                  {progressSummary.declines.map(item => (
                    <li key={item.key} className="text-sm text-red-700 flex items-center justify-between">
                      <span>{item.label}</span>
                      <span className="font-medium">{item.change}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-red-600">No declines recorded</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-blue-800">Overall Progress</h3>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-700">{latestRecord?.overall_rating || '-'}/10</p>
                <p className="text-sm text-blue-600 capitalize">
                  {latestRecord?.overall_progress?.replace(/_/g, ' ') || 'Not assessed'}
                </p>
                {progressSummary.overallChange !== 0 && (
                  <Badge className={progressSummary.overallChange > 0 ? "bg-green-100 text-green-800 mt-2" : "bg-red-100 text-red-800 mt-2"}>
                    {progressSummary.overallChange > 0 ? '+' : ''}{progressSummary.overallChange} from last
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      {trendData.length > 0 && (
        <div className="space-y-6">
          {/* Overall Progress Line Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Overall Progress Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 10]} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="overall" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} name="Overall Rating" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Multi-Line Chart - All Areas */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">All Areas Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 10]} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="behaviour" stroke="#8B5CF6" name="Behaviour" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="education" stroke="#3B82F6" name="Education" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="social" stroke="#EC4899" name="Social" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="health" stroke="#10B981" name="Health" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="independence" stroke="#F59E0B" name="Independence" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="activities" stroke="#6366F1" name="Activities" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Radar Chart - Current Snapshot */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Current Assessment Snapshot</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="area" tick={{ fontSize: 10 }} />
                    <PolarRadiusAxis domain={[0, 10]} />
                    <Radar name="Rating" dataKey="value" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.5} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Individual Area Charts */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Individual Area Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {AREAS.map(area => (
                  <div key={area.key} className="border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <area.icon className="w-4 h-4" style={{ color: area.color }} />
                      <span className="font-medium text-sm">{area.label}</span>
                    </div>
                    <ResponsiveContainer width="100%" height={120}>
                      <AreaChart data={trendData}>
                        <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                        <YAxis domain={[0, 10]} tick={{ fontSize: 9 }} width={20} />
                        <Tooltip />
                        <Area 
                          type="monotone" 
                          dataKey={area.key === 'education_schooling' ? 'education' : 
                                   area.key === 'social_emotional' ? 'social' : 
                                   area.key === 'health_wellbeing' ? 'health' :
                                   area.key === 'independence_skills' ? 'independence' :
                                   area.key === 'activities_engagement' ? 'activities' : 'behaviour'} 
                          stroke={area.color} 
                          fill={area.color} 
                          fillOpacity={0.3}
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Bar Chart Comparison - Latest vs Previous */}
          {progressRecords.length >= 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Latest vs Previous Assessment</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={AREAS.map(area => ({
                    name: area.label.split(' ')[0],
                    fullName: area.label,
                    latest: progressRecords[0]?.[area.key]?.overall_rating || 0,
                    previous: progressRecords[1]?.[area.key]?.overall_rating || 0,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 10]} />
                    <Tooltip 
                      formatter={(value, name) => [value, name === 'latest' ? 'Latest' : 'Previous']}
                      labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                    />
                    <Legend />
                    <Bar dataKey="previous" fill="#94A3B8" name="Previous" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="latest" fill="#3B82F6" name="Latest" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Area Breakdown */}
      {latestRecord && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Detailed Breakdown - {format(new Date(latestRecord.record_date), 'MMMM d, yyyy')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {AREAS.map(area => {
                const data = latestRecord[area.key];
                const Icon = area.icon;
                return (
                  <Card key={area.key} className="border">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-lg" style={{ backgroundColor: `${area.color}20` }}>
                            <Icon className="w-4 h-4" style={{ color: area.color }} />
                          </div>
                          <span className="font-medium text-sm">{area.label}</span>
                        </div>
                        <TrendIcon trend={data?.trend} />
                      </div>
                      <div className="flex items-center gap-3 mb-2">
                        <Progress value={(data?.overall_rating || 0) * 10} className="flex-1" />
                        <RatingBadge rating={data?.overall_rating || 0} />
                      </div>
                      {data?.notes && (
                        <p className="text-xs text-gray-600 mt-2 line-clamp-2">{data.notes}</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Key Achievements and Concerns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              {latestRecord.key_achievements?.length > 0 && (
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Key Achievements
                  </h4>
                  <ul className="space-y-1">
                    {latestRecord.key_achievements.map((a, i) => (
                      <li key={i} className="text-sm text-green-700">• {a}</li>
                    ))}
                  </ul>
                </div>
              )}
              {latestRecord.concerns?.length > 0 && (
                <div className="p-4 bg-amber-50 rounded-lg">
                  <h4 className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Concerns
                  </h4>
                  <ul className="space-y-1">
                    {latestRecord.concerns.map((c, i) => (
                      <li key={i} className="text-sm text-amber-700">• {c}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historical Records */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Progress History</CardTitle>
        </CardHeader>
        <CardContent>
          {progressRecords.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No progress records yet</p>
              <p className="text-sm">Create your first progress report to start tracking</p>
            </div>
          ) : (
            <div className="space-y-3">
              {progressRecords.slice(0, 10).map(record => (
                <div 
                  key={record.id} 
                  className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => {
                    setSelectedRecord(record);
                    setFormData(record);
                    setShowCreateDialog(true);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="font-medium">{format(new Date(record.record_date), 'MMMM d, yyyy')}</p>
                        <p className="text-sm text-gray-500 capitalize">{record.record_type} review • By {record.recorded_by}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <RatingBadge rating={record.overall_rating || 0} />
                      <Badge className={
                        record.overall_progress?.includes('improvement') ? 'bg-green-100 text-green-800' :
                        record.overall_progress?.includes('decline') ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }>
                        {record.overall_progress?.replace(/_/g, ' ') || 'Stable'}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      {showCreateDialog && (
        <ProgressRecordDialog
          isOpen={showCreateDialog}
          onClose={() => { setShowCreateDialog(false); setSelectedRecord(null); resetForm(); }}
          formData={formData}
          setFormData={setFormData}
          onSave={() => saveMutation.mutate(formData)}
          isSaving={saveMutation.isPending}
          isEditing={!!selectedRecord}
        />
      )}
    </div>
  );
}

function ProgressRecordDialog({ isOpen, onClose, formData, setFormData, onSave, isSaving, isEditing }) {
  const [activeTab, setActiveTab] = useState("behaviour");
  const [newAchievement, setNewAchievement] = useState("");
  const [newConcern, setNewConcern] = useState("");
  const [newRecommendation, setNewRecommendation] = useState("");

  const updateArea = (area, field, value) => {
    setFormData({
      ...formData,
      [area]: { ...formData[area], [field]: value }
    });
  };

  const addToArray = (field, value, setter) => {
    if (!value.trim()) return;
    setFormData({
      ...formData,
      [field]: [...(formData[field] || []), value.trim()]
    });
    setter("");
  };

  const removeFromArray = (field, index) => {
    setFormData({
      ...formData,
      [field]: formData[field].filter((_, i) => i !== index)
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Progress Record" : "New Progress Record"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Record Date</Label>
              <Input 
                type="date" 
                value={formData.record_date} 
                onChange={(e) => setFormData({...formData, record_date: e.target.value})}
              />
            </div>
            <div>
              <Label>Record Type</Label>
              <Select value={formData.record_type} onValueChange={(v) => setFormData({...formData, record_type: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="ad_hoc">Ad Hoc</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Area Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-6 w-full">
              {AREAS.map(area => (
                <TabsTrigger key={area.key} value={area.key} className="text-xs">
                  <area.icon className="w-3 h-3 mr-1" />
                  {area.label.split(' ')[0]}
                </TabsTrigger>
              ))}
            </TabsList>

            {AREAS.map(area => (
              <TabsContent key={area.key} value={area.key} className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Rating (1-10)</Label>
                    <Input 
                      type="number" 
                      min="1" 
                      max="10"
                      value={formData[area.key]?.overall_rating || 5}
                      onChange={(e) => updateArea(area.key, 'overall_rating', parseInt(e.target.value) || 5)}
                    />
                  </div>
                  <div>
                    <Label>Trend</Label>
                    <Select 
                      value={formData[area.key]?.trend || 'stable'} 
                      onValueChange={(v) => updateArea(area.key, 'trend', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="improving">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-green-600" />
                            Improving
                          </div>
                        </SelectItem>
                        <SelectItem value="stable">
                          <div className="flex items-center gap-2">
                            <Minus className="w-4 h-4 text-gray-400" />
                            Stable
                          </div>
                        </SelectItem>
                        <SelectItem value="declining">
                          <div className="flex items-center gap-2">
                            <TrendingDown className="w-4 h-4 text-red-600" />
                            Declining
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Area-specific fields */}
                {area.key === 'education_schooling' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Attendance %</Label>
                      <Input 
                        type="number"
                        value={formData.education_schooling?.attendance_percentage || ''}
                        onChange={(e) => updateArea('education_schooling', 'attendance_percentage', parseInt(e.target.value))}
                        placeholder="e.g., 95"
                      />
                    </div>
                    <div>
                      <Label>Academic Progress</Label>
                      <Select 
                        value={formData.education_schooling?.academic_progress || ''} 
                        onValueChange={(v) => updateArea('education_schooling', 'academic_progress', v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="above_expected">Above Expected</SelectItem>
                          <SelectItem value="at_expected">At Expected</SelectItem>
                          <SelectItem value="below_expected">Below Expected</SelectItem>
                          <SelectItem value="significantly_below">Significantly Below</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {area.key === 'social_emotional' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Peer Relationships</Label>
                      <Select 
                        value={formData.social_emotional?.peer_relationships || ''} 
                        onValueChange={(v) => updateArea('social_emotional', 'peer_relationships', v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="excellent">Excellent</SelectItem>
                          <SelectItem value="good">Good</SelectItem>
                          <SelectItem value="fair">Fair</SelectItem>
                          <SelectItem value="poor">Poor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Emotional Regulation</Label>
                      <Select 
                        value={formData.social_emotional?.emotional_regulation || ''} 
                        onValueChange={(v) => updateArea('social_emotional', 'emotional_regulation', v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="excellent">Excellent</SelectItem>
                          <SelectItem value="good">Good</SelectItem>
                          <SelectItem value="developing">Developing</SelectItem>
                          <SelectItem value="needs_support">Needs Support</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                <div>
                  <Label>Notes</Label>
                  <Textarea 
                    value={formData[area.key]?.notes || ''}
                    onChange={(e) => updateArea(area.key, 'notes', e.target.value)}
                    placeholder={`Notes about ${area.label.toLowerCase()}...`}
                    className="h-24"
                  />
                </div>
              </TabsContent>
            ))}
          </Tabs>

          {/* Key Achievements */}
          <div>
            <Label>Key Achievements</Label>
            <div className="flex gap-2 mt-1">
              <Input 
                value={newAchievement}
                onChange={(e) => setNewAchievement(e.target.value)}
                placeholder="Add achievement..."
                onKeyPress={(e) => e.key === 'Enter' && addToArray('key_achievements', newAchievement, setNewAchievement)}
              />
              <Button type="button" onClick={() => addToArray('key_achievements', newAchievement, setNewAchievement)}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.key_achievements?.map((a, i) => (
                <Badge key={i} variant="outline" className="bg-green-50">
                  {a}
                  <button onClick={() => removeFromArray('key_achievements', i)} className="ml-1 text-red-500">×</button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Concerns */}
          <div>
           <Label>Concerns</Label>
           <div className="flex gap-2 mt-1">
             <Input 
               value={newConcern}
               onChange={(e) => setNewConcern(e.target.value)}
               placeholder="Add concern..."
               onKeyPress={(e) => e.key === 'Enter' && addToArray('concerns', newConcern, setNewConcern)}
             />
             <Button type="button" onClick={() => addToArray('concerns', newConcern, setNewConcern)}>
               <Plus className="w-4 h-4" />
             </Button>
           </div>
           <div className="flex flex-wrap gap-2 mt-2">
             {formData.concerns?.map((c, i) => (
               <Badge key={i} variant="outline" className="bg-amber-50">
                 {c}
                 <button onClick={() => removeFromArray('concerns', i)} className="ml-1 text-red-500">×</button>
               </Badge>
             ))}
           </div>
          </div>

          {/* Recommendations */}
          <div>
           <Label>Recommendations & Care Plan Adjustments</Label>
           <div className="flex gap-2 mt-1">
             <Input 
               value={newRecommendation}
               onChange={(e) => setNewRecommendation(e.target.value)}
               placeholder="Add recommendation..."
               onKeyPress={(e) => e.key === 'Enter' && addToArray('recommendations', newRecommendation, setNewRecommendation)}
             />
             <Button type="button" onClick={() => addToArray('recommendations', newRecommendation, setNewRecommendation)}>
               <Plus className="w-4 h-4" />
             </Button>
           </div>
           <div className="space-y-2 mt-2">
             {formData.recommendations?.map((r, i) => (
               <div key={i} className="p-2 border rounded bg-blue-50 flex items-start justify-between">
                 <div className="flex-1">
                   {typeof r === 'object' ? (
                     <>
                       <p className="text-sm font-medium">{r.recommendation}</p>
                       <div className="flex gap-2 mt-1">
                         <Badge className={
                           r.priority === 'high' ? 'bg-red-100 text-red-800' :
                           r.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                           'bg-green-100 text-green-800'
                         }>{r.priority}</Badge>
                         {r.rationale && <span className="text-xs text-gray-600">{r.rationale}</span>}
                       </div>
                     </>
                   ) : (
                     <p className="text-sm">{r}</p>
                   )}
                 </div>
                 <button onClick={() => removeFromArray('recommendations', i)} className="text-red-500 ml-2">×</button>
               </div>
             ))}
           </div>
          </div>

          {/* Overall */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Overall Rating (1-10)</Label>
              <Input 
                type="number" 
                min="1" 
                max="10"
                value={formData.overall_rating || 5}
                onChange={(e) => setFormData({...formData, overall_rating: parseInt(e.target.value) || 5})}
              />
            </div>
            <div>
              <Label>Overall Progress</Label>
              <Select value={formData.overall_progress || 'stable'} onValueChange={(v) => setFormData({...formData, overall_progress: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="significant_improvement">Significant Improvement</SelectItem>
                  <SelectItem value="improvement">Improvement</SelectItem>
                  <SelectItem value="stable">Stable</SelectItem>
                  <SelectItem value="slight_decline">Slight Decline</SelectItem>
                  <SelectItem value="significant_decline">Significant Decline</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={onSave} disabled={isSaving}>
            {isSaving ? "Saving..." : (isEditing ? "Update" : "Save")} Record
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}