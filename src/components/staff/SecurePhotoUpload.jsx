import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Camera,
  Upload,
  Image,
  FileText,
  Shield,
  AlertTriangle,
  CheckCircle,
  Loader2,
  X,
  Eye,
  Lock,
  User,
  Calendar,
  Trash2
} from "lucide-react";
import { format } from "date-fns";

const UPLOAD_CATEGORIES = [
  { id: 'incident', label: 'Incident Report Photo', icon: AlertTriangle, color: 'text-red-600', bgColor: 'bg-red-50' },
  { id: 'wound', label: 'Wound/Skin Assessment', icon: Shield, color: 'text-orange-600', bgColor: 'bg-orange-50' },
  { id: 'medication', label: 'Medication Documentation', icon: FileText, color: 'text-purple-600', bgColor: 'bg-purple-50' },
  { id: 'property', label: 'Property/Equipment', icon: Image, color: 'text-blue-600', bgColor: 'bg-blue-50' },
  { id: 'client_document', label: 'Client Document', icon: FileText, color: 'text-green-600', bgColor: 'bg-green-50' },
  { id: 'other', label: 'Other', icon: Camera, color: 'text-gray-600', bgColor: 'bg-gray-50' },
];

export default function SecurePhotoUpload({ user }) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [uploadCategory, setUploadCategory] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadedPhotos, setUploadedPhotos] = useState([]);
  const [viewingPhoto, setViewingPhoto] = useState(null);
  
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const queryClient = useQueryClient();

  // Fetch user's clients
  const { data: clients = [] } = useQuery({
    queryKey: ['my-clients', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      
      const carers = await base44.entities.Carer.filter({ email: user.email });
      const staff = await base44.entities.Staff.filter({ email: user.email });
      
      const staffIds = [
        ...(Array.isArray(carers) ? carers.map(c => c.id) : []),
        ...(Array.isArray(staff) ? staff.map(s => s.id) : [])
      ];

      if (staffIds.length === 0) return [];

      // Get shifts to find associated clients
      const allShifts = await base44.entities.Shift.list();
      const myShifts = (Array.isArray(allShifts) ? allShifts : []).filter(s => 
        staffIds.includes(s.carer_id)
      );

      const clientIds = [...new Set(myShifts.map(s => s.client_id).filter(Boolean))];
      
      const allClients = await base44.entities.Client.list();
      return (Array.isArray(allClients) ? allClients : []).filter(c => clientIds.includes(c.id));
    },
    enabled: !!user?.email,
  });

  // Fetch recent uploads
  const { data: recentUploads = [], refetch: refetchUploads } = useQuery({
    queryKey: ['my-recent-uploads', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      
      const allDocs = await base44.entities.ClientDocument.list('-created_date', 20);
      return (Array.isArray(allDocs) ? allDocs : []).filter(d => 
        d.uploaded_by === user.email && d.upload_source === 'mobile_portal'
      );
    },
    enabled: !!user?.email,
  });

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    processFiles(files);
  };

  const processFiles = (files) => {
    const validFiles = files.filter(file => {
      const isValid = file.type.startsWith('image/') || file.type === 'application/pdf';
      const isUnderLimit = file.size <= 10 * 1024 * 1024; // 10MB limit
      return isValid && isUnderLimit;
    });

    if (validFiles.length !== files.length) {
      alert("Some files were skipped. Only images and PDFs under 10MB are allowed.");
    }

    setSelectedFiles(prev => [...prev, ...validFiles]);

    // Generate previews for images
    validFiles.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setPreviews(prev => [...prev, { file, preview: e.target.result }]);
        };
        reader.readAsDataURL(file);
      } else {
        setPreviews(prev => [...prev, { file, preview: null }]);
      }
    });
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const uploadMutation = useMutation({
    mutationFn: async ({ file, category, clientId, description }) => {
      // Upload file to storage
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Create document record
      const docData = {
        client_id: clientId,
        document_name: `${category}_${format(new Date(), 'yyyyMMdd_HHmmss')}_${file.name}`,
        document_type: category,
        document_url: file_url,
        file_type: file.type,
        file_size: file.size,
        description: description,
        uploaded_by: user?.email,
        uploaded_by_name: user?.full_name,
        upload_date: new Date().toISOString(),
        upload_source: 'mobile_portal',
        is_confidential: ['incident', 'wound', 'medication'].includes(category),
        status: 'pending_review',
        metadata: {
          original_filename: file.name,
          capture_device: 'mobile',
          upload_timestamp: new Date().toISOString(),
        }
      };

      return await base44.entities.ClientDocument.create(docData);
    },
  });

  const handleUpload = async () => {
    if (selectedFiles.length === 0 || !uploadCategory || !selectedClientId) {
      alert("Please select files, category, and client before uploading.");
      return;
    }

    setUploading(true);
    const results = [];

    try {
      for (const file of selectedFiles) {
        const result = await uploadMutation.mutateAsync({
          file,
          category: uploadCategory,
          clientId: selectedClientId,
          description,
        });
        results.push(result);
      }

      setUploadedPhotos(prev => [...prev, ...results]);
      setSelectedFiles([]);
      setPreviews([]);
      setDescription("");
      setUploadCategory("");
      setSelectedClientId("");
      
      // Refresh recent uploads
      refetchUploads();

      alert(`Successfully uploaded ${results.length} file(s).`);
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload some files. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const getCategoryConfig = (categoryId) => {
    return UPLOAD_CATEGORIES.find(c => c.id === categoryId) || UPLOAD_CATEGORIES[5];
  };

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client?.full_name || 'Unknown Client';
  };

  return (
    <div className="space-y-4">
      {/* Security Notice */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900">Secure Photo Upload</p>
              <p className="text-sm text-blue-700 mt-1">
                All photos are encrypted and stored securely. Incident and medical photos are marked confidential and require management review.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Section */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-blue-600" />
            Upload Photo or Document
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {/* Category Selection */}
          <div>
            <Label className="text-sm font-medium">Category *</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {UPLOAD_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setUploadCategory(cat.id)}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    uploadCategory === cat.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded ${cat.bgColor}`}>
                      <cat.icon className={`w-4 h-4 ${cat.color}`} />
                    </div>
                    <span className="text-sm font-medium">{cat.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Client Selection */}
          <div>
            <Label className="text-sm font-medium">Related Client *</Label>
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select client..." />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      {client.full_name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* File Upload Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-20 flex-col gap-2"
              onClick={() => cameraInputRef.current?.click()}
            >
              <Camera className="w-6 h-6 text-blue-600" />
              <span className="text-sm">Take Photo</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col gap-2"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-6 h-6 text-green-600" />
              <span className="text-sm">Upload File</span>
            </Button>
          </div>

          {/* Hidden file inputs */}
          <input
            type="file"
            ref={cameraInputRef}
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
            multiple
          />
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*,application/pdf"
            onChange={handleFileSelect}
            className="hidden"
            multiple
          />

          {/* Preview Selected Files */}
          {previews.length > 0 && (
            <div>
              <Label className="text-sm font-medium">Selected Files ({previews.length})</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {previews.map((item, index) => (
                  <div key={index} className="relative group">
                    {item.preview ? (
                      <img
                        src={item.preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg border"
                      />
                    ) : (
                      <div className="w-full h-24 flex items-center justify-center bg-gray-100 rounded-lg border">
                        <FileText className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                    <button
                      onClick={() => removeFile(index)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <p className="text-xs text-gray-500 mt-1 truncate">
                      {item.file.name}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <Label className="text-sm font-medium">Description / Notes</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add any relevant notes about the photo..."
              rows={3}
              className="mt-2 resize-none"
            />
          </div>

          {/* Upload Button */}
          <Button
            onClick={handleUpload}
            disabled={uploading || selectedFiles.length === 0 || !uploadCategory || !selectedClientId}
            className="w-full bg-blue-600 hover:bg-blue-700 h-12"
          >
            {uploading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5 mr-2" />
                Upload {selectedFiles.length > 0 ? `(${selectedFiles.length} files)` : ''}
              </>
            )}
          </Button>

          {/* Confidentiality Warning */}
          {['incident', 'wound', 'medication'].includes(uploadCategory) && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
              <Shield className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-900">Confidential Upload</p>
                <p className="text-yellow-700">
                  This category is marked as confidential and will require management review.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Uploads */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <Image className="w-5 h-5 text-green-600" />
            Recent Uploads
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {recentUploads.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <Image className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No recent uploads</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentUploads.slice(0, 10).map((doc) => {
                const categoryConfig = getCategoryConfig(doc.document_type);
                
                return (
                  <div 
                    key={doc.id}
                    className="p-3 border rounded-lg flex items-center gap-3"
                  >
                    {doc.file_type?.startsWith('image/') && doc.document_url ? (
                      <img
                        src={doc.document_url}
                        alt={doc.document_name}
                        className="w-12 h-12 object-cover rounded border cursor-pointer"
                        onClick={() => setViewingPhoto(doc)}
                      />
                    ) : (
                      <div className={`w-12 h-12 flex items-center justify-center rounded ${categoryConfig.bgColor}`}>
                        <categoryConfig.icon className={`w-6 h-6 ${categoryConfig.color}`} />
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {getClientName(doc.client_id)}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Badge variant="outline" className="text-xs">
                          {categoryConfig.label}
                        </Badge>
                        <span>{format(new Date(doc.upload_date), 'MMM d, h:mm a')}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {doc.is_confidential && (
                        <Lock className="w-4 h-4 text-orange-500" />
                      )}
                      {doc.status === 'pending_review' && (
                        <Badge className="bg-yellow-100 text-yellow-700 text-xs">
                          Pending
                        </Badge>
                      )}
                      {doc.status === 'approved' && (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Photo Viewer Modal */}
      {viewingPhoto && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setViewingPhoto(null)}
        >
          <div className="max-w-3xl max-h-[90vh] relative">
            <button
              onClick={() => setViewingPhoto(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300"
            >
              <X className="w-8 h-8" />
            </button>
            <img
              src={viewingPhoto.document_url}
              alt={viewingPhoto.document_name}
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />
            <div className="mt-4 text-white text-center">
              <p className="font-medium">{getClientName(viewingPhoto.client_id)}</p>
              <p className="text-sm text-gray-300">
                {viewingPhoto.description || 'No description'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Uploaded {format(new Date(viewingPhoto.upload_date), 'PPp')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}