import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Target, Plus, TrendingUp, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/components/ui/toast";

export default function TherapeuticProgressTracker({ caseId }) {
  const [showObjectiveForm, setShowObjectiveForm] = useState(false);
  const [newObjective, setNewObjective] = useState({
    objective_title: "",
    objective_description: "",
    target_date: "",
    progress_percentage: 0,
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: sessions = [] } = useQuery({
    queryKey: ['case-sessions', caseId],
    queryFn: () => base44.entities.CaseSession.filter({ case_id: caseId }),
  });

  // Store objectives in case notes for now
  const { data: objectives = [] } = useQuery({
    queryKey: ['case-objectives', caseId],
    queryFn: async () => {
      const caseRecord = await base44.entities.Case.filter({ id: caseId });
      if (caseRecord[0]?.objectives) {
        return caseRecord[0].objectives;
      }
      return [];
    },
  });

  const addObjectiveMutation = useMutation({
    mutationFn: async (objective) => {
      const caseRecord = await base44.entities.Case.filter({ id: caseId });
      const existingObjectives = caseRecord[0]?.objectives || [];
      
      return await base44.entities.Case.update(caseId, {
        objectives: [...existingObjectives, { ...objective, id: Date.now(), created_date: new Date().toISOString() }]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case-objectives', caseId] });
      toast.success("Objective Added", "Therapeutic objective has been set");
      setShowObjectiveForm(false);
      setNewObjective({ objective_title: "", objective_description: "", target_date: "", progress_percentage: 0 });
    },
  });

  const updateProgressMutation = useMutation({
    mutationFn: async ({ objectiveId, progress }) => {
      const caseRecord = await base44.entities.Case.filter({ id: caseId });
      const objectives = caseRecord[0]?.objectives || [];
      const updated = objectives.map(obj => 
        obj.id === objectiveId ? { ...obj, progress_percentage: progress } : obj
      );
      
      return await base44.entities.Case.update(caseId, { objectives: updated });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case-objectives', caseId] });
      toast.success("Progress Updated", "Objective progress has been updated");
    },
  });

  const recentSessions = sessions.slice(0, 5);
  const attendanceRate = sessions.length > 0 
    ? (sessions.filter(s => s.attendance_status === 'attended').length / sessions.length) * 100 
    : 0;

  return (
    <div className="space-y-4">
      {/* Progress Overview */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-6 h-6 mx-auto text-blue-600 mb-2" />
            <p className="text-2xl font-bold">{sessions.length}</p>
            <p className="text-xs text-gray-600">Total Sessions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="w-6 h-6 mx-auto text-green-600 mb-2" />
            <p className="text-2xl font-bold">{attendanceRate.toFixed(0)}%</p>
            <p className="text-xs text-gray-600">Attendance Rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Target className="w-6 h-6 mx-auto text-purple-600 mb-2" />
            <p className="text-2xl font-bold">{objectives.length}</p>
            <p className="text-xs text-gray-600">Active Objectives</p>
          </CardContent>
        </Card>
      </div>

      {/* Objectives */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Therapeutic Objectives
            </CardTitle>
            <Button size="sm" onClick={() => setShowObjectiveForm(!showObjectiveForm)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Objective
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showObjectiveForm && (
            <div className="p-4 border rounded-lg bg-gray-50 space-y-3">
              <Input
                placeholder="Objective title"
                value={newObjective.objective_title}
                onChange={(e) => setNewObjective({...newObjective, objective_title: e.target.value})}
              />
              <Textarea
                placeholder="Objective description"
                value={newObjective.objective_description}
                onChange={(e) => setNewObjective({...newObjective, objective_description: e.target.value})}
                rows={3}
              />
              <Input
                type="date"
                value={newObjective.target_date}
                onChange={(e) => setNewObjective({...newObjective, target_date: e.target.value})}
              />
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={() => addObjectiveMutation.mutate(newObjective)}
                  disabled={!newObjective.objective_title}
                >
                  Save Objective
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowObjectiveForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {objectives.map((obj) => (
            <div key={obj.id} className="p-4 border rounded-lg">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold">{obj.objective_title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{obj.objective_description}</p>
                  {obj.target_date && (
                    <p className="text-xs text-gray-500 mt-2">
                      Target: {format(new Date(obj.target_date), 'MMM d, yyyy')}
                    </p>
                  )}
                </div>
                <Badge className={obj.progress_percentage >= 100 ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                  {obj.progress_percentage}%
                </Badge>
              </div>
              <div className="space-y-2">
                <Progress value={obj.progress_percentage} className="h-2" />
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="10"
                    value={obj.progress_percentage}
                    onChange={(e) => updateProgressMutation.mutate({ 
                      objectiveId: obj.id, 
                      progress: parseInt(e.target.value) 
                    })}
                    className="flex-1"
                  />
                  <span className="text-sm text-gray-600 w-12">{obj.progress_percentage}%</span>
                </div>
              </div>
            </div>
          ))}

          {objectives.length === 0 && !showObjectiveForm && (
            <p className="text-center text-gray-500 py-4">No objectives set yet</p>
          )}
        </CardContent>
      </Card>

      {/* Recent Sessions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentSessions.map((session) => (
              <div key={session.id} className="p-3 border rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium">{session.session_type?.replace(/_/g, ' ')}</p>
                    <p className="text-sm text-gray-600">{session.practitioner_name}</p>
                  </div>
                  <Badge className={
                    session.attendance_status === 'attended' ? 'bg-green-100 text-green-800' :
                    session.attendance_status === 'did_not_attend' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }>
                    {session.attendance_status?.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500">
                  {format(new Date(session.session_date), 'MMM d, yyyy')}
                </p>
                {session.progress_indicators && (
                  <p className="text-sm text-gray-700 mt-2">{session.progress_indicators}</p>
                )}
              </div>
            ))}
            {recentSessions.length === 0 && (
              <p className="text-center text-gray-500 py-4">No sessions recorded yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}