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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";

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
      // Gather context from recent data
      const recentBehaviour = behaviourCharts.slice(0, 10);
      const recentNotes = dailyNotes.slice(0, 20);
      const activePlan = carePlans[0];
      
      const prompt = `Based on the following care data for ${client?.full_name || 'this client'}, generate a comprehensive progress report.

Recent Behaviour Charts (last ${recentBehaviour.length} records):
${recentBehaviour.map(b => `- Date: ${b.chart_date}, Behavior: ${b.behavior_being_monitored}, Incidents: ${b.total_incidents || 0}, Summary: ${b.daily_summary || 'N/A'}`).join('\n')}

Recent Daily Care Notes (last ${recentNotes.length} records):
${recentNotes.map(n => `- Date: ${n.date}, Shift: ${n.shift_time}, Mood: ${n.mood_behaviour?.mood || 'N/A'}, Wellbeing: ${n.overall_wellbeing || 'N/A'}, Activities: ${n.mobility_activities?.activities_participated?.join(', ') || 'None'}`).join('\n')}

Active Care Plan Goals:
${activePlan?.care_objectives?.map(o => `- ${o.objective} (Status: ${o.status})`).join('\n') || 'No active goals'}

Generate a progress assessment with ratings (1-10) and trends for each area. Be objective and balanced.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            behaviour: {
              type: "object",
              properties: {
                overall_rating: { type: "number" },
                trend: { type: "string" },
                positive_behaviours: { type: "array", items: { type: "string" } },
                challenging_behaviours: { type: "array", items: { type: "string" } },
                notes: { type: "string" }
              }
            },
            education_schooling: {
              type: "object",
              properties: {
                overall_rating: { type: "number" },
                trend: { type: "string" },
                notes: { type: "string" }
              }
            },
            social_emotional: {
              type: "object",
              properties: {
                overall_rating: { type: "number" },
                trend: { type: "string" },
                notes: { type: "string" }
              }
            },
            health_wellbeing: {
              type: "object",
              properties: {
                overall_rating: { type: "number" },
                trend: { type: "string" },
                notes: { type: "string" }
              }
            },
            independence_skills: {
              type: "object",
              properties: {
                overall_rating: { type: "number" },
                trend: { type: "string" },
                skills_developed: { type: "array", items: { type: "string" } },
                notes: { type: "string" }
              }
            },
            activities_engagement: {
              type: "object",
              properties: {
                overall_rating: { type: "number" },
                trend: { type: "string" },
                notes: { type: "string" }
              }
            },
            key_achievements: { type: "array", items: { type: "string" } },
            concerns: { type: "array", items: { type: "string" } },
            recommendations: { type: "array", items: { type: "string" } },
            overall_progress: { type: "string" },
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
      toast.success("AI Report Generated", "Review and adjust the generated report before saving.");
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
      {trendData.length > 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Line Chart - Trends Over Time */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Progress Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 10]} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="behaviour" stroke="#8B5CF6" name="Behaviour" />
                  <Line type="monotone" dataKey="education" stroke="#3B82F6" name="Education" />
                  <Line type="monotone" dataKey="social" stroke="#EC4899" name="Social" />
                  <Line type="monotone" dataKey="health" stroke="#10B981" name="Health" />
                  <Line type="monotone" dataKey="overall" stroke="#000" strokeWidth={2} name="Overall" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Radar Chart - Current Snapshot */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Current Assessment</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="area" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis domain={[0, 10]} />
                  <Radar name="Rating" dataKey="value" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.5} />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
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