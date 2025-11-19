import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Plus, Star } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export default function MockInspections() {
  const [selectedInspection, setSelectedInspection] = useState(null);

  const { toast } = useToast();

  const { data: inspections = [] } = useQuery({
    queryKey: ['mock-inspections'],
    queryFn: async () => {
      const data = await base44.entities.MockInspection.list('-inspection_date');
      return Array.isArray(data) ? data : [];
    },
  });

  const ratingColors = {
    outstanding: "bg-green-600 text-white",
    good: "bg-blue-500 text-white",
    requires_improvement: "bg-yellow-500 text-white",
    inadequate: "bg-red-600 text-white"
  };

  if (selectedInspection) {
    return (
      <div className="p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <Button variant="outline" onClick={() => setSelectedInspection(null)} className="mb-4">
            ← Back to Inspections
          </Button>
          
          <Card>
            <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-6 h-6 text-blue-600" />
                    Mock {selectedInspection.inspection_type} Inspection
                  </CardTitle>
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedInspection.inspection_date} - Inspector: {selectedInspection.inspector_name}
                  </p>
                </div>
                <Badge className={ratingColors[selectedInspection.overall_rating]}>
                  Overall: {selectedInspection.overall_rating}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-3">Domain Ratings</h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {[
                      { label: "Safe", rating: selectedInspection.safe_rating },
                      { label: "Effective", rating: selectedInspection.effective_rating },
                      { label: "Caring", rating: selectedInspection.caring_rating },
                      { label: "Responsive", rating: selectedInspection.responsive_rating },
                      { label: "Well-led", rating: selectedInspection.well_led_rating }
                    ].map(domain => (
                      <div key={domain.label} className="text-center p-4 border rounded-lg">
                        <p className="text-sm text-gray-600 mb-2">{domain.label}</p>
                        <Badge className={ratingColors[domain.rating]}>
                          {domain.rating}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedInspection.strengths && selectedInspection.strengths.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3 text-green-700">Strengths</h3>
                    <ul className="space-y-2">
                      {selectedInspection.strengths.map((strength, idx) => (
                        <li key={idx} className="flex items-start gap-2 p-3 bg-green-50 rounded">
                          <Star className="w-4 h-4 text-green-600 mt-0.5" />
                          <span className="text-sm">{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedInspection.areas_for_improvement && selectedInspection.areas_for_improvement.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3 text-orange-700">Areas for Improvement</h3>
                    <div className="space-y-3">
                      {selectedInspection.areas_for_improvement.map((area, idx) => (
                        <div key={idx} className="p-4 border-l-4 border-orange-500 bg-orange-50 rounded">
                          <div className="flex items-start justify-between mb-2">
                            <p className="font-medium">{area.area}</p>
                            <Badge className="bg-orange-200 text-orange-900">{area.priority}</Badge>
                          </div>
                          <p className="text-sm text-gray-700">{area.recommendation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedInspection.compliance_issues && selectedInspection.compliance_issues.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3 text-red-700">Compliance Issues</h3>
                    <div className="space-y-3">
                      {selectedInspection.compliance_issues.map((issue, idx) => (
                        <div key={idx} className="p-4 border-l-4 border-red-500 bg-red-50 rounded">
                          <div className="flex items-start justify-between mb-2">
                            <p className="font-medium">Regulation: {issue.regulation}</p>
                            <Badge className="bg-red-600 text-white">{issue.severity}</Badge>
                          </div>
                          <p className="text-sm text-gray-700">{issue.issue}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedInspection.summary_report && (
                  <div>
                    <h3 className="font-semibold mb-3">Summary Report</h3>
                    <div className="bg-gray-50 p-4 rounded border">
                      <p className="text-gray-700 whitespace-pre-wrap">{selectedInspection.summary_report}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Mock Inspections</h1>
            <p className="text-gray-500">Prepare for CQC, Ofsted & CIW inspections</p>
          </div>
          <Button className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4 mr-2" />
            Schedule Inspection
          </Button>
        </div>

        <div className="space-y-4">
          {inspections.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Shield className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500">No mock inspections yet</p>
              </CardContent>
            </Card>
          ) : (
            inspections.map(inspection => (
              <Card 
                key={inspection.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setSelectedInspection(inspection)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Shield className="w-5 h-5 text-indigo-600" />
                        <h3 className="font-semibold text-lg">
                          {inspection.inspection_type} Mock Inspection
                        </h3>
                        <Badge className={ratingColors[inspection.overall_rating]}>
                          {inspection.overall_rating}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
                        {[
                          { label: "Safe", rating: inspection.safe_rating },
                          { label: "Effective", rating: inspection.effective_rating },
                          { label: "Caring", rating: inspection.caring_rating },
                          { label: "Responsive", rating: inspection.responsive_rating },
                          { label: "Well-led", rating: inspection.well_led_rating }
                        ].map(domain => domain.rating && (
                          <div key={domain.label} className="text-xs">
                            <span className="text-gray-600">{domain.label}: </span>
                            <Badge variant="outline" className="text-xs">
                              {domain.rating}
                            </Badge>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-4 text-sm text-gray-600">
                        <span>Date: {inspection.inspection_date}</span>
                        <span>Inspector: {inspection.inspector_name}</span>
                        <span>Status: <Badge variant="outline">{inspection.status}</Badge></span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}