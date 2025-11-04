import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, 
  BookOpen, 
  Upload, 
  Edit, 
  Trash2,
  Users,
  Clock,
  FileText,
  Video,
  CheckCircle
} from "lucide-react";

const CATEGORY_COLORS = {
  mandatory: "bg-red-100 text-red-800",
  compliance: "bg-orange-100 text-orange-800",
  safety: "bg-yellow-100 text-yellow-800",
  skills: "bg-blue-100 text-blue-800",
  software: "bg-purple-100 text-purple-800",
  policy: "bg-green-100 text-green-800",
  induction: "bg-pink-100 text-pink-800",
  refresher: "bg-cyan-100 text-cyan-800",
  other: "bg-gray-100 text-gray-800",
};

const TYPE_ICONS = {
  video: Video,
  document: FileText,
  quiz: CheckCircle,
  online_course: BookOpen,
  in_person: Users,
  mixed: Clock,
};

export default function TrainingModuleManager({ modules, assignments, staff, carers, onAssignTraining, isLoading }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "mandatory",
    type: "document",
    duration_minutes: 30,
    expiry_months: null,
    is_mandatory: false,
    file: null,
    tags: "",
  });

  const queryClient = useQueryClient();

  const addModuleMutation = useMutation({
    mutationFn: async (data) => {
      let material_url = null;
      
      if (data.file) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: data.file });
        material_url = file_url;
      }

      const currentUser = await base44.auth.me();
      const staffMember = staff.find(s => s.email === currentUser.email);

      return base44.entities.TrainingModule.create({
        title: data.title,
        description: data.description,
        category: data.category,
        type: data.type,
        material_url: material_url,
        duration_minutes: data.duration_minutes,
        expiry_months: data.expiry_months || null,
        is_mandatory: data.is_mandatory,
        content_type: data.file?.type || null,
        file_size: data.file?.size || null,
        created_by_staff_id: staffMember?.id || currentUser.id,
        is_active: true,
        tags: data.tags ? data.tags.split(',').map(t => t.trim()) : [],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-modules'] });
      setShowAddForm(false);
      resetForm();
    },
  });

  const deleteModuleMutation = useMutation({
    mutationFn: (id) => base44.entities.TrainingModule.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-modules'] });
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      category: "mandatory",
      type: "document",
      duration_minutes: 30,
      expiry_months: null,
      is_mandatory: false,
      file: null,
      tags: "",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    try {
      await addModuleMutation.mutate(formData);
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, file });
    }
  };

  const handleDelete = (moduleId) => {
    if (confirm("Are you sure you want to delete this training module? This will also remove all assignments.")) {
      deleteModuleMutation.mutate(moduleId);
    }
  };

  const getAssignmentCount = (moduleId) => {
    return assignments.filter(a => a.training_module_id === moduleId).length;
  };

  const getCompletionCount = (moduleId) => {
    return assignments.filter(a => a.training_module_id === moduleId && a.status === 'completed').length;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Training Modules
            </CardTitle>
            <Button onClick={() => setShowAddForm(!showAddForm)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Module
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {showAddForm && (
            <form onSubmit={handleSubmit} className="mb-6 p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Create New Training Module
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="title">Module Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    placeholder="e.g., Manual Handling Training"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                    placeholder="Describe what this training covers..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mandatory">Mandatory</SelectItem>
                      <SelectItem value="compliance">Compliance</SelectItem>
                      <SelectItem value="safety">Safety</SelectItem>
                      <SelectItem value="skills">Skills Development</SelectItem>
                      <SelectItem value="software">Software/Systems</SelectItem>
                      <SelectItem value="policy">Policy & Procedures</SelectItem>
                      <SelectItem value="induction">Induction</SelectItem>
                      <SelectItem value="refresher">Refresher</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="type">Type *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="document">Document</SelectItem>
                      <SelectItem value="quiz">Quiz/Assessment</SelectItem>
                      <SelectItem value="online_course">Online Course</SelectItem>
                      <SelectItem value="in_person">In-Person</SelectItem>
                      <SelectItem value="mixed">Mixed Media</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                    min="5"
                  />
                </div>

                <div>
                  <Label htmlFor="expiry">Expiry (months, optional)</Label>
                  <Input
                    id="expiry"
                    type="number"
                    value={formData.expiry_months || ""}
                    onChange={(e) => setFormData({ ...formData, expiry_months: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder="Leave empty for no expiry"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="file">Upload Training Material (optional)</Label>
                  <Input
                    id="file"
                    type="file"
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.mp4,.mov,.avi"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Accepted: PDF, DOC, PPT, MP4, MOV, AVI
                  </p>
                </div>

                <div>
                  <Label htmlFor="tags">Tags (comma separated)</Label>
                  <Input
                    id="tags"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="e.g., safety, health, care"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_mandatory"
                    checked={formData.is_mandatory}
                    onChange={(e) => setFormData({ ...formData, is_mandatory: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="is_mandatory" className="cursor-pointer">
                    Mandatory for all staff
                  </Label>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <Button type="submit" disabled={uploading || addModuleMutation.isPending}>
                  {uploading ? "Uploading..." : "Create Module"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {/* Modules List */}
          <div className="grid gap-4">
            {isLoading ? (
              <p className="text-center text-gray-500 py-8">Loading training modules...</p>
            ) : modules.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No training modules created yet</p>
              </div>
            ) : (
              modules.map((module) => {
                const TypeIcon = TYPE_ICONS[module.type];
                const assignmentCount = getAssignmentCount(module.id);
                const completionCount = getCompletionCount(module.id);
                const completionRate = assignmentCount > 0 
                  ? ((completionCount / assignmentCount) * 100).toFixed(0)
                  : 0;

                return (
                  <Card key={module.id} className="border-l-4 border-blue-500">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <TypeIcon className="w-5 h-5 text-blue-600" />
                            <h3 className="font-semibold text-lg">{module.title}</h3>
                            <Badge className={CATEGORY_COLORS[module.category]}>
                              {module.category}
                            </Badge>
                            {module.is_mandatory && (
                              <Badge className="bg-red-500 text-white">Mandatory</Badge>
                            )}
                            {!module.is_active && (
                              <Badge variant="outline">Inactive</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-700 mb-3">{module.description}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                        <div className="p-2 bg-gray-50 rounded">
                          <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
                            <Clock className="w-3 h-3" />
                            Duration
                          </div>
                          <p className="font-medium text-sm">{module.duration_minutes} mins</p>
                        </div>

                        {module.expiry_months && (
                          <div className="p-2 bg-gray-50 rounded">
                            <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
                              <Clock className="w-3 h-3" />
                              Expiry
                            </div>
                            <p className="font-medium text-sm">{module.expiry_months} months</p>
                          </div>
                        )}

                        <div className="p-2 bg-blue-50 rounded">
                          <div className="flex items-center gap-1 text-xs text-blue-700 mb-1">
                            <Users className="w-3 h-3" />
                            Assigned
                          </div>
                          <p className="font-medium text-sm text-blue-900">{assignmentCount}</p>
                        </div>

                        <div className="p-2 bg-green-50 rounded">
                          <div className="flex items-center gap-1 text-xs text-green-700 mb-1">
                            <CheckCircle className="w-3 h-3" />
                            Completed
                          </div>
                          <p className="font-medium text-sm text-green-900">
                            {completionCount} ({completionRate}%)
                          </p>
                        </div>
                      </div>

                      {module.tags && module.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {module.tags.map((tag, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => onAssignTraining(module)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Users className="w-4 h-4 mr-2" />
                          Assign to Staff
                        </Button>
                        {module.material_url && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(module.material_url, '_blank')}
                          >
                            View Material
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(module.id)}
                          className="text-red-600 hover:bg-red-50 ml-auto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}