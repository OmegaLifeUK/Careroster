import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, ClipboardList, Bell, Send, Users } from "lucide-react";

const ACTION_TYPES = [
  { value: "create_task", label: "Create Task", icon: ClipboardList, color: "bg-blue-100 text-blue-800" },
  { value: "send_notification", label: "Send Notification", icon: Bell, color: "bg-yellow-100 text-yellow-800" },
  { value: "send_email", label: "Send Email", icon: Send, color: "bg-green-100 text-green-800" },
  { value: "route_form", label: "Route to Staff", icon: Users, color: "bg-purple-100 text-purple-800" }
];

export default function WorkflowActionEditor({ action, onChange, onDelete, staff = [], roles = [] }) {
  const actionType = ACTION_TYPES.find(a => a.value === action.action_type);
  const Icon = actionType?.icon || ClipboardList;

  const updateConfig = (key, value) => {
    onChange({
      ...action,
      action_config: { ...action.action_config, [key]: value }
    });
  };

  return (
    <Card className="border-l-4 border-l-purple-400">
      <CardContent className="p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-purple-600" />
            <Select
              value={action.action_type}
              onValueChange={(val) => onChange({ ...action, action_type: val, action_config: {} })}
            >
              <SelectTrigger className="w-48 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTION_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" variant="ghost" onClick={onDelete} className="text-red-600 h-8 w-8 p-0">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        {action.action_type === "create_task" && (
          <div className="space-y-2">
            <Input
              value={action.action_config?.task_title || ""}
              onChange={(e) => updateConfig('task_title', e.target.value)}
              placeholder="Task title"
              className="h-8"
            />
            <Textarea
              value={action.action_config?.task_description || ""}
              onChange={(e) => updateConfig('task_description', e.target.value)}
              placeholder="Task description..."
              rows={2}
            />
            <div className="grid grid-cols-2 gap-2">
              <Select
                value={action.action_config?.task_priority || "medium"}
                onValueChange={(val) => updateConfig('task_priority', val)}
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low Priority</SelectItem>
                  <SelectItem value="medium">Medium Priority</SelectItem>
                  <SelectItem value="high">High Priority</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={action.action_config?.assign_to || ""}
                onValueChange={(val) => updateConfig('assign_to', val)}
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Assign to..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="submitter">Form Submitter</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  {staff.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input
              type="number"
              value={action.action_config?.due_in_days || ""}
              onChange={(e) => updateConfig('due_in_days', e.target.value)}
              placeholder="Due in X days"
              className="h-8"
            />
          </div>
        )}

        {action.action_type === "send_notification" && (
          <div className="space-y-2">
            <Input
              value={action.action_config?.notification_title || ""}
              onChange={(e) => updateConfig('notification_title', e.target.value)}
              placeholder="Notification title"
              className="h-8"
            />
            <Textarea
              value={action.action_config?.notification_message || ""}
              onChange={(e) => updateConfig('notification_message', e.target.value)}
              placeholder="Message..."
              rows={2}
            />
            <Select
              value={action.action_config?.notify_type || "specific"}
              onValueChange={(val) => updateConfig('notify_type', val)}
            >
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Notify..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="submitter">Form Submitter</SelectItem>
                <SelectItem value="managers">All Managers</SelectItem>
                <SelectItem value="role">Specific Role</SelectItem>
                <SelectItem value="specific">Specific Staff</SelectItem>
              </SelectContent>
            </Select>
            {action.action_config?.notify_type === "role" && (
              <Select
                value={action.action_config?.notify_role || ""}
                onValueChange={(val) => updateConfig('notify_role', val)}
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Select role..." />
                </SelectTrigger>
                <SelectContent>
                  {roles.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.role_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {action.action_config?.notify_type === "specific" && (
              <Select
                value={action.action_config?.notify_staff || ""}
                onValueChange={(val) => updateConfig('notify_staff', val)}
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Select staff..." />
                </SelectTrigger>
                <SelectContent>
                  {staff.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        {action.action_type === "send_email" && (
          <div className="space-y-2">
            <Select
              value={action.action_config?.email_to || "submitter"}
              onValueChange={(val) => updateConfig('email_to', val)}
            >
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Send to..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="submitter">Form Submitter</SelectItem>
                <SelectItem value="managers">All Managers</SelectItem>
                <SelectItem value="specific">Specific Email</SelectItem>
              </SelectContent>
            </Select>
            {action.action_config?.email_to === "specific" && (
              <Input
                type="email"
                value={action.action_config?.email_address || ""}
                onChange={(e) => updateConfig('email_address', e.target.value)}
                placeholder="Email address"
                className="h-8"
              />
            )}
            <Input
              value={action.action_config?.email_subject || ""}
              onChange={(e) => updateConfig('email_subject', e.target.value)}
              placeholder="Email subject"
              className="h-8"
            />
            <Textarea
              value={action.action_config?.email_body || ""}
              onChange={(e) => updateConfig('email_body', e.target.value)}
              placeholder="Email body... (use {{field_name}} for dynamic values)"
              rows={3}
            />
          </div>
        )}

        {action.action_type === "route_form" && (
          <div className="space-y-2">
            <p className="text-xs text-gray-500">Route this form submission for review/approval</p>
            <Select
              value={action.action_config?.route_to_type || "role"}
              onValueChange={(val) => updateConfig('route_to_type', val)}
            >
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Route to..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="role">By Role</SelectItem>
                <SelectItem value="staff">Specific Staff</SelectItem>
                <SelectItem value="manager">Line Manager</SelectItem>
              </SelectContent>
            </Select>
            {action.action_config?.route_to_type === "role" && (
              <Select
                value={action.action_config?.route_to_role || ""}
                onValueChange={(val) => updateConfig('route_to_role', val)}
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Select role..." />
                </SelectTrigger>
                <SelectContent>
                  {roles.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.role_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {action.action_config?.route_to_type === "staff" && (
              <Select
                value={action.action_config?.route_to_staff || ""}
                onValueChange={(val) => updateConfig('route_to_staff', val)}
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Select staff..." />
                </SelectTrigger>
                <SelectContent>
                  {staff.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={action.action_config?.require_approval || false}
                onChange={(e) => updateConfig('require_approval', e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm">Require approval before completing</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}