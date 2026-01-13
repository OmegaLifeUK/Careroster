import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  CheckCircle, 
  XCircle, 
  Edit,
  Loader2,
  AlertTriangle,
  Sparkles
} from "lucide-react";
import { useToast } from "@/components/ui/toast";

export default function AICarePlanApproval({ carePlan, client, onClose, onApprove }) {
  const [pendingData, setPendingData] = useState(() => {
    try {
      const stored = JSON.parse(carePlan.last_reviewed_by || '{}');
      return stored.pending_approval || {};
    } catch {
      return {};
    }
  });
  
  const [sectionStatus, setSectionStatus] = useState({
    outcomes: 'pending',
    interventions: 'pending',
    risks: 'pending',
    medications: 'pending'
  });
  
  const [editingSection, setEditingSection] = useState(null);
  const [editData, setEditData] = useState(null);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const acceptSection = (section) => {
    setSectionStatus(prev => ({ ...prev, [section]: 'accepted' }));
  };

  const rejectSection = (section) => {
    setSectionStatus(prev => ({ ...prev, [section]: 'rejected' }));
    setPendingData(prev => ({ ...prev, [section]: [] }));
  };

  const startEdit = (section) => {
    setEditingSection(section);
    setEditData(JSON.parse(JSON.stringify(pendingData[section] || [])));
  };

  const saveEdit = () => {
    setPendingData(prev => ({ ...prev, [editingSection]: editData }));
    setSectionStatus(prev => ({ ...prev, [editingSection]: 'edited' }));
    setEditingSection(null);
    setEditData(null);
  };

  const approvalMutation = useMutation({
    mutationFn: async () => {
      const currentUser = await base44.auth.me().catch(() => null);
      const results = { tasks: [], medications: [], risks: [] };

      // Create Care Tasks from accepted interventions
      if (sectionStatus.interventions === 'accepted' || sectionStatus.interventions === 'edited') {
        for (const intervention of pendingData.interventions || []) {
          try {
            const taskType = mapNeedAreaToTaskType(intervention.need_area);
            const created = await base44.entities.CareTask.create({
              client_id: client.id,
              care_plan_id: carePlan.id,
              task_title: intervention.need_area || intervention.support_required || 'Care Task',
              task_description: intervention.support_required || '',
              task_type: taskType,
              task_category: taskType,
              priority_level: 'medium',
              frequency: mapFrequencyToEnum(intervention.frequency),
              scheduled_date: new Date().toISOString().split('T')[0],
              scheduled_time: '',
              duration_estimate_minutes: 30,
              location: 'home'
            });
            results.tasks.push(created);
          } catch (err) {
            console.error('Task creation error:', err);
            console.error('Failed intervention data:', intervention);
          }
        }
      }

      // Create MAR Sheets from accepted medications
      if (sectionStatus.medications === 'accepted' || sectionStatus.medications === 'edited') {
        for (const med of pendingData.medications || []) {
          try {
            const created = await base44.entities.MARSheet.create({
              client_id: client.id,
              medication_name: med.name,
              dose: med.dose,
              frequency: med.frequency,
              route: med.route || 'oral',
              reason_for_medication: med.purpose || '',
              special_instructions: med.special_instructions || '',
              month_year: new Date().toISOString().substring(0, 7),
              status: 'active'
            });
            results.medications.push(created);
          } catch (err) {
            console.error('Medication creation error:', err);
          }
        }
      }

      // Create Risk Assessments from accepted risks
      if (sectionStatus.risks === 'accepted' || sectionStatus.risks === 'edited') {
        for (const risk of pendingData.risks || []) {
          try {
            const created = await base44.entities.RiskAssessment.create({
              client_id: client.id,
              assessment_type: categorizeRisk(risk.risk),
              assessment_date: new Date().toISOString().split('T')[0],
              assessed_by: currentUser?.full_name || 'System',
              risk_level: calculateRiskLevel(risk.likelihood, risk.impact)
            });
            results.risks.push(created);
          } catch (err) {
            console.error('Risk creation error:', err);
          }
        }
      }

      // Update care plan objectives
      const objectives = (pendingData.outcomes || []).map(outcome => ({
        objective: outcome.outcome,
        outcome_measures: outcome.measures || '',
        target_date: outcome.timeframe || '',
        status: 'not_started'
      }));

      await base44.entities.CarePlan.update(carePlan.id, {
        status: 'active',
        care_objectives: objectives,
        last_reviewed_date: new Date().toISOString().split('T')[0],
        last_reviewed_by: currentUser?.full_name || 'System'
      });

      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['care-plans'] });
      queryClient.invalidateQueries({ queryKey: ['care-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['mar-sheets'] });
      queryClient.invalidateQueries({ queryKey: ['risk-assessments'] });
      
      toast.success(
        'Care Plan Approved',
        `Created ${results.tasks.length} tasks, ${results.medications.length} medications, ${results.risks.length} risks`
      );
      
      onApprove?.(results);
      onClose();
    },
    onError: (error) => {
      console.error('Approval error:', error);
      toast.error('Approval Failed', error?.message || 'Unable to approve care plan');
    }
  });

  const allSectionsReviewed = Object.values(sectionStatus).every(s => s !== 'pending');
  const anyAccepted = Object.values(sectionStatus).some(s => s === 'accepted' || s === 'edited');

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Review AI-Generated Care Plan
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              <strong>⚠️ Human Review Required:</strong> Review each section below. You can accept, edit, or reject individual sections before approving.
            </p>
          </div>

          <Tabs defaultValue="outcomes" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="outcomes" className="flex items-center gap-2">
                Outcomes
                <StatusBadge status={sectionStatus.outcomes} />
              </TabsTrigger>
              <TabsTrigger value="interventions" className="flex items-center gap-2">
                Interventions
                <StatusBadge status={sectionStatus.interventions} />
              </TabsTrigger>
              <TabsTrigger value="medications" className="flex items-center gap-2">
                Medications
                <StatusBadge status={sectionStatus.medications} />
              </TabsTrigger>
              <TabsTrigger value="risks" className="flex items-center gap-2">
                Risks
                <StatusBadge status={sectionStatus.risks} />
              </TabsTrigger>
            </TabsList>

            <TabsContent value="outcomes" className="space-y-3 mt-4">
              <SectionActions
                section="outcomes"
                status={sectionStatus.outcomes}
                onAccept={() => acceptSection('outcomes')}
                onReject={() => rejectSection('outcomes')}
                onEdit={() => startEdit('outcomes')}
              />
              {pendingData.outcomes?.map((outcome, idx) => (
                <Card key={idx}>
                  <CardContent className="p-4">
                    <p className="font-medium">{outcome.outcome}</p>
                    <p className="text-sm text-gray-600 mt-1">Measures: {outcome.measures}</p>
                    <p className="text-xs text-gray-500 mt-1">Timeframe: {outcome.timeframe}</p>
                  </CardContent>
                </Card>
              ))}
              {(!pendingData.outcomes || pendingData.outcomes.length === 0) && (
                <p className="text-sm text-gray-500 text-center py-8">No outcomes generated</p>
              )}
            </TabsContent>

            <TabsContent value="interventions" className="space-y-3 mt-4">
              <SectionActions
                section="interventions"
                status={sectionStatus.interventions}
                onAccept={() => acceptSection('interventions')}
                onReject={() => rejectSection('interventions')}
                onEdit={() => startEdit('interventions')}
              />
              {pendingData.interventions?.map((intervention, idx) => (
                <Card key={idx}>
                  <CardContent className="p-4">
                    <p className="font-medium">{intervention.need_area}</p>
                    <p className="text-sm text-gray-600 mt-1">{intervention.support_required}</p>
                    <div className="flex gap-4 mt-2 text-xs text-gray-500">
                      <span>Frequency: {intervention.frequency}</span>
                      <span>Responsible: {intervention.responsible}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {(!pendingData.interventions || pendingData.interventions.length === 0) && (
                <p className="text-sm text-gray-500 text-center py-8">No interventions generated</p>
              )}
            </TabsContent>

            <TabsContent value="medications" className="space-y-3 mt-4">
              <SectionActions
                section="medications"
                status={sectionStatus.medications}
                onAccept={() => acceptSection('medications')}
                onReject={() => rejectSection('medications')}
                onEdit={() => startEdit('medications')}
              />
              {pendingData.medications?.map((med, idx) => (
                <Card key={idx}>
                  <CardContent className="p-4">
                    <p className="font-medium">{med.name} - {med.dose}</p>
                    <div className="flex gap-4 mt-2 text-sm text-gray-600">
                      <span>Route: {med.route}</span>
                      <span>Frequency: {med.frequency}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Purpose: {med.purpose}</p>
                  </CardContent>
                </Card>
              ))}
              {(!pendingData.medications || pendingData.medications.length === 0) && (
                <p className="text-sm text-gray-500 text-center py-8">No medications generated</p>
              )}
            </TabsContent>

            <TabsContent value="risks" className="space-y-3 mt-4">
              <SectionActions
                section="risks"
                status={sectionStatus.risks}
                onAccept={() => acceptSection('risks')}
                onReject={() => rejectSection('risks')}
                onEdit={() => startEdit('risks')}
              />
              {pendingData.risks?.map((risk, idx) => (
                <Card key={idx}>
                  <CardContent className="p-4">
                    <p className="font-medium">{risk.risk}</p>
                    <div className="flex gap-3 mt-2">
                      <Badge variant="outline">Likelihood: {risk.likelihood}</Badge>
                      <Badge variant="outline">Impact: {risk.impact}</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">Mitigation: {risk.mitigation}</p>
                  </CardContent>
                </Card>
              ))}
              {(!pendingData.risks || pendingData.risks.length === 0) && (
                <p className="text-sm text-gray-500 text-center py-8">No risks generated</p>
              )}
            </TabsContent>
          </Tabs>

          {pendingData.flags?.safeguarding_indicators?.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-red-800 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Safeguarding Indicators Flagged
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                  {pendingData.flags.safeguarding_indicators.map((flag, i) => (
                    <li key={i}>{flag}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-between items-center pt-4 border-t">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              onClick={() => approvalMutation.mutate()}
              disabled={!allSectionsReviewed || !anyAccepted || approvalMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {approvalMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Records...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve & Create Records
                </>
              )}
            </Button>
          </div>
        </div>

        {editingSection && (
          <EditSectionDialog
            section={editingSection}
            data={editData}
            onChange={setEditData}
            onSave={saveEdit}
            onCancel={() => { setEditingSection(null); setEditData(null); }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function StatusBadge({ status }) {
  if (status === 'accepted') return <CheckCircle className="w-4 h-4 text-green-600" />;
  if (status === 'rejected') return <XCircle className="w-4 h-4 text-red-600" />;
  if (status === 'edited') return <Edit className="w-4 h-4 text-blue-600" />;
  return <div className="w-2 h-2 bg-gray-400 rounded-full" />;
}

function SectionActions({ section, status, onAccept, onReject, onEdit }) {
  if (status === 'accepted' || status === 'rejected' || status === 'edited') {
    return (
      <div className="flex gap-2 mb-2">
        <Badge className={status === 'accepted' || status === 'edited' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
          {status === 'edited' ? 'Edited & Accepted' : status}
        </Badge>
        <Button size="sm" variant="outline" onClick={onEdit}>
          <Edit className="w-3 h-3 mr-1" />
          Edit Again
        </Button>
      </div>
    );
  }

  return (
    <div className="flex gap-2 mb-2">
      <Button size="sm" onClick={onAccept} className="bg-green-600 hover:bg-green-700">
        <CheckCircle className="w-3 h-3 mr-1" />
        Accept
      </Button>
      <Button size="sm" variant="outline" onClick={onEdit}>
        <Edit className="w-3 h-3 mr-1" />
        Edit
      </Button>
      <Button size="sm" variant="outline" onClick={onReject} className="text-red-600">
        <XCircle className="w-3 h-3 mr-1" />
        Reject
      </Button>
    </div>
  );
}

function EditSectionDialog({ section, data, onChange, onSave, onCancel }) {
  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit {section}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Textarea
            value={JSON.stringify(data, null, 2)}
            onChange={(e) => {
              try {
                onChange(JSON.parse(e.target.value));
              } catch {}
            }}
            rows={20}
            className="font-mono text-sm"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onCancel}>Cancel</Button>
            <Button onClick={onSave} className="bg-blue-600 hover:bg-blue-700">
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Helper functions
function mapNeedAreaToTaskType(needArea) {
  const lower = (needArea || '').toLowerCase();
  if (lower.includes('personal') || lower.includes('hygiene') || lower.includes('care')) return 'personal_care';
  if (lower.includes('medication') || lower.includes('medicine')) return 'medication';
  if (lower.includes('nutrition') || lower.includes('meal') || lower.includes('food')) return 'nutrition_meals';
  if (lower.includes('mobility') || lower.includes('movement')) return 'mobility_support';
  if (lower.includes('clinical') || lower.includes('health')) return 'clinical_support';
  if (lower.includes('emotional') || lower.includes('social')) return 'emotional_support';
  if (lower.includes('domestic') || lower.includes('cleaning')) return 'domestic_support';
  return 'personal_care';
}

function mapFrequencyToEnum(freq) {
  const lower = (freq || '').toLowerCase();
  if (lower.includes('daily') || lower.includes('day')) return 'daily';
  if (lower.includes('week')) return 'weekly';
  return 'custom';
}

function categorizeRisk(riskDescription) {
  const lower = (riskDescription || '').toLowerCase();
  if (lower.includes('fall')) return 'falls';
  if (lower.includes('chok')) return 'choking';
  if (lower.includes('pressure') || lower.includes('skin')) return 'pressure_ulcer';
  if (lower.includes('safeguard')) return 'safeguarding';
  if (lower.includes('fire')) return 'fire';
  if (lower.includes('medication')) return 'medication';
  return 'general';
}

function calculateRiskLevel(likelihood, impact) {
  const scores = { low: 1, medium: 2, high: 3 };
  const total = (scores[likelihood] || 1) * (scores[impact] || 1);
  if (total >= 6) return 'critical';
  if (total >= 4) return 'high';
  if (total >= 2) return 'medium';
  return 'low';
}