import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Target, Plus, Clock, CheckCircle, AlertTriangle, Upload, X } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export default function ActionPlans() {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "compliance",
    priority: "medium",
    status: "active",
    assigned_to_staff_ids: [],
    target_completion_date: "",
    actions: [],
    evidence: []
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: actionPlans = [], isLoading } = useQuery({
    queryKey: ['action-plans'],
    queryFn: async () => {
      const data = await base44.entities.ActionPlan.list('-created_date');
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const data = await base44.entities.Staff.list();
      return Array.isArray(data) ? data : [];
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ActionPlan.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['action-plans'] });
      setShowDialog(false);
      resetForm();
      toast.success("Success", "Action plan created successfully");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ActionPlan.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['action-plans'] });
      setSelectedPlan(null);
      toast.success("Success", "Action plan updated successfully");
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      category: "compliance",
      priority: "medium",
      status: "active",
      assigned_to_staff_ids: [],
      target_completion_date: "",
      actions: [],
      evidence: []
    });
  };

  const addAction = () => {
    setFormData({
      ...formData,
      actions: [...formData.actions, {
        action: "",
        responsible_person: "",
        target_date: "",
        status: "pending",
        notes: ""
      }]
    });
  };

  const updateAction = (index, field, value) => {
    const newActions = [...formData.actions];
    newActions[index][field] = value;
    setFormData({ ...formData, actions: newActions });
  };

  const removeAction = (index) => {
    setFormData({
      ...formData,
      actions: formData.actions.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = () => {
    if (!formData.title || !formData.target_completion_date) {
      toast.error("Error", "Please fill in all required fields");
      return;
    }

    const progress = calculateProgress(formData.actions);
    createMutation.mutate({ ...formData, progress_percentage: progress });
  };

  const calculateProgress = (actions) => {
    if (!actions || actions.length === 0) return 0;
    const completed = actions.filter(a => a.status === "completed").length;
    return Math.round((completed / actions.length) * 100);
  };

  const filteredPlans = actionPlans.filter(plan => {
    if (filterStatus === "all") return true;
    return plan.status === filterStatus;
  });

  const statusColors = {
    draft: "bg-gray-100 text-gray-800",
    active: "bg-blue-100 text-blue-800",
    in_progress: "bg-yellow-100 text-yellow-800",
    completed: "bg-green-100 text-green-800",
    overdue: "bg-red-100 text-red-800",
    cancelled: "bg-gray-300 text-gray-600"
  };

  const priorityColors = {
    low: "bg-blue-100 text-blue-800",
    medium: "bg-yellow-100 text-yellow-800",
    high: "bg-orange-100 text-orange-800",
    critical: "bg-red-100 text-red-800"
  };

  if (selectedPlan) {
    return (
      <div className="p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          <Button variant="outline" onClick={() => setSelectedPlan(null)} className="mb-4">
            ← Back to Action Plans
          </Button>
          
          <Card>
            <CardHeader className="border-b">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{selectedPlan.title}</CardTitle>
                  <p className="text-sm text-gray-500 mt-1">{selectedPlan.description}</p>
                </div>
                <div className="flex gap-2">
                  <Badge className={statusColors[selectedPlan.status]}>
                    {selectedPlan.status}
                  </Badge>
                  <Badge className={priorityColors[selectedPlan.priority]}>
                    {selectedPlan.priority}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-3">Progress: {selectedPlan.progress_percentage || 0}%</h3>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${selectedPlan.progress_percentage || 0}%` }}
                    />
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Actions</h3>
                  <div className="space-y-3">
                    {selectedPlan.actions && selectedPlan.actions.length > 0 ? (
                      selectedPlan.actions.map((action, idx) => (
                        <div key={idx} className="p-4 border rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <p className="font-medium">{action.action}</p>
                            <Badge className={
                              action.status === "completed" ? "bg-green-100 text-green-800" :
                              action.status === "in_progress" ? "bg-yellow-100 text-yellow-800" :
                              "bg-gray-100 text-gray-800"
                            }>
                              {action.status}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p><strong>Responsible:</strong> {action.responsible_person}</p>
                            <p><strong>Target Date:</strong> {action.target_date}</p>
                            {action.notes && <p><strong>Notes:</strong> {action.notes}</p>}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500">No actions defined yet</p>
                    )}
                  </div>
                </div>

                {selectedPlan.evidence && selectedPlan.evidence.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Evidence</h3>
                    <div className="space-y-2">
                      {selectedPlan.evidence.map((ev, idx) => (
                        <div key={idx} className="p-3 bg-gray-50 rounded border">
                          <p className="font-medium text-sm">{ev.evidence_type}</p>
                          <p className="text-xs text-gray-600 mt-1">{ev.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Action Plans</h1>
            <p className="text-gray-500">Track compliance actions and progress</p>
          </div>
          <Button onClick={() => setShowDialog(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            New Action Plan
          </Button>
        </div>

        <div className="flex gap-3 mb-6">
          {["all", "active", "in_progress", "completed", "overdue"].map(status => (
            <Button
              key={status}
              variant={filterStatus === status ? "default" : "outline"}
              onClick={() => setFilterStatus(status)}
              size="sm"
            >
              {status.replace('_', ' ')}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <p className="text-center py-12 text-gray-500">Loading action plans...</p>
        ) : filteredPlans.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Target className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">No action plans found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPlans.map(plan => (
              <Card 
                key={plan.id} 
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setSelectedPlan(plan)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-lg">{plan.title}</h3>
                    <div className="flex gap-2">
                      <Badge className={priorityColors[plan.priority]}>
                        {plan.priority}
                      </Badge>
                      <Badge className={statusColors[plan.status]}>
                        {plan.status}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">{plan.description}</p>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>Due: {plan.target_completion_date}</span>
                    </div>
                    {plan.actions && plan.actions.length > 0 && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <CheckCircle className="w-4 h-4" />
                        <span>{plan.actions.length} actions</span>
                      </div>
                    )}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                        <span>Progress</span>
                        <span>{plan.progress_percentage || 0}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${plan.progress_percentage || 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {showDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <CardHeader className="border-b">
                <CardTitle>Create Action Plan</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <Label>Title *</Label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Action plan title"
                    />
                  </div>

                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe the action plan"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Category</Label>
                      <Select value={formData.category} onValueChange={(val) => setFormData({ ...formData, category: val })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["training", "compliance", "quality", "safety", "staffing", "clinical", "regulatory", "other"].map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Priority</Label>
                      <Select value={formData.priority} onValueChange={(val) => setFormData({ ...formData, priority: val })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["low", "medium", "high", "critical"].map(pri => (
                            <SelectItem key={pri} value={pri}>{pri}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Target Completion Date *</Label>
                    <Input
                      type="date"
                      value={formData.target_completion_date}
                      onChange={(e) => setFormData({ ...formData, target_completion_date: e.target.value })}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Actions</Label>
                      <Button onClick={addAction} size="sm" variant="outline">
                        <Plus className="w-4 h-4 mr-1" />
                        Add Action
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {formData.actions.map((action, idx) => (
                        <div key={idx} className="p-3 border rounded space-y-2">
                          <div className="flex justify-between">
                            <Label className="text-xs">Action {idx + 1}</Label>
                            <button onClick={() => removeAction(idx)} className="text-red-600">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <Input
                            placeholder="Action description"
                            value={action.action}
                            onChange={(e) => updateAction(idx, 'action', e.target.value)}
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              placeholder="Responsible person"
                              value={action.responsible_person}
                              onChange={(e) => updateAction(idx, 'responsible_person', e.target.value)}
                            />
                            <Input
                              type="date"
                              value={action.target_date}
                              onChange={(e) => updateAction(idx, 'target_date', e.target.value)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <Button variant="outline" onClick={() => { setShowDialog(false); resetForm(); }}>
                      Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={createMutation.isPending}>
                      {createMutation.isPending ? "Creating..." : "Create Action Plan"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}