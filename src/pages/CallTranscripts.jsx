import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Phone, 
  Upload, 
  Search, 
  Calendar,
  User,
  FileText,
  CheckCircle,
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Trash2,
  ExternalLink
} from "lucide-react";
import { format } from "date-fns";
import CallTranscriptionUploader from "@/components/calls/CallTranscriptionUploader";

export default function CallTranscripts() {
  const [showUploader, setShowUploader] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");

  const queryClient = useQueryClient();

  const { data: transcripts = [], isLoading } = useQuery({
    queryKey: ['call-transcripts'],
    queryFn: () => base44.entities.CallTranscript.list('-call_date', 100)
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients-for-calls'],
    queryFn: () => base44.entities.Client.filter({ status: 'active' })
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CallTranscript.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['call-transcripts'] })
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CallTranscript.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['call-transcripts'] })
  });

  const toggleFollowUpComplete = (transcript, pointIndex) => {
    const updatedPoints = [...(transcript.follow_up_points || [])];
    updatedPoints[pointIndex] = {
      ...updatedPoints[pointIndex],
      completed: !updatedPoints[pointIndex].completed
    };
    updateMutation.mutate({ 
      id: transcript.id, 
      data: { follow_up_points: updatedPoints }
    });
  };

  const markAsReviewed = (transcript) => {
    updateMutation.mutate({ 
      id: transcript.id, 
      data: { status: 'reviewed' }
    });
  };

  const filteredTranscripts = transcripts.filter(t => {
    const matchesSearch = !searchQuery || 
      t.caller_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.summary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.transcript?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getClientName = (clientId) => {
    return clients.find(c => c.id === clientId)?.full_name || '';
  };

  const getSentimentBadge = (sentiment) => {
    const config = {
      positive: { bg: "bg-green-100 text-green-700", label: "Positive" },
      neutral: { bg: "bg-gray-100 text-gray-700", label: "Neutral" },
      concerned: { bg: "bg-amber-100 text-amber-700", label: "Concerned" },
      urgent: { bg: "bg-red-100 text-red-700", label: "Urgent" },
      complaint: { bg: "bg-red-100 text-red-700", label: "Complaint" }
    };
    const c = config[sentiment] || config.neutral;
    return <Badge className={c.bg}>{c.label}</Badge>;
  };

  const getStatusBadge = (status) => {
    const config = {
      pending_transcription: { bg: "bg-yellow-100 text-yellow-700", label: "Pending" },
      transcribed: { bg: "bg-blue-100 text-blue-700", label: "Transcribed" },
      reviewed: { bg: "bg-green-100 text-green-700", label: "Reviewed" },
      actioned: { bg: "bg-purple-100 text-purple-700", label: "Actioned" },
      archived: { bg: "bg-gray-100 text-gray-700", label: "Archived" }
    };
    const c = config[status] || config.transcribed;
    return <Badge className={c.bg}>{c.label}</Badge>;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: "text-gray-500",
      medium: "text-blue-500",
      high: "text-orange-500",
      urgent: "text-red-500"
    };
    return colors[priority] || colors.medium;
  };

  // Stats
  const stats = {
    total: transcripts.length,
    needsReview: transcripts.filter(t => t.status === 'transcribed').length,
    pendingActions: transcripts.reduce((sum, t) => 
      sum + (t.follow_up_points?.filter(fp => !fp.completed)?.length || 0), 0
    ),
    urgentCalls: transcripts.filter(t => 
      t.sentiment === 'urgent' || t.sentiment === 'complaint'
    ).length
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Call Transcripts</h1>
          <p className="text-gray-500">VOIP call recordings, transcriptions, and follow-ups</p>
        </div>
        <Button onClick={() => setShowUploader(true)} className="bg-blue-600 hover:bg-blue-700">
          <Upload className="w-4 h-4 mr-2" />
          Upload Call Recording
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <Phone className="w-8 h-8 mx-auto mb-2 text-blue-600" />
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-gray-500">Total Calls</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <FileText className="w-8 h-8 mx-auto mb-2 text-amber-600" />
            <p className="text-2xl font-bold">{stats.needsReview}</p>
            <p className="text-sm text-gray-500">Needs Review</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="w-8 h-8 mx-auto mb-2 text-purple-600" />
            <p className="text-2xl font-bold">{stats.pendingActions}</p>
            <p className="text-sm text-gray-500">Pending Actions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-600" />
            <p className="text-2xl font-bold">{stats.urgentCalls}</p>
            <p className="text-sm text-gray-500">Urgent/Complaints</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search calls..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="transcribed">Needs Review</TabsTrigger>
            <TabsTrigger value="reviewed">Reviewed</TabsTrigger>
            <TabsTrigger value="actioned">Actioned</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Call List */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading calls...</div>
      ) : filteredTranscripts.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Phone className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No Call Recordings</h3>
            <p className="text-gray-500 mb-4">Upload your first call recording to get started</p>
            <Button onClick={() => setShowUploader(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Upload Recording
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredTranscripts.map(transcript => {
            const isExpanded = expandedId === transcript.id;
            const pendingActions = transcript.follow_up_points?.filter(fp => !fp.completed)?.length || 0;

            return (
              <Card key={transcript.id} className="overflow-hidden">
                <div 
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : transcript.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <Phone className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">
                            {transcript.caller_name || 'Unknown Caller'}
                          </h3>
                          {getSentimentBadge(transcript.sentiment)}
                          {getStatusBadge(transcript.status)}
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {transcript.summary}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(transcript.call_date), 'MMM d, yyyy HH:mm')}
                          </span>
                          {transcript.related_client_id && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {getClientName(transcript.related_client_id)}
                            </span>
                          )}
                          {transcript.caller_relationship && (
                            <Badge variant="outline" className="text-xs">
                              {transcript.caller_relationship.replace('_', ' ')}
                            </Badge>
                          )}
                          {pendingActions > 0 && (
                            <Badge className="bg-orange-100 text-orange-700">
                              {pendingActions} pending action{pendingActions > 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t p-4 bg-gray-50 space-y-4">
                    {/* Key Topics */}
                    {transcript.key_topics?.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2">Key Topics</h4>
                        <div className="flex flex-wrap gap-2">
                          {transcript.key_topics.map((topic, idx) => (
                            <Badge key={idx} variant="outline">{topic}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Follow-up Actions */}
                    {transcript.follow_up_points?.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2">Follow-up Actions</h4>
                        <div className="space-y-2">
                          {transcript.follow_up_points.map((fp, idx) => (
                            <div 
                              key={idx} 
                              className={`flex items-start gap-3 p-2 rounded ${
                                fp.completed ? 'bg-green-50' : 'bg-white border'
                              }`}
                            >
                              <Checkbox
                                checked={fp.completed}
                                onCheckedChange={() => toggleFollowUpComplete(transcript, idx)}
                              />
                              <div className="flex-1">
                                <p className={`text-sm ${fp.completed ? 'line-through text-gray-500' : ''}`}>
                                  {fp.point}
                                </p>
                                {fp.due_date && (
                                  <p className="text-xs text-gray-500">Due: {fp.due_date}</p>
                                )}
                              </div>
                              <Badge variant="outline" className={getPriorityColor(fp.priority)}>
                                {fp.priority}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Full Transcript */}
                    <details className="group">
                      <summary className="cursor-pointer text-sm font-semibold text-gray-600 hover:text-gray-900">
                        View Full Transcript
                      </summary>
                      <div className="mt-2 p-3 bg-white border rounded text-sm whitespace-pre-wrap max-h-64 overflow-y-auto">
                        {transcript.transcript}
                      </div>
                    </details>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2 border-t">
                      {transcript.audio_file_url && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open(transcript.audio_file_url, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          Play Audio
                        </Button>
                      )}
                      {transcript.status === 'transcribed' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => markAsReviewed(transcript)}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Mark Reviewed
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 ml-auto"
                        onClick={() => {
                          if (confirm('Delete this call transcript?')) {
                            deleteMutation.mutate(transcript.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {showUploader && (
        <CallTranscriptionUploader
          clients={clients}
          onClose={() => setShowUploader(false)}
          onSuccess={() => setShowUploader(false)}
        />
      )}
    </div>
  );
}