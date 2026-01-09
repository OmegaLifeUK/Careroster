import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tantml:react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { UserCheck, CheckCircle, Loader2, Plus } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { format, addWeeks } from "date-fns";

export default function InductionForm({ staffId, existingRecord, onComplete }) {
  const [formData, setFormData] = useState(existingRecord || {
    staff_id: staffId,
    induction_start_date: format(new Date(), 'yyyy-MM-dd'),
    shadow_shifts_required: 3,
    shadow_shifts_completed: 0,
    shadow_shift_records: [],
    competency_assessment_result: 'pending',
    probation_period_weeks: 12,
    probation_outcome: 'pending',
    status: 'in_progress',
    induction_checklist: [
      { item: "Introduction to organisation values and mission", completed: false },
      { item: "Fire safety and emergency procedures", completed: false },
      { item: "Health & safety tour", completed: false },
      { item: "Data protection and confidentiality", completed: false },
      { item: "Safeguarding policy and procedures", completed: false },
      { item: "Lone working policy", completed: false },
      { item: "Medication policy", completed: false },
      { item: "Recording and documentation standards", completed: false }
    ]
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const addShadowShift = () => {
    setFormData(prev => ({
      ...prev,
      shadow_shift_records: [
        ...prev.shadow_shift_records,
        {
          shift_date: format(new Date(), 'yyyy-MM-dd'),
          shadowed_staff: '',
          client_id: '',
          feedback: '',
          performance_rating: 'good'
        }
      ]
    }));
  };

  const updateShadowShift = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      shadow_shift_records: prev.shadow_shift_records.map((shift, i) => 
        i === index ? { ...shift, [field]: value } : shift
      )
    }));
  };

  const toggleChecklistItem = (index) => {
    setFormData(prev => ({
      ...prev,
      induction_checklist: prev.induction_checklist.map((item, i) => 
        i === index ? { 
          ...item, 
          completed: !item.completed,
          completed_date: !item.completed ? format(new Date(), 'yyyy-MM-dd') : null
        } : item
      )
    }));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const user = await base44.auth.me();
      
      const shadowCompleted = formData.shadow_shift_records.length;
      const checklistCompleted = formData.induction_checklist.filter(c => c.completed).length;
      const checklistTotal = formData.induction_checklist.length;
      
      const allComplete = 
        shadowCompleted >= formData.shadow_shifts_required &&
        formData.competency_assessment_result === 'pass' &&
        checklistCompleted === checklistTotal;

      const data = {
        ...formData,
        shadow_shifts_completed: shadowCompleted,
        induction_completed: allComplete,
        induction_completion_date: allComplete ? format(new Date(), 'yyyy-MM-dd') : null,
        status: allComplete ? 'completed' : 'in_progress',
        probation_end_date: formData.induction_start_date ? 
          format(addWeeks(new Date(formData.induction_start_date), formData.probation_period_weeks), 'yyyy-MM-dd') : null
      };

      if (existingRecord) {
        return base44.entities.InductionRecord.update(existingRecord.id, data);
      } else {
        return base44.entities.InductionRecord.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['induction'] });
      toast.success("Saved", "Induction record updated");
      onComplete?.();
    }
  });

  const checklistProgress = (formData.induction_checklist.filter(c => c.completed).length / formData.induction_checklist.length) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-purple-600" />
          Induction & Competency Assessment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Shadow Shifts */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Shadow Shifts</h3>
            <Button size="sm" onClick={addShadowShift}>
              <Plus className="w-4 h-4 mr-1" />
              Add Shift
            </Button>
          </div>
          
          <div className="space-y-2">
            {formData.shadow_shift_records.map((shift, idx) => (
              <Card key={idx} className="border">
                <CardContent className="p-3 space-y-2">
                  <div className="grid md:grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs">Shift Date</Label>
                      <Input
                        type="date"
                        value={shift.shift_date}
                        onChange={(e) => updateShadowShift(idx, 'shift_date', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Shadowed Staff</Label>
                      <Input
                        value={shift.shadowed_staff}
                        onChange={(e) => updateShadowShift(idx, 'shadowed_staff', e.target.value)}
                        placeholder="Staff name"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Performance</Label>
                      <Select 
                        value={shift.performance_rating} 
                        onValueChange={(v) => updateShadowShift(idx, 'performance_rating', v)}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="excellent">Excellent</SelectItem>
                          <SelectItem value="good">Good</SelectItem>
                          <SelectItem value="satisfactory">Satisfactory</SelectItem>
                          <SelectItem value="needs_improvement">Needs Improvement</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Textarea
                    value={shift.feedback}
                    onChange={(e) => updateShadowShift(idx, 'feedback', e.target.value)}
                    placeholder="Feedback from shadow shift..."
                    rows={2}
                    className="text-sm"
                  />
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <Progress value={(formData.shadow_shift_records.length / formData.shadow_shifts_required) * 100} />
            <span>{formData.shadow_shift_records.length}/{formData.shadow_shifts_required}</span>
          </div>
        </div>

        {/* Induction Checklist */}
        <div className="space-y-3">
          <h3 className="font-semibold">Induction Checklist</h3>
          <Progress value={checklistProgress} className="mb-2" />
          <div className="space-y-2">
            {formData.induction_checklist.map((item, idx) => (
              <div 
                key={idx}
                className={`flex items-start gap-2 p-2 rounded ${item.completed ? 'bg-green-50' : 'bg-gray-50'}`}
              >
                <Checkbox
                  checked={item.completed}
                  onCheckedChange={() => toggleChecklistItem(idx)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <p className="text-sm">{item.item}</p>
                  {item.completed && item.completed_date && (
                    <p className="text-xs text-gray-500">
                      Completed: {format(new Date(item.completed_date), 'dd/MM/yyyy')}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Competency Assessment */}
        <div className="space-y-3 p-4 bg-blue-50 rounded">
          <h3 className="font-semibold">Competency Assessment</h3>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label>Assessment Result *</Label>
              <Select 
                value={formData.competency_assessment_result} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, competency_assessment_result: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="pass">Pass</SelectItem>
                  <SelectItem value="fail">Fail</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Assessment Date</Label>
              <Input
                type="date"
                value={formData.assessment_date || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, assessment_date: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <Label>Assessed By (Supervisor)</Label>
              <Input
                value={formData.assessed_by || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, assessed_by: e.target.value }))}
                placeholder="Name of supervisor"
              />
            </div>
          </div>
        </div>

        <Button 
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="w-full bg-purple-600"
        >
          {saveMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <CheckCircle className="w-4 h-4 mr-2" />
          )}
          Save Induction Record
        </Button>
      </CardContent>
    </Card>
  );
}