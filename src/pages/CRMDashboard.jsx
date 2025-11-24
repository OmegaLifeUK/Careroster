import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  TrendingUp,
  Mail,
  Phone,
  Calendar,
  Plus
} from "lucide-react";
import { format } from "date-fns";

export default function CRMDashboard() {
  const [activeView, setActiveView] = useState("overview");

  const { data: enquiries = [] } = useQuery({
    queryKey: ['crm-enquiries'],
    queryFn: async () => {
      const data = await base44.entities.ClientEnquiry.list();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: referrals = [] } = useQuery({
    queryKey: ['crm-referrals'],
    queryFn: async () => {
      const data = await base44.entities.Referral.list();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['crm-documents'],
    queryFn: async () => {
      const data = await base44.entities.CRMDocument.list();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: followUps = [] } = useQuery({
    queryKey: ['crm-followups'],
    queryFn: async () => {
      const data = await base44.entities.CRMFollowUp.list();
      return Array.isArray(data) ? data : [];
    },
  });

  // Calculate metrics
  const metrics = {
    newEnquiries: enquiries.filter(e => e.status === 'new').length,
    activeReferrals: referrals.filter(r => !['converted', 'declined'].includes(r.status)).length,
    pendingDocuments: documents.filter(d => ['sent', 'viewed'].includes(d.status)).length,
    overdueFollowUps: followUps.filter(f => {
      if (f.status === 'completed') return false;
      return new Date(f.due_date) < new Date();
    }).length,
    redRAG: [...enquiries, ...referrals, ...documents].filter(i => i.rag_status === 'red').length,
    amberRAG: [...enquiries, ...referrals, ...documents].filter(i => i.rag_status === 'amber').length,
  };

  const ragColors = {
    green: "bg-green-100 text-green-800",
    amber: "bg-amber-100 text-amber-800",
    red: "bg-red-100 text-red-800",
  };

  const recentEnquiries = enquiries.slice(0, 5);
  const urgentFollowUps = followUps
    .filter(f => f.status !== 'completed')
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .slice(0, 5);

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">CRM Dashboard</h1>
          <p className="text-gray-500">Client Relationship Management & Intake System</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="border-l-4 border-blue-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">New Enquiries</p>
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{metrics.newEnquiries}</p>
              <p className="text-xs text-gray-500 mt-1">Awaiting contact</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-green-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Active Referrals</p>
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{metrics.activeReferrals}</p>
              <p className="text-xs text-gray-500 mt-1">In progress</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-orange-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Pending Documents</p>
                <FileText className="w-5 h-5 text-orange-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{metrics.pendingDocuments}</p>
              <p className="text-xs text-gray-500 mt-1">Awaiting completion</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-red-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Overdue Follow-ups</p>
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{metrics.overdueFollowUps}</p>
              <p className="text-xs text-gray-500 mt-1">Require attention</p>
            </CardContent>
          </Card>
        </div>

        {/* RAG Status Summary */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>RAG Status Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-red-500"></div>
                <span className="text-sm font-medium">Red: {metrics.redRAG}</span>
                <span className="text-xs text-gray-500">Urgent attention needed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-amber-500"></div>
                <span className="text-sm font-medium">Amber: {metrics.amberRAG}</span>
                <span className="text-xs text-gray-500">Monitor closely</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-green-500"></div>
                <span className="text-sm font-medium">Green: {enquiries.length + referrals.length + documents.length - metrics.redRAG - metrics.amberRAG}</span>
                <span className="text-xs text-gray-500">On track</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6 p-2 flex gap-2 overflow-x-auto">
          <Button
            variant={activeView === "overview" ? "default" : "ghost"}
            onClick={() => setActiveView("overview")}
          >
            Overview
          </Button>
          <Button
            variant={activeView === "enquiries" ? "default" : "ghost"}
            onClick={() => setActiveView("enquiries")}
          >
            Enquiries
          </Button>
          <Button
            variant={activeView === "referrals" ? "default" : "ghost"}
            onClick={() => setActiveView("referrals")}
          >
            Referrals
          </Button>
          <Button
            variant={activeView === "documents" ? "default" : "ghost"}
            onClick={() => setActiveView("documents")}
          >
            Documents
          </Button>
          <Button
            variant={activeView === "followups" ? "default" : "ghost"}
            onClick={() => setActiveView("followups")}
          >
            Follow-ups
          </Button>
        </div>

        {/* Overview Content */}
        {activeView === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Enquiries */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Recent Enquiries</CardTitle>
                <Button size="sm">View All</Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentEnquiries.map(enquiry => (
                    <div key={enquiry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{enquiry.contact_name}</p>
                        <p className="text-sm text-gray-600">{enquiry.care_type_needed}</p>
                        <p className="text-xs text-gray-500">{format(new Date(enquiry.created_date), 'MMM d, yyyy')}</p>
                      </div>
                      {enquiry.rag_status && (
                        <Badge className={ragColors[enquiry.rag_status]}>
                          {enquiry.rag_status.toUpperCase()}
                        </Badge>
                      )}
                    </div>
                  ))}
                  {recentEnquiries.length === 0 && (
                    <p className="text-center text-gray-500 py-6">No recent enquiries</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Urgent Follow-ups */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Urgent Follow-ups</CardTitle>
                <Button size="sm">View All</Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {urgentFollowUps.map(followUp => (
                    <div key={followUp.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{followUp.title}</p>
                        <p className="text-sm text-gray-600">{followUp.follow_up_type}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <p className="text-xs text-gray-500">
                            Due: {format(new Date(followUp.due_date), 'MMM d, h:mm a')}
                          </p>
                        </div>
                      </div>
                      {new Date(followUp.due_date) < new Date() && (
                        <Badge className="bg-red-100 text-red-800">Overdue</Badge>
                      )}
                    </div>
                  ))}
                  {urgentFollowUps.length === 0 && (
                    <p className="text-center text-gray-500 py-6">No urgent follow-ups</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Placeholder views for other tabs */}
        {activeView !== "overview" && (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-gray-500 mb-4">
                {activeView === "enquiries" && "Enquiry Management"}
                {activeView === "referrals" && "Referral Management"}
                {activeView === "documents" && "Document Tracking"}
                {activeView === "followups" && "Follow-up Management"}
              </p>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add {activeView.slice(0, -1)}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}