import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  MessageSquare,
  Star,
  Filter,
  TrendingUp,
  ThumbsUp,
  AlertTriangle,
  CheckCircle,
  Download,
  Eye
} from "lucide-react";
import { format, parseISO } from "date-fns";

import ClientFeedbackForm from "../components/feedback/ClientFeedbackForm";

export default function ClientFeedback() {
  const [activeTab, setActiveTab] = useState("all");
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [responseText, setResponseText] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterRating, setFilterRating] = useState("all");

  const queryClient = useQueryClient();

  const { data: feedback = [], isLoading } = useQuery({
    queryKey: ['client-feedback'],
    queryFn: () => base44.entities.ClientFeedback.list('-created_date'),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: () => base44.entities.Staff.list(),
  });

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const updateFeedbackMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ClientFeedback.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-feedback'] });
      setSelectedFeedback(null);
      setResponseText("");
    },
  });

  const handleAcknowledge = (feedbackItem) => {
    const staffMember = staff.find(s => s.email === currentUser?.email);
    updateFeedbackMutation.mutate({
      id: feedbackItem.id,
      data: {
        ...feedbackItem,
        status: "acknowledged",
        acknowledged_by_staff_id: staffMember?.id || currentUser?.id,
        acknowledged_date: new Date().toISOString(),
      }
    });
  };

  const handleRespond = (feedbackItem) => {
    if (!responseText.trim()) return;

    const staffMember = staff.find(s => s.email === currentUser?.email);
    updateFeedbackMutation.mutate({
      id: feedbackItem.id,
      data: {
        ...feedbackItem,
        status: "resolved",
        response: responseText,
        response_date: new Date().toISOString(),
        assigned_to_staff_id: staffMember?.id || currentUser?.id,
      }
    });
  };

  const handleStatusChange = (feedbackItem, newStatus) => {
    updateFeedbackMutation.mutate({
      id: feedbackItem.id,
      data: { ...feedbackItem, status: newStatus }
    });
  };

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client?.full_name || "Unknown Client";
  };

  const getStaffName = (staffId) => {
    const staffMember = staff.find(s => s.id === staffId);
    return staffMember?.full_name || "Unknown Staff";
  };

  const filteredFeedback = feedback.filter(item => {
    const matchesTab = activeTab === "all" || item.status === activeTab;
    const matchesType = filterType === "all" || item.feedback_type === filterType;
    const matchesRating = filterRating === "all" || item.rating === parseInt(filterRating);
    return matchesTab && matchesType && matchesRating;
  });

  const stats = {
    total: feedback.length,
    new: feedback.filter(f => f.status === 'new').length,
    compliments: feedback.filter(f => f.feedback_type === 'compliment').length,
    complaints: feedback.filter(f => f.feedback_type === 'complaint').length,
    avgRating: feedback.length > 0
      ? (feedback.reduce((sum, f) => sum + (f.rating || 0), 0) / feedback.length).toFixed(1)
      : "N/A",
  };

  const typeColors = {
    compliment: "bg-green-100 text-green-800",
    complaint: "bg-red-100 text-red-800",
    suggestion: "bg-blue-100 text-blue-800",
    concern: "bg-orange-100 text-orange-800",
    general: "bg-gray-100 text-gray-800",
  };

  const statusColors = {
    new: "bg-yellow-100 text-yellow-800",
    acknowledged: "bg-blue-100 text-blue-800",
    in_progress: "bg-purple-100 text-purple-800",
    resolved: "bg-green-100 text-green-800",
    closed: "bg-gray-100 text-gray-800",
  };

  const exportToCSV = () => {
    const headers = ["Date", "Client", "Type", "Rating", "Subject", "Status", "Response"];
    const rows = filteredFeedback.map(item => [
      format(parseISO(item.created_date), "yyyy-MM-dd"),
      getClientName(item.client_id),
      item.feedback_type,
      item.rating || "N/A",
      item.subject,
      item.status,
      item.response ? "Yes" : "No"
    ]);

    const csvContent = [
      "Client Feedback Report",
      `Generated: ${format(new Date(), "yyyy-MM-dd HH:mm")}`,
      "",
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `client-feedback-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Client Feedback</h1>
            <p className="text-gray-500">Manage and respond to client feedback</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={exportToCSV} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button
              onClick={() => setShowSubmitForm(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Submit Feedback
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="w-4 h-4 text-blue-600" />
                <p className="text-sm text-gray-600">Total</p>
              </div>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-orange-600" />
                <p className="text-sm text-gray-600">New</p>
              </div>
              <p className="text-2xl font-bold text-orange-600">{stats.new}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <ThumbsUp className="w-4 h-4 text-green-600" />
                <p className="text-sm text-gray-600">Compliments</p>
              </div>
              <p className="text-2xl font-bold text-green-600">{stats.compliments}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Star className="w-4 h-4 text-yellow-600" />
                <p className="text-sm text-gray-600">Avg Rating</p>
              </div>
              <p className="text-2xl font-bold text-yellow-600">{stats.avgRating}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex gap-2 md:col-span-2">
                <Button
                  variant={activeTab === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveTab("all")}
                >
                  All
                </Button>
                <Button
                  variant={activeTab === "new" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveTab("new")}
                >
                  New
                </Button>
                <Button
                  variant={activeTab === "acknowledged" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveTab("acknowledged")}
                >
                  Acknowledged
                </Button>
                <Button
                  variant={activeTab === "resolved" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveTab("resolved")}
                >
                  Resolved
                </Button>
              </div>

              <div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="compliment">Compliments</SelectItem>
                    <SelectItem value="complaint">Complaints</SelectItem>
                    <SelectItem value="suggestion">Suggestions</SelectItem>
                    <SelectItem value="concern">Concerns</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Select value={filterRating} onValueChange={setFilterRating}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by rating" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Ratings</SelectItem>
                    <SelectItem value="5">5 Stars</SelectItem>
                    <SelectItem value="4">4 Stars</SelectItem>
                    <SelectItem value="3">3 Stars</SelectItem>
                    <SelectItem value="2">2 Stars</SelectItem>
                    <SelectItem value="1">1 Star</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Feedback List */}
        <div className="space-y-4">
          {filteredFeedback.map((item) => (
            <Card
              key={item.id}
              className={`border-l-4 ${
                item.feedback_type === 'complaint' ? 'border-red-500' :
                item.feedback_type === 'compliment' ? 'border-green-500' :
                'border-blue-500'
              }`}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h3 className="font-semibold text-lg">{item.subject}</h3>
                      <Badge className={typeColors[item.feedback_type]}>
                        {item.feedback_type}
                      </Badge>
                      <Badge className={statusColors[item.status]}>
                        {item.status}
                      </Badge>
                      {item.category && (
                        <Badge variant="outline" className="text-xs capitalize">
                          {item.category.replace('_', ' ')}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                      <span>From: <strong>{item.is_anonymous ? "Anonymous" : item.submitted_by}</strong></span>
                      {item.client_id && (
                        <span>Client: <strong>{getClientName(item.client_id)}</strong></span>
                      )}
                      <span>{format(parseISO(item.created_date), "MMM d, yyyy 'at' HH:mm")}</span>
                    </div>

                    {item.rating && (
                      <div className="flex items-center gap-1 mb-3">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${
                              star <= item.rating
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                        <span className="ml-2 text-sm text-gray-600">
                          {item.rating}/5
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg mb-4">
                  <p className="text-gray-700 whitespace-pre-wrap">{item.comments}</p>
                </div>

                {item.wants_callback && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded mb-4">
                    <p className="text-sm text-blue-900">
                      <strong>Contact requested:</strong>
                      {item.contact_email && ` Email: ${item.contact_email}`}
                      {item.contact_phone && ` Phone: ${item.contact_phone}`}
                    </p>
                  </div>
                )}

                {item.response && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <p className="font-medium text-green-900">Response</p>
                      <span className="text-xs text-green-700">
                        ({format(parseISO(item.response_date), "MMM d, yyyy")})
                      </span>
                    </div>
                    <p className="text-sm text-green-800">{item.response}</p>
                  </div>
                )}

                <div className="flex gap-2 flex-wrap">
                  {item.status === 'new' && (
                    <Button
                      size="sm"
                      onClick={() => handleAcknowledge(item)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Acknowledge
                    </Button>
                  )}

                  {(item.status === 'new' || item.status === 'acknowledged') && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedFeedback(item)}
                    >
                      Respond
                    </Button>
                  )}

                  {item.status === 'resolved' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusChange(item, 'closed')}
                    >
                      Close
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => window.open(`mailto:${item.contact_email}`, '_blank')}
                    disabled={!item.contact_email}
                  >
                    Email Client
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredFeedback.length === 0 && !isLoading && (
            <Card>
              <CardContent className="p-12 text-center">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No feedback found</h3>
                <p className="text-gray-500">No feedback matches the selected filters</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Response Modal */}
        {selectedFeedback && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl">
              <CardHeader className="border-b">
                <CardTitle>Respond to Feedback</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="mb-4 p-4 bg-gray-50 rounded">
                  <p className="font-medium mb-1">{selectedFeedback.subject}</p>
                  <p className="text-sm text-gray-600">{selectedFeedback.comments}</p>
                </div>

                <div className="mb-4">
                  <Label htmlFor="response">Your Response *</Label>
                  <Textarea
                    id="response"
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    placeholder="Type your response here..."
                    rows={6}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => handleRespond(selectedFeedback)}
                    disabled={!responseText.trim() || updateFeedbackMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {updateFeedbackMutation.isPending ? "Sending..." : "Send Response"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedFeedback(null);
                      setResponseText("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Submit Form Modal */}
        {showSubmitForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="py-8">
              <ClientFeedbackForm
                client={null}
                onClose={() => setShowSubmitForm(false)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}