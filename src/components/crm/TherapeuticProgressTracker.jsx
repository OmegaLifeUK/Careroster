import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Plus, Target, TrendingUp, CheckCircle, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { format } from "date-fns";

export default function TherapeuticProgressTracker({ caseId }) {
  const [showObjectiveForm, setShowObjectiveForm] = useState(false);
  const [newObjective, setNewObjective] = useState({ title: "", description: "", target_date: "" });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: sessions = [] } = useQuery({
    queryKey: ['case-sessions', caseId],
    queryFn: () => base44.entities.CaseSession.filter({ case_id: caseId }, '-session_date'),
  });

  const addObjectiveMutation = useMutation({
    mutationFn: async (objective) => {
      const caseData = await base44.entities.Case.filter({ id: caseId });
      const existingObjectives = caseData[0]?.therapeutic_objectives || [];
      
      return await base44.entities.Case.update(caseId, {
        therapeutic_objectives: [...existingObjectives, {
          id: Date.now().toString(),
          ...objective,
          status: 'active',
          progress: 0,
          created_date: new Date().toISOString()
        }]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case-detail', caseId] });
      toast.success("Success", "Objective added successfully");
      setNewObjective({ title: "", description: "", target_date: "" });
      setShowObjectiveForm(false);
    },
  });

  const updateProgressMutation = useMutation({
    mutationFn: async ({ objectiveId, progress }) => {
      const caseData = await base44.entities.Case.filter({ id: caseId });
      const objectives = caseData[0]?.therapeutic_objectives || [];
      const updated = objectives.map(obj => 
        obj.id === objectiveId ? { ...obj, progress, status: progress >= 100 ? 'achieved' : 'active' } : obj
      );
      
      return await base44.entities.Case.update(caseId, {
        therapeutic_objectives: updated
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case-detail', caseId] });
    },
  });

  const { data: caseData } = useQuery({
    queryKey: ['case-detail', caseId],
    queryFn: async () => {
      const cases = await base44.entities.Case.filter({ id: caseId });
      return cases[0];
    },
  });

  const objectives = caseData?.therapeutic_objectives || [];
  const attendanceRate = sessions.length > 0 
    ? (sessions.filter(s => s.attendance_status === 'attended').length / sessions.length) * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Sessions</p>
                <p className="text-2xl font-bold">{sessions.length}</p>
              </div>
              <Target className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Attendance Rate</p>
                <p className="text-2xl font-bold">{attendanceRate.toFixed(0)}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Objectives Achieved</p>
                <p className="text-2xl font-bold">
                  {objectives.filter(o => o.status === 'achieved').length}/{objectives.length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Therapeutic Objectives */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" />
              Therapeutic Objectives
            </CardTitle>
            <Button onClick={() => setShowObjectiveForm(!showObjectiveForm)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Objective
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showObjectiveForm && (
            <div className="p-4 border rounded-lg bg-blue-50">
              <h4 className="font-semibold mb-3">New Objective</h4>
              <div className="space-y-3">
                <Input
                  placeholder="Objective title"
                  value={newObjective.title}
                  onChange={(e) => setNewObjective({...newObjective, title: e.target.value})}
                />
                <Textarea
                  placeholder="Description and success criteria"
                  value={newObjective.description}
                  onChange={(e) => setNewObjective({...newObjective, description: e.target.value})}
                  rows={3}
                />
                <Input
                  type="date"
                  placeholder="Target date"
                  value={newObjective.target_date}
                  onChange={(e) => setNewObjective({...newObjective, target_date: e.target.value})}
                />
                <div className="flex gap-2">
                  <Button 
                    onClick={() => addObjectiveMutation.mutate(newObjective)}
                    disabled={!newObjective.title || addObjectiveMutation.isPending}
                    size="sm"
                  >
                    Save Objective
                  </Button>
                  <Button variant="outline" onClick={() => setShowObjectiveForm(false)} size="sm">
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          {objectives.map((obj) => (
            <div key={obj.id} className="p-4 border rounded-lg">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="font-semibold">{obj.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{obj.description}</p>
                </div>
                <Badge className={obj.status === 'achieved' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                  {obj.status}
                </Badge>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Progress</span>
                  <span className="font-medium">{obj.progress}%</span>
                </div>
                <Progress value={obj.progress} className="h-2" />
                
                {obj.status !== 'achieved' && (
                  <div className="flex gap-2 mt-3">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => updateProgressMutation.mutate({ objectiveId: obj.id, progress: Math.min(obj.progress + 25, 100) })}
                    >
                      +25%
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => updateProgressMutation.mutate({ objectiveId: obj.id, progress: 100 })}
                    >
                      Mark Complete
                    </Button>
                  </div>
                )}
              </div>

              {obj.target_date && (
                <p className="text-xs text-gray-500 mt-3">
                  Target: {format(new Date(obj.target_date), 'MMM d, yyyy')}
                </p>
              )}
            </div>
          ))}

          {objectives.length === 0 && !showObjectiveForm && (
            <p className="text-sm text-gray-500 text-center py-8">
              No therapeutic objectives set yet
            </p>
          )}
        </CardContent>
      </Card>

      {/* Recent Sessions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Sessions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {sessions.slice(0, 5).map((session) => (
            <div key={session.id} className="p-3 border rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-medium">{session.session_type?.replace(/_/g, ' ')}</p>
                  <p className="text-sm text-gray-600">{format(new Date(session.session_date), 'MMM d, yyyy')}</p>
                </div>
                <Badge className={
                  session.attendance_status === 'attended' ? 'bg-green-100 text-green-800' :
                  session.attendance_status === 'did_not_attend' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }>
                  {session.attendance_status?.replace(/_/g, ' ')}
                </Badge>
              </div>
              {session.progress_indicators && (
                <p className="text-sm text-gray-700 mt-2">{session.progress_indicators}</p>
              )}
              {session.safeguarding_concerns && (
                <div className="flex items-center gap-2 mt-2 text-red-600">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm font-medium">Safeguarding concerns noted</span>
                </div>
              )}
            </div>
          ))}
          {sessions.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-8">No sessions recorded yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}