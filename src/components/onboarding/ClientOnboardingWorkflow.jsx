import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  CheckCircle, 
  Circle, 
  UserCircle, 
  FileText,
  Heart,
  Upload,
  Loader2,
  Shield
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { format } from "date-fns";

export default function ClientOnboardingWorkflow({ clientId, clientName, onClose }) {
  const [activeStage, setActiveStage] = useState("consent");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: consent } = useQuery({
    queryKey: ['consent-capacity', clientId],
    queryFn: async () => {
      const records = await base44.entities.ConsentAndCapacity.filter({ client_id: clientId });
      return records[0] || null;
    }
  });

  const { data: assessment } = useQuery({
    queryKey: ['care-assessment', clientId],
    queryFn: async () => {
      const records = await base44.entities.CareAssessment.filter({ client_id: clientId });
      return records[0] || null;
    }
  });

  const { data: carePlans = [] } = useQuery({
    queryKey: ['care-plans-onboarding', clientId],
    queryFn: async () => {
      const plans = await base44.entities.CarePlan.filter({ client_id: clientId });
      return Array.isArray(plans) ? plans : [];
    }
  });

  const approvedCarePlan = carePlans.find(cp => cp.status === 'active');

  const calculateStatus = () => {
    const checks = {
      consent: consent?.status === 'obtained',
      assessment: assessment?.status === 'completed' || assessment?.status === 'approved',
      carePlan: !!approvedCarePlan
    };

    const completed = Object.values(checks).filter(Boolean).length;
    const percentage = Math.round((completed / 3) * 100);
    const allComplete = completed === 3;

    return { checks, completed, percentage, allComplete };
  };

  const status = calculateStatus();

  const activateClientMutation = useMutation({
    mutationFn: async () => {
      // Find and update the client
      try {
        const clients = await base44.entities.Client.filter({ id: clientId });
        if (clients && clients.length > 0) {
          await base44.entities.Client.update(clientId, { 
            status: 'active',
            onboarding_completed_date: format(new Date(), 'yyyy-MM-dd')
          });
        }
      } catch (e) {
        // Try other client types
        try {
          const domClients = await base44.entities.DomCareClient.filter({ id: clientId });
          if (domClients && domClients.length > 0) {
            await base44.entities.DomCareClient.update(clientId, { 
              client_status: 'active',
              onboarding_completed_date: format(new Date(), 'yyyy-MM-dd')
            });
          }
        } catch (e2) {}
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success("Activated", "Client onboarding complete - now active");
      onClose?.();
    }
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <UserCircle className="w-5 h-5 text-purple-600" />
              Client Onboarding: {clientName}
            </CardTitle>
            <Button variant="ghost" onClick={onClose}>×</Button>
          </div>
        </CardHeader>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Onboarding Progress</h3>
                <span className="text-2xl font-bold text-blue-700">{status.percentage}%</span>
              </div>
              <Progress value={status.percentage} className="h-2" />
            </CardContent>
          </Card>

          {status.allComplete && (
            <Card className="border-green-300 bg-green-50">
              <CardContent className="p-4 flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-green-900">All Onboarding Complete</p>
                  <p className="text-sm text-green-700">Client can now be activated</p>
                </div>
                <Button 
                  onClick={() => activateClientMutation.mutate()}
                  disabled={activateClientMutation.isPending}
                  className="bg-green-600"
                >
                  Activate Client
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Stage 1: Consent & Capacity */}
          <Card className={status.checks.consent ? 'border-green-300' : 'border-gray-200'}>
            <CardHeader className="cursor-pointer" onClick={() => setActiveStage("consent")}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {status.checks.consent ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-300" />
                  )}
                  <span className="font-medium">1. Consent & Mental Capacity</span>
                </div>
                <Badge className={status.checks.consent ? 'bg-green-600' : 'bg-gray-400'}>
                  {status.checks.consent ? 'Complete' : 'Pending'}
                </Badge>
              </div>
            </CardHeader>
            {activeStage === "consent" && (
              <CardContent>
                <ConsentForm 
                  clientId={clientId} 
                  existingRecord={consent}
                  onComplete={() => setActiveStage("assessment")}
                />
              </CardContent>
            )}
          </Card>

          {/* Stage 2: Care Assessment */}
          <Card className={status.checks.assessment ? 'border-green-300' : 'border-gray-200'}>
            <CardHeader className="cursor-pointer" onClick={() => setActiveStage("assessment")}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {status.checks.assessment ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-300" />
                  )}
                  <span className="font-medium">2. Care Assessment</span>
                </div>
                <Badge className={status.checks.assessment ? 'bg-green-600' : 'bg-gray-400'}>
                  {status.checks.assessment ? 'Complete' : 'Pending'}
                </Badge>
              </div>
            </CardHeader>
            {activeStage === "assessment" && (
              <CardContent>
                <AssessmentForm 
                  clientId={clientId} 
                  existingRecord={assessment}
                  onComplete={() => setActiveStage("careplan")}
                />
              </CardContent>
            )}
          </Card>

          {/* Stage 3: Care Plan */}
          <Card className={status.checks.carePlan ? 'border-green-300' : 'border-gray-200'}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {status.checks.carePlan ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-300" />
                  )}
                  <span className="font-medium">3. Care Plan</span>
                </div>
                <Badge className={status.checks.carePlan ? 'bg-green-600' : 'bg-gray-400'}>
                  {status.checks.carePlan ? 'Approved' : 'Required'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-2">
                Create care plan from the client profile page using the Care Plan Manager
              </p>
              {approvedCarePlan && (
                <div className="p-3 bg-green-50 rounded flex items-center gap-2">
                  <Heart className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-800">
                    Care plan approved on {format(new Date(approvedCarePlan.assessment_date), 'dd/MM/yyyy')}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </Card>
    </div>
  );
}

// Consent Form Component
function ConsentForm({ clientId, existingRecord, onComplete }) {
  const [formData, setFormData] = useState(existingRecord || {
    client_id: clientId,
    mental_capacity_assessed: false,
    consent_types: [],
    status: 'pending',
    gdpr_compliance: {}
  });
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleFileUpload = async (file) => {
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, consent_form_url: file_url }));
      toast.success("Uploaded", "Consent form uploaded");
    } catch (error) {
      toast.error("Upload Failed", error.message);
    } finally {
      setUploading(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const data = {
        ...formData,
        status: 'obtained',
        consent_date: formData.consent_date || format(new Date(), 'yyyy-MM-dd')
      };

      if (existingRecord) {
        return base44.entities.ConsentAndCapacity.update(existingRecord.id, data);
      } else {
        return base44.entities.ConsentAndCapacity.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consent-capacity'] });
      toast.success("Saved", "Consent recorded");
      onComplete?.();
    }
  });

  const toggleConsentType = (type) => {
    setFormData(prev => ({
      ...prev,
      consent_types: prev.consent_types.includes(type)
        ? prev.consent_types.filter(t => t !== type)
        : [...prev.consent_types, type]
    }));
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Mental Capacity Assessment</Label>
        <div className="mt-2 space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={formData.mental_capacity_assessed}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, mental_capacity_assessed: checked }))}
            />
            <Label>Mental capacity assessment completed</Label>
          </div>
          {formData.mental_capacity_assessed && (
            <Select 
              value={formData.mental_capacity_outcome} 
              onValueChange={(v) => setFormData(prev => ({ ...prev, mental_capacity_outcome: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select outcome" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="has_capacity">Has Capacity</SelectItem>
                <SelectItem value="lacks_capacity">Lacks Capacity</SelectItem>
                <SelectItem value="fluctuating_capacity">Fluctuating Capacity</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <Label>Consent Given By *</Label>
          <Input
            value={formData.consent_given_by || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, consent_given_by: e.target.value }))}
            placeholder="Name"
          />
        </div>
        <div>
          <Label>Relationship *</Label>
          <Select 
            value={formData.consent_relationship} 
            onValueChange={(v) => setFormData(prev => ({ ...prev, consent_relationship: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="self">Self (Client)</SelectItem>
              <SelectItem value="lasting_power_of_attorney">LPA (Health & Welfare)</SelectItem>
              <SelectItem value="court_deputy">Court Deputy</SelectItem>
              <SelectItem value="imca">IMCA</SelectItem>
              <SelectItem value="next_of_kin">Next of Kin</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>Consent Types *</Label>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {["care_provision", "data_processing", "information_sharing", "photography", "medical_treatment", "personal_care"].map(type => (
            <div key={type} className="flex items-center space-x-2">
              <Checkbox
                checked={formData.consent_types.includes(type)}
                onCheckedChange={() => toggleConsentType(type)}
              />
              <Label className="text-sm capitalize">{type.replace(/_/g, ' ')}</Label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Label>Signed Consent Form</Label>
        {formData.consent_form_url ? (
          <div className="flex items-center gap-2 text-green-700 mt-1">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm">Uploaded</span>
          </div>
        ) : (
          <label className="cursor-pointer block mt-1">
            <div className="border-2 border-dashed rounded p-4 text-center hover:bg-gray-50">
              <Upload className="w-6 h-6 mx-auto text-gray-400 mb-1" />
              <p className="text-sm text-gray-600">Upload Consent Form</p>
            </div>
            <input
              type="file"
              className="hidden"
              onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0])}
            />
          </label>
        )}
      </div>

      <Button 
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending || uploading}
        className="w-full bg-blue-600"
      >
        {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
        Save Consent Record
      </Button>
    </div>
  );
}

// Assessment Form Component
function AssessmentForm({ clientId, existingRecord, onComplete }) {
  const [formData, setFormData] = useState(existingRecord || {
    client_id: clientId,
    assessment_type: 'initial',
    assessment_date: format(new Date(), 'yyyy-MM-dd'),
    status: 'draft'
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: async () => {
      const user = await base44.auth.me();
      const data = {
        ...formData,
        assessment_completed_by: formData.assessment_completed_by || user.full_name,
        status: 'completed'
      };

      if (existingRecord) {
        return base44.entities.CareAssessment.update(existingRecord.id, data);
      } else {
        return base44.entities.CareAssessment.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['care-assessment'] });
      toast.success("Saved", "Care assessment completed");
      onComplete?.();
    }
  });

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <Label>Assessment Date *</Label>
          <Input
            type="date"
            value={formData.assessment_date}
            onChange={(e) => setFormData(prev => ({ ...prev, assessment_date: e.target.value }))}
          />
        </div>
        <div>
          <Label>Completed By *</Label>
          <Input
            value={formData.assessment_completed_by || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, assessment_completed_by: e.target.value }))}
            placeholder="Assessor name"
          />
        </div>
      </div>

      <div>
        <Label>Health Needs</Label>
        <Textarea
          value={formData.health_needs || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, health_needs: e.target.value }))}
          placeholder="Physical and mental health needs..."
          rows={3}
        />
      </div>

      <div>
        <Label>Mobility & Transfer Needs</Label>
        <Textarea
          value={formData.mobility || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, mobility: e.target.value }))}
          placeholder="Mobility assessment and support requirements..."
          rows={2}
        />
      </div>

      <div>
        <Label>Medication Requirements</Label>
        <Textarea
          value={formData.medication || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, medication: e.target.value }))}
          placeholder="Current medications, administration support needed..."
          rows={2}
        />
      </div>

      <div>
        <Label>Safeguarding Risks Identified</Label>
        <Textarea
          value={formData.safeguarding_risks || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, safeguarding_risks: e.target.value }))}
          placeholder="Any vulnerabilities or safeguarding concerns..."
          rows={2}
        />
      </div>

      <div>
        <Label>Personal Preferences & Routines</Label>
        <Textarea
          value={formData.personal_preferences || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, personal_preferences: e.target.value }))}
          placeholder="Daily routines, likes/dislikes, preferences..."
          rows={2}
        />
      </div>

      <Button 
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
        className="w-full bg-green-600"
      >
        {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
        Complete Assessment
      </Button>
    </div>
  );
}