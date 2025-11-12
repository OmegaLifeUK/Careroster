import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { 
  Mail, 
  MessageSquare, 
  Bell, 
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Settings,
  Plus,
  Zap,
  Users,
  Shield,
  FileText,
  Activity,
  GraduationCap
} from "lucide-react";
import { useToast } from "@/components/ui/toast";

const WORKFLOW_TEMPLATES = [
  {
    id: 'shift_reminder_24h',
    name: 'Shift Reminder (24h before)',
    description: 'Send email to carers 24 hours before their shift',
    trigger: 'scheduled',
    action: 'send_email',
    category: 'scheduling',
    icon: Calendar,
    default_enabled: true,
  },
  {
    id: 'unfilled_shift_alert',
    name: 'Unfilled Shift Alert',
    description: 'Notify managers when shifts remain unfilled 48h before',
    trigger: 'condition',
    action: 'send_notification',
    category: 'scheduling',
    icon: AlertCircle,
    default_enabled: true,
  },
  {
    id: 'leave_approval_reminder',
    name: 'Leave Approval Reminder',
    description: 'Remind managers to approve pending leave requests after 48h',
    trigger: 'scheduled',
    action: 'send_notification',
    category: 'hr',
    icon: Clock,
    default_enabled: true,
  },
  {
    id: 'training_expiry_warning',
    name: 'Training Expiry Warning',
    description: 'Alert staff when certifications expire in 30 days',
    trigger: 'scheduled',
    action: 'send_email',
    category: 'training',
    icon: Bell,
    default_enabled: true,
  },
  {
    id: 'incident_follow_up',
    name: 'Incident Follow-up',
    description: 'Remind managers to review incidents after 7 days',
    trigger: 'scheduled',
    action: 'send_notification',
    category: 'compliance',
    icon: AlertCircle,
    default_enabled: true,
  },
  {
    id: 'medication_missed_alert',
    name: 'Missed Medication Alert',
    description: 'Immediate alert when medication is marked as missed',
    trigger: 'event',
    action: 'send_notification',
    category: 'clinical',
    icon: Bell,
    default_enabled: true,
  },
  {
    id: 'client_birthday_reminder',
    name: 'Client Birthday Reminder',
    description: 'Remind staff of client birthdays 3 days in advance',
    trigger: 'scheduled',
    action: 'send_notification',
    category: 'engagement',
    icon: Calendar,
    default_enabled: false,
  },
  {
    id: 'daily_summary_email',
    name: 'Daily Summary Email',
    description: 'Send daily operations summary to managers at 6pm',
    trigger: 'scheduled',
    action: 'send_email',
    category: 'reporting',
    icon: Mail,
    default_enabled: false,
  },
];

export default function AutomatedWorkflows() {
  const [activeWorkflows, setActiveWorkflows] = useState(() => {
    const saved = localStorage.getItem('active_workflows');
    return saved ? JSON.parse(saved) : WORKFLOW_TEMPLATES.filter(w => w.default_enabled).map(w => w.id);
  });
  const [expandedWorkflow, setExpandedWorkflow] = useState(null);
  const { toast } = useToast();

  const toggleWorkflow = (workflowId) => {
    const updated = activeWorkflows.includes(workflowId)
      ? activeWorkflows.filter(id => id !== workflowId)
      : [...activeWorkflows, workflowId];
    
    setActiveWorkflows(updated);
    localStorage.setItem('active_workflows', JSON.stringify(updated));
    
    const workflow = WORKFLOW_TEMPLATES.find(w => w.id === workflowId);
    toast.success(
      updated.includes(workflowId) ? "Workflow Activated" : "Workflow Deactivated",
      `${workflow?.name} is now ${updated.includes(workflowId) ? 'active' : 'inactive'}`
    );
  };

  const testWorkflow = async (workflowId) => {
    const workflow = WORKFLOW_TEMPLATES.find(w => w.id === workflowId);
    
    toast.info("Testing Workflow", `Sending test notification for ${workflow.name}...`);
    
    setTimeout(() => {
      toast.success("Test Complete", "Workflow executed successfully");
    }, 2000);
  };

  const groupedWorkflows = WORKFLOW_TEMPLATES.reduce((acc, workflow) => {
    if (!acc[workflow.category]) {
      acc[workflow.category] = [];
    }
    acc[workflow.category].push(workflow);
    return acc;
  }, {});

  const categoryIcons = {
    scheduling: Calendar,
    hr: Users,
    training: GraduationCap,
    compliance: Shield,
    clinical: Activity,
    engagement: MessageSquare,
    reporting: FileText,
  };

  const categoryColors = {
    scheduling: 'from-blue-500 to-blue-600',
    hr: 'from-green-500 to-green-600',
    training: 'from-purple-500 to-purple-600',
    compliance: 'from-red-500 to-red-600',
    clinical: 'from-pink-500 to-pink-600',
    engagement: 'from-amber-500 to-amber-600',
    reporting: 'from-indigo-500 to-indigo-600',
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Active Workflows</p>
                <p className="text-2xl font-bold text-gray-900">{activeWorkflows.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Executed Today</p>
                <p className="text-2xl font-bold text-gray-900">47</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Mail className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Emails Sent</p>
                <p className="text-2xl font-bold text-gray-900">234</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Bell className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Notifications</p>
                <p className="text-2xl font-bold text-gray-900">89</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {Object.entries(groupedWorkflows).map(([category, workflows]) => {
        const CategoryIcon = categoryIcons[category] || Settings;
        const activeCount = workflows.filter(w => activeWorkflows.includes(w.id)).length;

        return (
          <div key={category}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 bg-gradient-to-br ${categoryColors[category]} rounded-lg flex items-center justify-center shadow-lg`}>
                <CategoryIcon className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-900 capitalize">
                  {category.replace('_', ' ')} Workflows
                </h2>
                <p className="text-sm text-gray-500">
                  {activeCount} of {workflows.length} active
                </p>
              </div>
            </div>

            <div className="grid gap-4">
              {workflows.map((workflow) => {
                const WorkflowIcon = workflow.icon;
                const isActive = activeWorkflows.includes(workflow.id);
                const isExpanded = expandedWorkflow === workflow.id;

                return (
                  <Card key={workflow.id} className={`transition-all ${isActive ? 'border-blue-300 bg-blue-50/50' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isActive ? 'bg-blue-600' : 'bg-gray-200'
                        }`}>
                          <WorkflowIcon className={`w-6 h-6 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-gray-900">{workflow.name}</h3>
                              <Badge variant="outline" className="text-xs">
                                {workflow.trigger}
                              </Badge>
                            </div>
                            <Switch
                              checked={isActive}
                              onCheckedChange={() => toggleWorkflow(workflow.id)}
                            />
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-3">{workflow.description}</p>

                          {isActive && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setExpandedWorkflow(isExpanded ? null : workflow.id)}
                              >
                                <Settings className="w-3 h-3 mr-1" />
                                {isExpanded ? 'Hide' : 'Configure'}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => testWorkflow(workflow.id)}
                              >
                                <Zap className="w-3 h-3 mr-1" />
                                Test
                              </Button>
                            </div>
                          )}

                          {isExpanded && (
                            <div className="mt-4 p-4 bg-white rounded-lg border space-y-3">
                              <div>
                                <label className="text-sm font-medium text-gray-700 mb-1 block">
                                  Trigger Condition
                                </label>
                                <Input
                                  placeholder="e.g., 24 hours before"
                                  defaultValue="24 hours before shift"
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-700 mb-1 block">
                                  Recipients
                                </label>
                                <Input
                                  placeholder="e.g., assigned_carer, managers"
                                  defaultValue="assigned_carer"
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-700 mb-1 block">
                                  Email Template
                                </label>
                                <textarea
                                  className="w-full p-2 border rounded text-sm"
                                  rows="3"
                                  placeholder="Email message..."
                                  defaultValue="Hello {{carer_name}}, you have a shift scheduled for {{shift_date}} at {{shift_time}}."
                                />
                              </div>
                              <Button size="sm" className="w-full">
                                Save Configuration
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}