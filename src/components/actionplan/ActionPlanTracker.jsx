import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  CheckCircle, 
  Circle, 
  Clock,
  Camera,
  FileText,
  Upload,
  Trash2,
  User,
  Calendar,
  AlertCircle,
  Loader2
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { format, isPast } from "date-fns";

export default function ActionPlanTracker({ actionPlan, onUpdate }) {
  const [selectedAction, setSelectedAction] = useState(null);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [updateNotes, setUpdateNotes] = useState("");
  const [uploadingEvidence, setUploadingEvidence] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: staff = [] } = useQuery({
    queryKey: ['all-staff'],
    queryFn: async () => {
      const staffData = await base44.entities.Staff.list();
      const carerData = await base44.entities.Carer.list();
      return [...staffData, ...carerData];
    }
  });

  const updateActionPlanMutation = useMutation({
    mutationFn: (data) => base44.entities.ActionPlan.update(actionPlan.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['action-plans'] });
      toast.success("Updated", "Action plan updated successfully");
      onUpdate?.();
    },
    onError: () => {
      toast.error("Error", "Failed to update action plan");
    }
  });

  const getStaffName = (id) => {
    const person = staff.find(s => s.id === id);
    return person?.full_name || "Unknown";
  };

  const handleActionStatusChange = (actionIndex, newStatus) => {
    const updatedActions = [...(actionPlan.actions || [])];
    updatedActions[actionIndex] = {
      ...updatedActions[actionIndex],
      status: newStatus,
      completed_date: newStatus === 'completed' ? new Date().toISOString() : null
    };

    // Calculate overall progress
    const completedCount = updatedActions.filter(a => a.status === 'completed').length;
    const progressPercentage = updatedActions.length > 0 
      ? Math.round((completedCount / updatedActions.length) * 100)
      : 0;

    // Determine overall status
    let overallStatus = 'in_progress';
    if (progressPercentage === 100) {
      overallStatus = 'completed';
    } else if (progressPercentage === 0) {
      overallStatus = 'active';
    }

    updateActionPlanMutation.mutate({
      actions: updatedActions,
      progress_percentage: progressPercentage,
      status: overallStatus,
      actual_completion_date: progressPercentage === 100 ? format(new Date(), 'yyyy-MM-dd') : null
    });
  };

  const handleAddNote = (actionIndex) => {
    if (!updateNotes.trim()) {
      toast.error("Required", "Please enter a note");
      return;
    }

    const updatedActions = [...(actionPlan.actions || [])];
    const currentNotes = updatedActions[actionIndex].notes || "";
    const timestamp = format(new Date(), 'dd/MM/yyyy HH:mm');
    const newNote = `[${timestamp}] ${updateNotes}`;
    
    updatedActions[actionIndex] = {
      ...updatedActions[actionIndex],
      notes: currentNotes ? `${currentNotes}\n${newNote}` : newNote
    };

    updateActionPlanMutation.mutate(
      { actions: updatedActions },
      {
        onSuccess: () => {
          setUpdateNotes("");
          setShowUpdateDialog(false);
        }
      }
    );
  };

  const handleUploadEvidence = async (file, actionIndex) => {
    setUploadingEvidence(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      
      const newEvidence = {
        evidence_type: 'photo',
        description: `Evidence for: ${actionPlan.actions[actionIndex].action}`,
        file_url: result.file_url,
        uploaded_by: 'Current User',
        uploaded_date: new Date().toISOString()
      };

      const updatedEvidence = [...(actionPlan.evidence || []), newEvidence];
      updateActionPlanMutation.mutate({ evidence: updatedEvidence });
      
      toast.success("Uploaded", "Evidence photo uploaded successfully");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Upload Failed", "Failed to upload evidence photo");
    } finally {
      setUploadingEvidence(false);
    }
  };

  const handleDeleteEvidence = (evidenceIndex) => {
    const updatedEvidence = actionPlan.evidence.filter((_, i) => i !== evidenceIndex);
    updateActionPlanMutation.mutate({ evidence: updatedEvidence });
    toast.success("Deleted", "Evidence removed");
  };

  const actions = actionPlan.actions || [];
  const completedActions = actions.filter(a => a.status === 'completed').length;
  const progressPercentage = actionPlan.progress_percentage || 0;

  const statusConfig = {
    pending: { icon: Circle, color: 'text-gray-400', bg: 'bg-gray-100', label: 'Pending' },
    in_progress: { icon: Clock, color: 'text-blue-500', bg: 'bg-blue-100', label: 'In Progress' },
    completed: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-100', label: 'Completed' },
    overdue: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-100', label: 'Overdue' }
  };

  return (
    <div className="space-y-6">
      {/* Overall Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Action Plan Progress</span>
            <Badge className={
              progressPercentage === 100 ? 'bg-green-100 text-green-700' :
              progressPercentage > 0 ? 'bg-blue-100 text-blue-700' :
              'bg-gray-100 text-gray-700'
            }>
              {progressPercentage}% Complete
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Progress value={progressPercentage} className="h-3" />
            <div className="flex justify-between text-sm text-gray-600">
              <span>{completedActions} of {actions.length} actions completed</span>
              <span>Due: {format(new Date(actionPlan.target_completion_date), 'dd MMM yyyy')}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions List */}
      <Card>
        <CardHeader>
          <CardTitle>Action Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {actions.map((action, idx) => {
            const status = action.status || 'pending';
            const isOverdue = action.target_date && isPast(new Date(action.target_date)) && status !== 'completed';
            const config = statusConfig[isOverdue ? 'overdue' : status];
            const StatusIcon = config.icon;

            return (
              <div key={idx} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => {
                      const newStatus = status === 'completed' ? 'in_progress' : 
                                      status === 'in_progress' ? 'completed' : 'in_progress';
                      handleActionStatusChange(idx, newStatus);
                    }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${config.bg} hover:opacity-80 transition-opacity flex-shrink-0`}
                  >
                    <StatusIcon className={`w-5 h-5 ${config.color}`} />
                  </button>
                  <div className="flex-1">
                    <p className={`font-medium ${status === 'completed' ? 'line-through text-gray-500' : ''}`}>
                      {action.action}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-sm text-gray-600">
                      {action.responsible_person && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {getStaffName(action.responsible_person)}
                        </span>
                      )}
                      {action.target_date && (
                        <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
                          <Calendar className="w-3 h-3" />
                          {format(new Date(action.target_date), 'dd MMM yyyy')}
                        </span>
                      )}
                      <Badge className={config.bg + ' ' + config.color}>{config.label}</Badge>
                    </div>
                    
                    {action.notes && (
                      <div className="mt-2 p-2 bg-gray-50 rounded text-sm whitespace-pre-line">
                        {action.notes}
                      </div>
                    )}

                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedAction(idx);
                          setShowUpdateDialog(true);
                        }}
                      >
                        <FileText className="w-3 h-3 mr-1" />
                        Add Note
                      </Button>
                      <label className="relative">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={uploadingEvidence}
                          as="div"
                        >
                          {uploadingEvidence ? (
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          ) : (
                            <Camera className="w-3 h-3 mr-1" />
                          )}
                          Upload Evidence
                        </Button>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUploadEvidence(file, idx);
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Evidence Gallery */}
      {actionPlan.evidence && actionPlan.evidence.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Evidence ({actionPlan.evidence.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {actionPlan.evidence.map((evidence, idx) => (
                <div key={idx} className="relative group">
                  <img
                    src={evidence.file_url}
                    alt={evidence.description}
                    className="w-full h-32 object-cover rounded-lg border"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteEvidence(idx)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-600 mt-1 truncate">{evidence.description}</p>
                  <p className="text-xs text-gray-500">
                    {format(new Date(evidence.uploaded_date), 'dd/MM/yyyy')}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Note Dialog */}
      <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Progress Note</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label>Note</Label>
            <Textarea
              value={updateNotes}
              onChange={(e) => setUpdateNotes(e.target.value)}
              placeholder="Enter progress update or notes..."
              rows={4}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpdateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => handleAddNote(selectedAction)}>
              Add Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}