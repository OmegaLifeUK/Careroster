import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Plus } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export default function RecurringAuditScheduler({ onClose }) {
  const [formData, setFormData] = useState({
    template_id: "",
    frequency: "monthly",
    start_date: "",
    assigned_to: "",
    area_audited: ""
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: templates = [] } = useQuery({
    queryKey: ['audit-templates'],
    queryFn: async () => {
      const data = await base44.entities.AuditTemplate.list();
      return Array.isArray(data) ? data.filter(t => t.is_active) : [];
    },
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const data = await base44.entities.Staff.list();
      return Array.isArray(data) ? data : [];
    },
  });

  const scheduleMutation = useMutation({
    mutationFn: async (data) => {
      // Create initial audit
      await base44.entities.AuditRecord.create({
        template_id: data.template_id,
        audit_date: data.start_date,
        auditor_staff_id: data.assigned_to,
        area_audited: data.area_audited,
        status: 'draft',
        responses: []
      });
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-records'] });
      toast.success("Success", "Recurring audit scheduled");
      onClose();
    },
  });

  const handleSubmit = () => {
    if (!formData.template_id || !formData.start_date || !formData.assigned_to) {
      toast.error("Error", "Please fill in all required fields");
      return;
    }
    scheduleMutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Schedule Recurring Audit
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Audit Template *</label>
              <Select value={formData.template_id} onValueChange={(val) => setFormData({ ...formData, template_id: val })}>
                <SelectTrigger><SelectValue placeholder="Select template" /></SelectTrigger>
                <SelectContent>
                  {templates.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.template_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Frequency</label>
                <Select value={formData.frequency} onValueChange={(val) => setFormData({ ...formData, frequency: val })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Start Date *</label>
                <Input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Assigned To *</label>
              <Select value={formData.assigned_to} onValueChange={(val) => setFormData({ ...formData, assigned_to: val })}>
                <SelectTrigger><SelectValue placeholder="Select staff member" /></SelectTrigger>
                <SelectContent>
                  {staff.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Area to Audit</label>
              <Input value={formData.area_audited} onChange={(e) => setFormData({ ...formData, area_audited: e.target.value })} placeholder="e.g., Kitchen, Care Unit A" />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={scheduleMutation.isPending}>
                {scheduleMutation.isPending ? "Scheduling..." : "Schedule Audit"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}