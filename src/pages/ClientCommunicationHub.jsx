import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  MessageSquare,
  Send,
  Sparkles,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  User,
  Users,
  Filter,
  Search,
  Plus,
  Loader2,
  ArrowUp,
  ArrowDown,
  CalendarPlus,
  Bot,
  X,
  ChevronRight
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { format, parseISO, isToday, isYesterday, differenceInHours } from "date-fns";

export default function ClientCommunicationHub() {
  const [selectedClient, setSelectedClient] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [newMessage, setNewMessage] = useState("");
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list()
  });

  const { data: messages = [], isLoading: loadingMessages } = useQuery({
    queryKey: ['client-messages'],
    queryFn: () => base44.entities.ClientMessage.list('-created_date')
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: () => base44.entities.Staff.list()
  });

  const { data: carers = [] } = useQuery({
    queryKey: ['carers'],
    queryFn: () => base44.entities.Carer.list()
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => base44.entities.Shift.list()
  });

  const allStaff = [...staff, ...carers];

  const sendMessageMutation = useMutation({
    mutationFn: (data) => base44.entities.ClientMessage.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-messages'] });
      setNewMessage("");
      toast.success("Message Sent", "Your message has been delivered");
    }
  });

  const updateMessageMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ClientMessage.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-messages'] });
    }
  });

  const createShiftMutation = useMutation({
    mutationFn: (data) => base44.entities.Shift.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      toast.success("Appointment Scheduled", "The booking has been confirmed");
      setShowBookingForm(false);
    }
  });

  // AI Message Categorization
  const analyzeMessage = async (messageContent) => {
    setIsAnalyzing(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this message from a care client and categorize it:

Message: "${messageContent}"

Determine:
1. Category: general_query, visit_change, complaint, feedback, emergency, appointment_request, service_request, other
2. Priority: low, normal, high, urgent
3. Suggested response (brief, professional)
4. If it's an appointment/service request, extract: preferred_date, preferred_time, service_type
5. Best staff type to handle this (carer, manager, nurse, admin)`,
        response_json_schema: {
          type: "object",
          properties: {
            category: { type: "string" },
            priority: { type: "string" },
            suggested_response: { type: "string" },
            is_booking_request: { type: "boolean" },
            booking_details: {
              type: "object",
              properties: {
                preferred_date: { type: "string" },
                preferred_time: { type: "string" },
                service_type: { type: "string" }
              }
            },
            best_handler: { type: "string" },
            key_concerns: { type: "array", items: { type: "string" } }
          }
        }
      });
      setAiSuggestion(result);
      return result;
    } catch (error) {
      console.error("AI analysis error:", error);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedClient) return;

    // Analyze message with AI
    const analysis = await analyzeMessage(newMessage);

    const messageData = {
      client_id: selectedClient.id,
      sender_type: "staff",
      sender_id: "system",
      message_content: newMessage,
      category: analysis?.category || "general_query",
      priority: analysis?.priority || "normal",
      status: "new"
    };

    sendMessageMutation.mutate(messageData);
  };

  const handleQuickReply = (suggestion) => {
    if (!selectedClient) return;
    
    sendMessageMutation.mutate({
      client_id: selectedClient.id,
      sender_type: "staff",
      sender_id: "system",
      message_content: suggestion,
      category: "general_query",
      priority: "normal",
      status: "responded"
    });
    setAiSuggestion(null);
  };

  // Get messages grouped by client with stats
  const clientMessageStats = clients.map(client => {
    const clientMsgs = messages.filter(m => m.client_id === client.id);
    const unread = clientMsgs.filter(m => !m.is_read && m.sender_type === "client").length;
    const urgent = clientMsgs.filter(m => m.priority === "urgent" || m.priority === "high").length;
    const lastMessage = clientMsgs[0];
    
    return {
      ...client,
      messageCount: clientMsgs.length,
      unreadCount: unread,
      urgentCount: urgent,
      lastMessage
    };
  }).filter(c => c.messageCount > 0 || c.status === 'active');

  // Filter clients
  const filteredClients = clientMessageStats.filter(client => {
    const matchesSearch = client.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  }).sort((a, b) => {
    // Sort by urgent first, then unread, then recent
    if (a.urgentCount !== b.urgentCount) return b.urgentCount - a.urgentCount;
    if (a.unreadCount !== b.unreadCount) return b.unreadCount - a.unreadCount;
    return 0;
  });

  // Get messages for selected client
  const clientMessages = selectedClient 
    ? messages.filter(m => m.client_id === selectedClient.id)
    : [];

  // Filter messages
  const filteredMessages = clientMessages.filter(m => {
    if (filterPriority !== "all" && m.priority !== filterPriority) return false;
    if (filterCategory !== "all" && m.category !== filterCategory) return false;
    return true;
  });

  // Get assigned carers for client
  const getClientCarers = (clientId) => {
    const clientShifts = shifts.filter(s => s.client_id === clientId && s.carer_id);
    const carerIds = [...new Set(clientShifts.map(s => s.carer_id))];
    return allStaff.filter(s => carerIds.includes(s.id));
  };

  const formatMessageDate = (date) => {
    const parsed = parseISO(date);
    if (isToday(parsed)) return format(parsed, "'Today' h:mm a");
    if (isYesterday(parsed)) return format(parsed, "'Yesterday' h:mm a");
    return format(parsed, "MMM d, h:mm a");
  };

  const priorityColors = {
    low: "bg-gray-100 text-gray-700",
    normal: "bg-blue-100 text-blue-700",
    high: "bg-orange-100 text-orange-700",
    urgent: "bg-red-100 text-red-700"
  };

  const categoryIcons = {
    general_query: MessageSquare,
    visit_change: Calendar,
    complaint: AlertTriangle,
    feedback: CheckCircle,
    emergency: AlertTriangle,
    appointment_request: CalendarPlus,
    service_request: Users,
    other: MessageSquare
  };

  return (
    <div className="h-[calc(100vh-120px)] flex bg-gray-50">
      {/* Client List Sidebar */}
      <div className="w-80 bg-white border-r flex flex-col">
        <div className="p-4 border-b">
          <h2 className="font-bold text-lg mb-3">Client Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredClients.map(client => (
            <div
              key={client.id}
              onClick={() => setSelectedClient(client)}
              className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                selectedClient?.id === client.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {client.full_name?.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium">{client.full_name}</p>
                    <p className="text-xs text-gray-500 truncate max-w-[150px]">
                      {client.lastMessage?.message_content?.substring(0, 30) || "No messages"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {client.unreadCount > 0 && (
                    <Badge className="bg-blue-600">{client.unreadCount}</Badge>
                  )}
                  {client.urgentCount > 0 && (
                    <Badge className="bg-red-600">{client.urgentCount} urgent</Badge>
                  )}
                </div>
              </div>
            </div>
          ))}

          {filteredClients.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No clients found</p>
            </div>
          )}
        </div>
      </div>

      {/* Message Thread */}
      <div className="flex-1 flex flex-col">
        {selectedClient ? (
          <>
            {/* Client Header */}
            <div className="p-4 bg-white border-b flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {selectedClient.full_name?.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-lg">{selectedClient.full_name}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>Assigned carers:</span>
                    {getClientCarers(selectedClient.id).slice(0, 3).map(c => (
                      <Badge key={c.id} variant="outline" className="text-xs">
                        {c.full_name?.split(' ')[0]}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBookingForm(true)}
                >
                  <CalendarPlus className="w-4 h-4 mr-1" />
                  Book Appointment
                </Button>
                <Select value={filterPriority} onValueChange={setFilterPriority}>
                  <SelectTrigger className="w-32">
                    <Filter className="w-4 h-4 mr-1" />
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {filteredMessages.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No messages yet</p>
                  <p className="text-sm">Start a conversation with this client</p>
                </div>
              ) : (
                filteredMessages.slice().reverse().map(message => {
                  const isStaff = message.sender_type === "staff" || message.sender_type === "system";
                  const CategoryIcon = categoryIcons[message.category] || MessageSquare;
                  
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isStaff ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[70%] ${isStaff ? 'order-1' : ''}`}>
                        <div className={`rounded-2xl p-4 ${
                          isStaff 
                            ? 'bg-blue-600 text-white rounded-br-md' 
                            : 'bg-white border shadow-sm rounded-bl-md'
                        }`}>
                          <div className="flex items-start gap-2 mb-2">
                            <CategoryIcon className={`w-4 h-4 ${isStaff ? 'text-blue-200' : 'text-gray-400'}`} />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 justify-between">
                                <span className={`text-xs font-medium ${isStaff ? 'text-blue-200' : 'text-gray-500'}`}>
                                  {isStaff ? 'Care Team' : selectedClient.full_name}
                                </span>
                                <Badge className={`text-xs ${isStaff ? 'bg-blue-500' : priorityColors[message.priority]}`}>
                                  {message.priority}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <p className="whitespace-pre-wrap">{message.message_content}</p>
                        </div>
                        <p className={`text-xs mt-1 ${isStaff ? 'text-right' : ''} text-gray-500`}>
                          {formatMessageDate(message.created_date)}
                          {message.is_read && !isStaff && (
                            <span className="ml-2 text-green-600">✓ Read</span>
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* AI Suggestion */}
            {aiSuggestion && (
              <div className="mx-4 mb-2 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Bot className="w-5 h-5 text-purple-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-purple-800 mb-2">AI Suggested Response:</p>
                    <p className="text-sm text-purple-700 mb-3">{aiSuggestion.suggested_response}</p>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleQuickReply(aiSuggestion.suggested_response)}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        <Send className="w-3 h-3 mr-1" />
                        Use Response
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setAiSuggestion(null)}
                      >
                        Dismiss
                      </Button>
                      {aiSuggestion.is_booking_request && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowBookingForm(true)}
                          className="border-purple-300 text-purple-700"
                        >
                          <CalendarPlus className="w-3 h-3 mr-1" />
                          Create Booking
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Message Input */}
            <div className="p-4 bg-white border-t">
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <Textarea
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    rows={2}
                    className="resize-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sendMessageMutation.isPending || isAnalyzing}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isAnalyzing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => newMessage && analyzeMessage(newMessage)}
                    disabled={!newMessage.trim() || isAnalyzing}
                    title="Analyze with AI"
                  >
                    <Sparkles className="w-4 h-4 text-purple-600" />
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-medium text-gray-700 mb-2">Select a Client</h3>
              <p className="text-gray-500">Choose a client from the list to view messages</p>
            </div>
          </div>
        )}
      </div>

      {/* AI Stats Sidebar */}
      <div className="w-72 bg-white border-l p-4 overflow-y-auto">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-600" />
          AI Insights
        </h3>

        {/* Priority Distribution */}
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Message Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {['urgent', 'high', 'normal', 'low'].map(priority => {
                const count = messages.filter(m => m.priority === priority).length;
                const percentage = messages.length ? Math.round((count / messages.length) * 100) : 0;
                return (
                  <div key={priority} className="flex items-center gap-2">
                    <Badge className={`${priorityColors[priority]} w-16 text-center`}>
                      {priority}
                    </Badge>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          priority === 'urgent' ? 'bg-red-500' :
                          priority === 'high' ? 'bg-orange-500' :
                          priority === 'normal' ? 'bg-blue-500' : 'bg-gray-400'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-600 w-8">{count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {Object.entries(
                messages.reduce((acc, m) => {
                  acc[m.category] = (acc[m.category] || 0) + 1;
                  return acc;
                }, {})
              ).slice(0, 5).map(([category, count]) => (
                <div key={category} className="flex items-center justify-between">
                  <span className="text-gray-600 capitalize">{category.replace(/_/g, ' ')}</span>
                  <Badge variant="outline">{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Unread Messages</span>
              <Badge className="bg-blue-600">
                {messages.filter(m => !m.is_read && m.sender_type === 'client').length}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Pending Response</span>
              <Badge variant="outline">
                {messages.filter(m => m.status === 'new' || m.status === 'in_progress').length}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Today's Messages</span>
              <Badge variant="outline">
                {messages.filter(m => isToday(parseISO(m.created_date))).length}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Booking Form Modal */}
      {showBookingForm && selectedClient && (
        <BookingFormModal
          client={selectedClient}
          carers={getClientCarers(selectedClient.id)}
          aiSuggestion={aiSuggestion}
          onClose={() => setShowBookingForm(false)}
          onBook={(data) => createShiftMutation.mutate(data)}
        />
      )}
    </div>
  );
}

function BookingFormModal({ client, carers, aiSuggestion, onClose, onBook }) {
  const [bookingData, setBookingData] = useState({
    date: aiSuggestion?.booking_details?.preferred_date || format(new Date(), 'yyyy-MM-dd'),
    start_time: aiSuggestion?.booking_details?.preferred_time || "09:00",
    end_time: "10:00",
    shift_type: "morning",
    carer_id: "",
    notes: aiSuggestion?.booking_details?.service_type || ""
  });
  const [isScheduling, setIsScheduling] = useState(false);
  const [aiScheduleSuggestion, setAiScheduleSuggestion] = useState(null);
  const { toast } = useToast();

  const getAIScheduleSuggestion = async () => {
    setIsScheduling(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `A client named ${client.full_name} needs an appointment.
        
Request details: ${bookingData.notes || 'General care visit'}
Preferred date: ${bookingData.date}
Preferred time: ${bookingData.start_time}
Available carers: ${carers.map(c => c.full_name).join(', ') || 'Any available'}

Suggest the best time slot and duration for this type of appointment. Consider typical care visit patterns.`,
        response_json_schema: {
          type: "object",
          properties: {
            recommended_start: { type: "string" },
            recommended_end: { type: "string" },
            recommended_duration: { type: "string" },
            reasoning: { type: "string" },
            best_carer: { type: "string" }
          }
        }
      });
      setAiScheduleSuggestion(result);
    } catch (error) {
      toast.error("AI Error", "Could not get scheduling suggestion");
    } finally {
      setIsScheduling(false);
    }
  };

  const handleSubmit = () => {
    if (!bookingData.date || !bookingData.start_time) {
      toast.error("Required Fields", "Please fill in date and time");
      return;
    }

    onBook({
      client_id: client.id,
      date: bookingData.date,
      start_time: bookingData.start_time,
      end_time: bookingData.end_time,
      shift_type: bookingData.shift_type,
      carer_id: bookingData.carer_id || undefined,
      notes: bookingData.notes,
      status: "scheduled",
      care_type: "domiciliary_care"
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarPlus className="w-5 h-5 text-blue-600" />
              Book Appointment for {client.full_name}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Date</label>
              <Input
                type="date"
                value={bookingData.date}
                onChange={(e) => setBookingData({ ...bookingData, date: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Shift Type</label>
              <Select value={bookingData.shift_type} onValueChange={(v) => setBookingData({ ...bookingData, shift_type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">Morning</SelectItem>
                  <SelectItem value="afternoon">Afternoon</SelectItem>
                  <SelectItem value="evening">Evening</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Start Time</label>
              <Input
                type="time"
                value={bookingData.start_time}
                onChange={(e) => setBookingData({ ...bookingData, start_time: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">End Time</label>
              <Input
                type="time"
                value={bookingData.end_time}
                onChange={(e) => setBookingData({ ...bookingData, end_time: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Assign Carer (Optional)</label>
            <Select value={bookingData.carer_id} onValueChange={(v) => setBookingData({ ...bookingData, carer_id: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Auto-assign later" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Auto-assign later</SelectItem>
                {carers.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Notes / Service Type</label>
            <Textarea
              value={bookingData.notes}
              onChange={(e) => setBookingData({ ...bookingData, notes: e.target.value })}
              placeholder="Describe the service needed..."
              rows={3}
            />
          </div>

          {/* AI Suggestion */}
          {aiScheduleSuggestion && (
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-purple-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-purple-800">AI Recommendation:</p>
                  <p className="text-purple-700">{aiScheduleSuggestion.reasoning}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    onClick={() => {
                      setBookingData({
                        ...bookingData,
                        start_time: aiScheduleSuggestion.recommended_start || bookingData.start_time,
                        end_time: aiScheduleSuggestion.recommended_end || bookingData.end_time
                      });
                    }}
                  >
                    Apply Suggestion
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={getAIScheduleSuggestion}
              disabled={isScheduling}
            >
              {isScheduling ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              AI Suggest
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700">
                <CheckCircle className="w-4 h-4 mr-2" />
                Book Appointment
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}