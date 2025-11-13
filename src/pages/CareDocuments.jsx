import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Search, 
  Calendar,
  Activity,
  Shield,
  AlertTriangle,
  Pill,
  Heart,
  Brain,
  ClipboardList,
  Users,
  ThumbsUp,
  MessageSquare,
  Zap,
  X,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react";
import { format, parseISO } from "date-fns";

export default function CareDocuments() {
  const [searchQuery, setSearchQuery] = useState("");
  const [documentTypeFilter, setDocumentTypeFilter] = useState("all");
  const [selectedClient, setSelectedClient] = useState("all");
  const [selectedDocument, setSelectedDocument] = useState(null);

  // Fetch all clients
  const { data: clients = [] } = useQuery({
    queryKey: ['all-clients'],
    queryFn: async () => {
      const residential = await base44.entities.Client.list();
      const domcare = await base44.entities.DomCareClient.list();
      const supported = await base44.entities.SupportedLivingClient.list();
      return [
        ...residential.map(c => ({ ...c, type: 'residential' })),
        ...domcare.map(c => ({ ...c, type: 'domiciliary' })),
        ...supported.map(c => ({ ...c, type: 'supported_living' }))
      ];
    },
  });

  // Fetch all document types
  const { data: carePlans = [] } = useQuery({
    queryKey: ['care-plans'],
    queryFn: () => base44.entities.CarePlan.list('-assessment_date'),
  });

  const { data: riskAssessments = [] } = useQuery({
    queryKey: ['risk-assessments'],
    queryFn: () => base44.entities.RiskAssessment.list('-assessment_date'),
  });

  const { data: marSheets = [] } = useQuery({
    queryKey: ['mar-sheets'],
    queryFn: () => base44.entities.MARSheet.list(),
  });

  const { data: peeps = [] } = useQuery({
    queryKey: ['peeps'],
    queryFn: () => base44.entities.PEEP.list('-assessment_date'),
  });

  const { data: repositioningCharts = [] } = useQuery({
    queryKey: ['repositioning-charts'],
    queryFn: () => base44.entities.RepositioningChart.list('-chart_date'),
  });

  const { data: behaviorCharts = [] } = useQuery({
    queryKey: ['behavior-charts'],
    queryFn: () => base44.entities.BehaviorChart.list('-observation_date'),
  });

  const { data: mentalCapacity = [] } = useQuery({
    queryKey: ['mental-capacity'],
    queryFn: () => base44.entities.MentalCapacityAssessment.list('-assessment_date'),
  });

  const { data: safeguardingReferrals = [] } = useQuery({
    queryKey: ['safeguarding'],
    queryFn: () => base44.entities.SafeguardingReferral.list('-incident_date'),
  });

  const { data: complaints = [] } = useQuery({
    queryKey: ['complaints'],
    queryFn: () => base44.entities.Complaint.list('-received_date'),
  });

  const { data: compliments = [] } = useQuery({
    queryKey: ['compliments'],
    queryFn: () => base44.entities.Compliment.list('-received_date'),
  });

  const { data: qualityAudits = [] } = useQuery({
    queryKey: ['quality-audits'],
    queryFn: () => base44.entities.QualityAudit.list('-audit_date'),
  });

  const { data: staffSupervision = [] } = useQuery({
    queryKey: ['staff-supervision'],
    queryFn: () => base44.entities.StaffSupervision.list('-supervision_date'),
  });

  const { data: competencyAssessments = [] } = useQuery({
    queryKey: ['competency-assessments'],
    queryFn: () => base44.entities.CompetencyAssessment.list('-assessment_date'),
  });

  // Compile all documents
  const allDocuments = [
    ...carePlans.map(doc => ({ ...doc, docType: 'Care Plan', icon: Heart, color: 'blue' })),
    ...riskAssessments.map(doc => ({ ...doc, docType: 'Risk Assessment', icon: AlertTriangle, color: 'yellow' })),
    ...marSheets.map(doc => ({ ...doc, docType: 'MAR Sheet', icon: Pill, color: 'purple' })),
    ...peeps.map(doc => ({ ...doc, docType: 'PEEP', icon: Zap, color: 'red' })),
    ...repositioningCharts.map(doc => ({ ...doc, docType: 'Repositioning Chart', icon: Activity, color: 'green' })),
    ...behaviorCharts.map(doc => ({ ...doc, docType: 'Behavior Chart', icon: Brain, color: 'indigo' })),
    ...mentalCapacity.map(doc => ({ ...doc, docType: 'Mental Capacity', icon: Brain, color: 'pink' })),
    ...safeguardingReferrals.map(doc => ({ ...doc, docType: 'Safeguarding', icon: Shield, color: 'red' })),
    ...complaints.map(doc => ({ ...doc, docType: 'Complaint', icon: MessageSquare, color: 'orange' })),
    ...compliments.map(doc => ({ ...doc, docType: 'Compliment', icon: ThumbsUp, color: 'green' })),
    ...qualityAudits.map(doc => ({ ...doc, docType: 'Quality Audit', icon: ClipboardList, color: 'teal' })),
    ...staffSupervision.map(doc => ({ ...doc, docType: 'Staff Supervision', icon: Users, color: 'cyan' })),
    ...competencyAssessments.map(doc => ({ ...doc, docType: 'Competency Assessment', icon: ClipboardList, color: 'violet' })),
  ];

  // Filter documents
  const filteredDocuments = allDocuments.filter(doc => {
    const client = clients.find(c => c.id === doc.client_id || c.id === doc.staff_id);
    const clientName = client?.full_name || '';
    
    const matchesSearch = clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.docType.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = documentTypeFilter === "all" || doc.docType === documentTypeFilter;
    const matchesClient = selectedClient === "all" || doc.client_id === selectedClient || doc.staff_id === selectedClient;
    
    return matchesSearch && matchesType && matchesClient;
  });

  const documentTypes = [...new Set(allDocuments.map(d => d.docType))].sort();

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client?.full_name || 'Unknown Client';
  };

  const getClientType = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client?.type || 'Unknown';
  };

  const colorClasses = {
    blue: 'bg-blue-100 text-blue-800 border-blue-300',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    purple: 'bg-purple-100 text-purple-800 border-purple-300',
    red: 'bg-red-100 text-red-800 border-red-300',
    green: 'bg-green-100 text-green-800 border-green-300',
    indigo: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    pink: 'bg-pink-100 text-pink-800 border-pink-300',
    orange: 'bg-orange-100 text-orange-800 border-orange-300',
    teal: 'bg-teal-100 text-teal-800 border-teal-300',
    cyan: 'bg-cyan-100 text-cyan-800 border-cyan-300',
    violet: 'bg-violet-100 text-violet-800 border-violet-300',
  };

  // Helper to render complex field values
  const renderFieldValue = (key, value) => {
    // Special handling for administration_records in MAR sheets
    if (key === 'administration_records' && Array.isArray(value)) {
      return (
        <div className="space-y-3">
          {value.map((record, idx) => (
            <div key={idx} className="bg-white p-4 rounded border">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="font-semibold">Date:</span> {record.date}
                </div>
                <div>
                  <span className="font-semibold">Time Slot:</span> {record.time_slot}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Status:</span>
                  {record.given ? (
                    <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Given
                    </Badge>
                  ) : (
                    <Badge className="bg-red-100 text-red-800 flex items-center gap-1">
                      <XCircle className="w-3 h-3" />
                      Not Given
                    </Badge>
                  )}
                </div>
                <div>
                  <span className="font-semibold">Dose:</span> {record.dose_given}
                </div>
                <div>
                  <span className="font-semibold">Staff:</span> {record.staff_initials} ({record.staff_signature})
                </div>
                <div>
                  <span className="font-semibold">Code:</span> <Badge variant="outline">{record.code}</Badge>
                </div>
                {record.notes && (
                  <div className="col-span-2 bg-blue-50 p-2 rounded">
                    <span className="font-semibold">Notes:</span> {record.notes}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      );
    }

    // Handle arrays
    if (Array.isArray(value)) {
      if (value.length === 0) return <span className="text-gray-400">None</span>;
      
      // Check if array of objects
      if (typeof value[0] === 'object') {
        return (
          <div className="space-y-2">
            {value.map((item, idx) => (
              <div key={idx} className="bg-gray-50 p-3 rounded text-sm">
                {Object.entries(item).map(([k, v]) => (
                  <div key={k} className="mb-1">
                    <span className="font-semibold">{k.replace(/_/g, ' ')}:</span> {String(v)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        );
      }
      
      // Simple array
      return (
        <div className="flex flex-wrap gap-1">
          {value.map((item, idx) => (
            <Badge key={idx} variant="outline">{String(item)}</Badge>
          ))}
        </div>
      );
    }

    // Handle objects
    if (typeof value === 'object' && value !== null) {
      return (
        <div className="bg-gray-50 p-3 rounded space-y-1 text-sm">
          {Object.entries(value).map(([k, v]) => (
            <div key={k}>
              <span className="font-semibold">{k.replace(/_/g, ' ')}:</span> {String(v)}
            </div>
          ))}
        </div>
      );
    }

    // Handle dates
    if (typeof value === 'string' && (key.includes('date') || key.includes('time'))) {
      try {
        return format(parseISO(value), 'PPP');
      } catch {
        return String(value);
      }
    }

    // Default: plain text
    return <p>{String(value)}</p>;
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Care Documentation</h1>
          <p className="text-gray-500">All regulatory and care documents in one place</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Heart className="w-4 h-4 text-blue-600" />
                <p className="text-xs text-gray-600">Care Plans</p>
              </div>
              <p className="text-2xl font-bold">{carePlans.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Pill className="w-4 h-4 text-purple-600" />
                <p className="text-xs text-gray-600">MAR Sheets</p>
              </div>
              <p className="text-2xl font-bold">{marSheets.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-red-600" />
                <p className="text-xs text-gray-600">PEEPs</p>
              </div>
              <p className="text-2xl font-bold">{peeps.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-4 h-4 text-red-600" />
                <p className="text-xs text-gray-600">Safeguarding</p>
              </div>
              <p className="text-2xl font-bold">{safeguardingReferrals.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <ClipboardList className="w-4 h-4 text-teal-600" />
                <p className="text-xs text-gray-600">Audits</p>
              </div>
              <p className="text-2xl font-bold">{qualityAudits.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-4 h-4 text-gray-600" />
                <p className="text-xs text-gray-600">Total</p>
              </div>
              <p className="text-2xl font-bold">{allDocuments.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search documents or clients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <select
                value={documentTypeFilter}
                onChange={(e) => setDocumentTypeFilter(e.target.value)}
                className="border rounded-md px-3 py-2"
              >
                <option value="all">All Document Types</option>
                {documentTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>

              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="border rounded-md px-3 py-2"
              >
                <option value="all">All Clients</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.full_name} ({client.type})
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Documents List */}
        <div className="space-y-3">
          {filteredDocuments.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
                <p className="text-gray-500">Try adjusting your filters</p>
              </CardContent>
            </Card>
          ) : (
            filteredDocuments.map((doc, index) => {
              const Icon = doc.icon;
              const clientName = getClientName(doc.client_id || doc.staff_id);
              const clientType = getClientType(doc.client_id || doc.staff_id);
              
              return (
                <Card key={`${doc.docType}-${doc.id}-${index}`} className={`border-l-4 ${colorClasses[doc.color]}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Icon className={`w-5 h-5 text-${doc.color}-600`} />
                          <h3 className="font-semibold text-lg">{doc.docType}</h3>
                          <Badge className={colorClasses[doc.color]}>
                            {clientType}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600 mb-2">
                          <div>
                            <strong>Client:</strong> {clientName}
                          </div>
                          {doc.assessment_date && (
                            <div>
                              <strong>Date:</strong> {format(parseISO(doc.assessment_date), 'MMM d, yyyy')}
                            </div>
                          )}
                          {doc.chart_date && (
                            <div>
                              <strong>Date:</strong> {format(parseISO(doc.chart_date), 'MMM d, yyyy')}
                            </div>
                          )}
                          {doc.observation_date && (
                            <div>
                              <strong>Date:</strong> {format(parseISO(doc.observation_date), 'MMM d, yyyy')}
                            </div>
                          )}
                          {doc.month_year && (
                            <div>
                              <strong>Period:</strong> {doc.month_year}
                            </div>
                          )}
                          {doc.status && (
                            <div>
                              <Badge variant="outline">{doc.status}</Badge>
                            </div>
                          )}
                        </div>

                        {/* Document-specific details */}
                        {doc.docType === 'Care Plan' && doc.plan_type && (
                          <p className="text-sm text-gray-600">Plan Type: {doc.plan_type}</p>
                        )}
                        {doc.docType === 'MAR Sheet' && (
                          <p className="text-sm text-gray-600">
                            {doc.medication_name} - {doc.dose} {doc.frequency}
                          </p>
                        )}
                        {doc.docType === 'PEEP' && doc.evacuation_method && (
                          <p className="text-sm text-gray-600">
                            Evacuation: {doc.evacuation_method.replace('_', ' ')} - {doc.staff_required || 0} staff required
                          </p>
                        )}
                        {doc.docType === 'Risk Assessment' && doc.overall_risk_level && (
                          <Badge className={doc.overall_risk_level === 'high' ? 'bg-red-500 text-white' : 'bg-yellow-500 text-white'}>
                            {doc.overall_risk_level} risk
                          </Badge>
                        )}
                      </div>

                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedDocument(doc)}
                      >
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Document Detail Modal */}
        {selectedDocument && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between z-10">
                <div className="flex items-center gap-3">
                  <selectedDocument.icon className="w-6 h-6 text-blue-600" />
                  <h2 className="text-2xl font-bold">{selectedDocument.docType}</h2>
                  <Badge className={colorClasses[selectedDocument.color]}>
                    {getClientType(selectedDocument.client_id || selectedDocument.staff_id)}
                  </Badge>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelectedDocument(null)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="p-6">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">Client Information</h3>
                  <p className="text-gray-700">
                    <strong>Name:</strong> {getClientName(selectedDocument.client_id || selectedDocument.staff_id)}
                  </p>
                </div>

                <div className="space-y-4">
                  {Object.entries(selectedDocument).map(([key, value]) => {
                    if (key === 'id' || key === 'docType' || key === 'icon' || key === 'color' || !value) return null;
                    
                    return (
                      <div key={key} className="border-b pb-3">
                        <h4 className="font-semibold text-sm text-gray-600 uppercase mb-2">
                          {key.replace(/_/g, ' ')}
                        </h4>
                        <div className="text-gray-900">
                          {renderFieldValue(key, value)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="sticky bottom-0 bg-white border-t p-4">
                <Button onClick={() => setSelectedDocument(null)} className="w-full">
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}