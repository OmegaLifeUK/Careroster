import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, FileText, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useToast } from "@/components/ui/toast";

export default function AddAssessment() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    assessment_type: "",
    client_id: "",
    assessment_title: "",
    assessment_description: "",
    assessment_date: new Date().toISOString().split('T')[0],
    assessment_status: "draft",
    next_review_date: ""
  });

  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUser();
  }, []);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const allClients = await base44.entities.Client.list();
      return Array.isArray(allClients) ? allClients : [];
    },
  });

  const createAssessmentMutation = useMutation({
    mutationFn: async (assessmentData) => {
      const dataToSave = {
        ...assessmentData,
        completed_by: user?.email || user?.id
      };

      // If completing, lock and timestamp
      if (assessmentData.assessment_status === 'completed') {
        dataToSave.locked = true;
        dataToSave.completed_timestamp = new Date().toISOString();
      }

      const assessment = await base44.entities.Assessment.create(dataToSave);

      // Create audit log
      await base44.entities.Notification.create({
        notification_type: 'assessment_created',
        message: `New ${assessmentData.assessment_type.replace('_', ' ')} assessment created for client`,
        priority: 'normal',
        is_read: false,
        metadata: {
          assessment_id: assessment.id,
          client_id: assessmentData.client_id,
          assessment_type: assessmentData.assessment_type,
          status: assessmentData.assessment_status
        }
      });

      return assessment;
    },
    onSuccess: () => {
      toast.success("Assessment created successfully");
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
      navigate(createPageUrl("ClientOnboarding"));
    },
    onError: (error) => {
      toast.error("Failed to create assessment", error.message);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.assessment_type || !formData.assessment_title || !formData.client_id || !formData.assessment_date) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!formData.assessment_description) {
      toast.error("Assessment content is required");
      return;
    }

    createAssessmentMutation.mutate(formData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getAssessmentTypeLabel = (type) => {
    const labels = {
      initial_needs: "Initial Needs",
      risk_assessment: "Risk Assessment",
      health_assessment: "Health Assessment",
      safeguarding_assessment: "Safeguarding Assessment",
      education_development: "Education / Development",
      behavioural: "Behavioural",
      mental_capacity: "Mental Capacity"
    };
    return labels[type] || type;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            onClick={() => navigate(createPageUrl("ClientOnboarding"))}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Add Assessment</h1>
            <p className="text-sm text-gray-600 mt-1">
              CQC/Ofsted KLOEs: Safe, Effective, Responsive
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Assessment Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Assessment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="assessment_type">Assessment Type *</Label>
                <Select
                  value={formData.assessment_type}
                  onValueChange={(value) => handleChange('assessment_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="initial_needs">Initial Needs</SelectItem>
                    <SelectItem value="risk_assessment">Risk Assessment</SelectItem>
                    <SelectItem value="health_assessment">Health Assessment</SelectItem>
                    <SelectItem value="safeguarding_assessment">Safeguarding Assessment</SelectItem>
                    <SelectItem value="education_development">Education / Development</SelectItem>
                    <SelectItem value="behavioural">Behavioural</SelectItem>
                    <SelectItem value="mental_capacity">Mental Capacity</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="assessment_title">Assessment Title *</Label>
                <Input
                  id="assessment_title"
                  value={formData.assessment_title}
                  onChange={(e) => handleChange('assessment_title', e.target.value)}
                  placeholder="e.g., Initial Needs Assessment - January 2026"
                  required
                />
              </div>

              <div>
                <Label htmlFor="client_id">Client *</Label>
                <Select
                  value={formData.client_id}
                  onValueChange={(value) => handleChange('client_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="assessment_date">Assessment Date *</Label>
                <Input
                  id="assessment_date"
                  type="date"
                  value={formData.assessment_date}
                  onChange={(e) => handleChange('assessment_date', e.target.value)}
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Assessment Content */}
          <Card>
            <CardHeader>
              <CardTitle>Assessment Content</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="assessment_description">Assessment Description *</Label>
                <Textarea
                  id="assessment_description"
                  value={formData.assessment_description}
                  onChange={(e) => handleChange('assessment_description', e.target.value)}
                  rows={12}
                  placeholder="Provide detailed assessment findings, observations, and recommendations..."
                  required
                  className="font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Document all findings, observations, and recommendations in detail
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Review */}
          <Card>
            <CardHeader>
              <CardTitle>Review Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="next_review_date">Next Review Date</Label>
                <Input
                  id="next_review_date"
                  type="date"
                  value={formData.next_review_date}
                  onChange={(e) => handleChange('next_review_date', e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  When should this assessment be reviewed?
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Status and Submit */}
          <Card className="border-2 border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="assessment_status">Assessment Status</Label>
                  <Select
                    value={formData.assessment_status}
                    onValueChange={(value) => handleChange('assessment_status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="completed">
                        <div className="flex items-center gap-2">
                          <Lock className="w-3 h-3" />
                          Completed (Will Lock)
                        </div>
                      </SelectItem>
                      <SelectItem value="reviewed">Reviewed</SelectItem>
                    </SelectContent>
                  </Select>
                  {formData.assessment_status === 'completed' && (
                    <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      Completing will lock this assessment and prevent further editing
                    </p>
                  )}
                </div>

                <div className="flex justify-end gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(createPageUrl("ClientOnboarding"))}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createAssessmentMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {createAssessmentMutation.isPending ? "Saving..." : "Save Assessment"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </form>

        {/* CQC/Ofsted Compliance Note */}
        <Card className="mt-6 border-green-200 bg-green-50">
          <CardContent className="p-4">
            <h4 className="font-semibold text-green-900 mb-2">CQC / Ofsted Compliance</h4>
            <div className="text-sm text-green-800 space-y-1">
              <p><strong>SAFE:</strong> Risk and safeguarding assessments identify potential harms</p>
              <p><strong>EFFECTIVE:</strong> Assessments inform care planning and interventions</p>
              <p><strong>RESPONSIVE:</strong> Regular reviews ensure care remains person-centred</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}