import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Sparkles, Send, Loader2, MessageCircle, Clock, User, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { format } from "date-fns";

const SUGGESTED_QUERIES = [
  "Summarize today's outstanding tasks",
  "Show clients with overdue care plan reviews",
  "List incidents from the last 7 days",
  "Which staff members have training expiring soon?",
  "Show me clients with high-risk assessments",
  "What visits are scheduled for today?",
  "List clients with medication changes this week",
  "Show overdue DoLS authorisations"
];

export default function CareCopilot({ open, onClose }) {
  const [query, setQuery] = useState("");
  const [conversation, setConversation] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleQuery = async (queryText = query) => {
    if (!queryText.trim()) return;

    const userMessage = { role: "user", content: queryText, timestamp: new Date() };
    setConversation(prev => [...prev, userMessage]);
    setQuery("");
    setIsLoading(true);

    try {
      // Gather context data
      const [clients, carePlans, tasks, incidents, staff, visits, dols, dnacpr, shifts, dailyLogs] = await Promise.all([
        base44.entities.Client.list(),
        base44.entities.CarePlan.list(),
        base44.entities.CareTask.list(),
        base44.entities.Incident.list(),
        base44.entities.Staff.list(),
        base44.entities.Visit.list('-scheduled_start'),
        base44.entities.DoLS.list(),
        base44.entities.DNACPR.list(),
        base44.entities.Shift.list('-date'),
        base44.entities.DailyLog.list('-log_date').catch(() => [])
      ]);

      // Filter relevant data based on query
      const today = new Date();
      const todayStr = today.toDateString();
      
      const todayVisits = visits.filter(v => {
        if (!v.scheduled_start) return false;
        const visitDate = new Date(v.scheduled_start);
        return visitDate.toDateString() === todayStr;
      });

      const todayShifts = shifts.filter(s => {
        if (!s.date) return false;
        const shiftDate = new Date(s.date);
        return shiftDate.toDateString() === todayStr;
      });

      const overdueTasks = tasks.filter(t => {
        if (t.status !== 'pending') return false;
        const dueDate = new Date(t.due_date);
        return dueDate < today;
      });

      const overdueReviews = carePlans.filter(cp => {
        if (cp.status !== 'active' || !cp.review_date) return false;
        const reviewDate = new Date(cp.review_date);
        return reviewDate < today;
      });

      const expiringDols = dols.filter(d => {
        if (!d.authorisation_end_date) return false;
        const expiryDate = new Date(d.authorisation_end_date);
        const daysUntil = Math.floor((expiryDate - today) / (1000 * 60 * 60 * 24));
        return daysUntil > 0 && daysUntil <= 30;
      });

      const recentIncidents = incidents.filter(i => {
        const incidentDate = new Date(i.created_date);
        const daysAgo = Math.floor((today - incidentDate) / (1000 * 60 * 60 * 24));
        return daysAgo <= 7;
      }).slice(0, 10);

      // Build comprehensive data context
      const dataContext = JSON.stringify({
        clients: clients.map(c => ({ 
          id: c.id, 
          name: c.full_name, 
          status: c.status,
          care_needs: c.care_needs,
          mobility: c.mobility
        })),
        today_visits: todayVisits.map(v => ({
          client_id: v.client_id,
          staff_id: v.assigned_staff_id,
          time: v.scheduled_start,
          status: v.status,
          notes: v.completion_notes
        })),
        today_shifts: todayShifts.map(s => ({
          carer_id: s.carer_id,
          client_id: s.client_id,
          time: s.start_time,
          status: s.status
        })),
        overdue_tasks: overdueTasks.map(t => ({
          task_name: t.task_name,
          client_id: t.client_id,
          due_date: t.due_date,
          category: t.category
        })),
        overdue_reviews: overdueReviews.map(r => ({
          client_id: r.client_id,
          review_date: r.review_date,
          plan_type: r.plan_type
        })),
        expiring_dols: expiringDols.map(d => ({
          client_id: d.client_id,
          expiry_date: d.authorisation_end_date,
          status: d.dols_status
        })),
        recent_incidents: recentIncidents.map(i => ({
          type: i.incident_type,
          severity: i.severity,
          date: i.created_date,
          client_id: i.client_id,
          description: i.description?.substring(0, 100)
        })),
        recent_logs: dailyLogs.slice(0, 20).map(l => ({
          client_id: l.client_id,
          date: l.log_date,
          summary: l.summary?.substring(0, 150)
        }))
      }, null, 2);

      const prompt = `You are a care management AI assistant. Analyze the data and provide specific, actionable answers.

ACTUAL SYSTEM DATA:
${dataContext}

User question: "${queryText}"

INSTRUCTIONS:
- Provide specific answers using the actual data provided above
- Include names, dates, numbers from the real data
- If asking about a specific client, search the data for that client
- Format your response clearly with bullet points or lists
- Keep it concise but informative
- If the data doesn't contain what they're asking for, say so clearly

DO NOT just tell them where to look - give them the actual information from the data.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            answer: { type: "string" },
            action_items: { type: "array", items: { type: "string" } },
            relevant_sections: { type: "array", items: { type: "string" } }
          }
        }
      });

      const assistantMessage = {
        role: "assistant",
        content: response.answer,
        actionItems: response.action_items || [],
        relevantSections: response.relevant_sections || [],
        timestamp: new Date()
      };

      setConversation(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Copilot error:", error);
      toast.error("Error", "Failed to process query");
      
      const errorMessage = {
        role: "assistant",
        content: "I'm having trouble accessing the data right now. Please try again.",
        timestamp: new Date()
      };
      setConversation(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Care Copilot - AI Assistant
          </DialogTitle>
          <p className="text-sm text-gray-600">Ask questions about your care data in plain English</p>
        </DialogHeader>

        {/* Conversation Area */}
        <div className="flex-1 overflow-y-auto space-y-4 min-h-[400px] max-h-[500px] p-4 bg-gray-50 rounded-lg">
          {conversation.length === 0 ? (
            <div className="text-center py-12">
              <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 mb-6">Ask me anything about your care operations</p>
              
              <div className="grid grid-cols-2 gap-2 max-w-2xl mx-auto">
                {SUGGESTED_QUERIES.slice(0, 6).map((suggestion, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuery(suggestion)}
                    className="text-left justify-start text-xs h-auto py-2"
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            conversation.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                  </div>
                )}
                
                <div className={`max-w-[70%] ${msg.role === 'user' ? 'order-first' : ''}`}>
                  <div
                    className={`p-3 rounded-lg ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-gray-200'
                    }`}
                  >
                    <p className="text-sm">{msg.content}</p>
                  </div>
                  
                  {msg.actionItems?.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <p className="text-xs font-medium text-gray-600">Action Items:</p>
                      {msg.actionItems.map((item, i) => (
                        <Badge key={i} variant="outline" className="text-xs mr-1">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  {msg.relevantSections?.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-gray-600 mb-1">Relevant Sections:</p>
                      <div className="flex flex-wrap gap-1">
                        {msg.relevantSections.map((section, i) => (
                          <Badge key={i} className="bg-purple-100 text-purple-700 text-xs">
                            {section}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <p className="text-xs text-gray-400 mt-1">
                    {format(msg.timestamp, 'HH:mm')}
                  </p>
                </div>

                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                )}
              </div>
            ))
          )}

          {isLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-purple-600" />
              </div>
              <div className="bg-white border border-gray-200 p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                  <p className="text-sm text-gray-600">Analyzing data...</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask a question about your care data..."
            onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleQuery()}
            disabled={isLoading}
          />
          <Button
            onClick={() => handleQuery()}
            disabled={!query.trim() || isLoading}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>

        {/* Quick Actions */}
        {conversation.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {SUGGESTED_QUERIES.slice(0, 4).map((suggestion, idx) => (
              <Button
                key={idx}
                variant="outline"
                size="sm"
                onClick={() => handleQuery(suggestion)}
                disabled={isLoading}
                className="text-xs whitespace-nowrap"
              >
                {suggestion}
              </Button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}