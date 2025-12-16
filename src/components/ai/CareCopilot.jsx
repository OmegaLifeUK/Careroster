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
      const clients = await base44.entities.Client.list();
      const carePlans = await base44.entities.CarePlan.list();
      const tasks = await base44.entities.CareTask.list();
      const incidents = await base44.entities.Incident.list();
      const staff = await base44.entities.Staff.list();
      const visits = await base44.entities.Visit.list();
      const dols = await base44.entities.DoLS.list();
      const dnacpr = await base44.entities.DNACPR.list();
      const shifts = await base44.entities.Shift.list();

      const contextData = {
        total_clients: clients.length,
        active_clients: clients.filter(c => c.status === 'active').length,
        total_care_plans: carePlans.length,
        pending_tasks: tasks.filter(t => t.status === 'pending').length,
        recent_incidents: incidents.filter(i => {
          const date = new Date(i.created_date);
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          return date >= sevenDaysAgo;
        }).length,
        staff_count: staff.length,
        todays_visits: visits.filter(v => {
          if (!v.scheduled_start) return false;
          const visitDate = new Date(v.scheduled_start);
          const today = new Date();
          return visitDate.toDateString() === today.toDateString();
        }).length,
        active_dols: dols.filter(d => d.dols_status === 'standard_authorisation_granted' || d.dols_status === 'urgent_authorisation_granted').length,
        active_dnacpr: dnacpr.filter(d => d.status === 'active').length
      };

      const prompt = `You are a care management AI assistant helping care providers get quick insights from their data.

Current system data summary:
- Total clients: ${contextData.total_clients} (${contextData.active_clients} active)
- Care plans: ${contextData.total_care_plans}
- Pending tasks: ${contextData.pending_tasks}
- Recent incidents (last 7 days): ${contextData.recent_incidents}
- Staff members: ${contextData.staff_count}
- Today's visits: ${contextData.todays_visits}
- Active DoLS: ${contextData.active_dols}
- Active DNACPR: ${contextData.active_dnacpr}

User question: "${queryText}"

Provide a helpful, concise response based on the data summary above. If specific data isn't available in the summary, provide general guidance on where to find it in the system. Be professional but friendly. Keep response under 150 words.`;

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