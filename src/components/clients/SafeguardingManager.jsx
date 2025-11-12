import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye, Trash2, Shield, AlertCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useToast } from "@/components/ui/toast";

export default function SafeguardingManager({ client }) {
  const [selectedReferral, setSelectedReferral] = useState(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: referrals = [], isLoading } = useQuery({
    queryKey: ['safeguarding', client.id],
    queryFn: async () => {
      const all = await base44.entities.SafeguardingReferral.list('-date_of_concern');
      return all.filter(r => r.client_id === client.id);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SafeguardingReferral.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safeguarding'] });
      toast.success("Deleted", "Safeguarding referral removed");
    },
  });

  const riskColors = {
    low: "bg-green-100 text-green-800",
    medium: "bg-yellow-100 text-yellow-800",
    high: "bg-orange-100 text-orange-800",
    critical: "bg-red-100 text-red-800",
  };

  const statusColors = {
    reported: "bg-blue-100 text-blue-800",
    investigation: "bg-purple-100 text-purple-800",
    safeguarding_plan: "bg-yellow-100 text-yellow-800",
    monitoring: "bg-orange-100 text-orange-800",
    closed: "bg-gray-100 text-gray-800",
  };

  if (selectedReferral) {
    return (
      <div>
        <Button variant="outline" onClick={() => setSelectedReferral(null)} className="mb-4">
          ← Back
        </Button>
        
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Shield className="w-6 h-6 text-red-600" />
                Safeguarding Referral
              </h2>
              <div className="flex gap-2">
                <Badge className={riskColors[selectedReferral.risk_level]}>
                  {selectedReferral.risk_level} risk
                </Badge>
                <Badge className={statusColors[selectedReferral.status]}>
                  {selectedReferral.status}
                </Badge>
              </div>
            </div>

            <div className="bg-red-50 p-4 rounded border-l-4 border-red-500">
              <p className="text-sm"><strong>Reference:</strong> {selectedReferral.reference_number}</p>
              <p className="text-sm"><strong>Date of Concern:</strong> {format(parseISO(selectedReferral.date_of_concern), 'PPP HH:mm')}</p>
              <p className="text-sm"><strong>Reported By:</strong> {selectedReferral.reported_by}</p>
            </div>

            {selectedReferral.safeguarding_type && (
              <div>
                <h3 className="font-semibold mb-2">Type of Concern</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedReferral.safeguarding_type.map((type, idx) => (
                    <Badge key={idx} className="bg-red-100 text-red-800">
                      {type.replace('_', ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="font-semibold mb-2">Details of Concern</h3>
              <p className="bg-gray-50 p-4 rounded text-sm">{selectedReferral.details_of_concern}</p>
            </div>

            {selectedReferral.immediate_action_taken && (
              <div>
                <h3 className="font-semibold mb-2">Immediate Action Taken</h3>
                <p className="bg-blue-50 p-4 rounded text-sm">{selectedReferral.immediate_action_taken}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-sm font-semibold">Police Notified</p>
                <p className="text-sm">{selectedReferral.police_notified ? 'Yes' : 'No'}</p>
                {selectedReferral.police_reference && (
                  <p className="text-sm text-gray-600">Ref: {selectedReferral.police_reference}</p>
                )}
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-sm font-semibold">Local Authority Notified</p>
                <p className="text-sm">{selectedReferral.local_authority_notified ? 'Yes' : 'No'}</p>
                {selectedReferral.local_authority_reference && (
                  <p className="text-sm text-gray-600">Ref: {selectedReferral.local_authority_reference}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Safeguarding Referrals</h2>
        <Button size="sm" className="bg-red-600 hover:bg-red-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Referral
        </Button>
      </div>

      {isLoading ? (
        <p>Loading...</p>
      ) : referrals.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Shield className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No safeguarding referrals</h3>
            <p className="text-gray-500">No safeguarding concerns have been reported</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {referrals.map(referral => (
            <Card key={referral.id} className="border-l-4 border-red-500">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-5 h-5 text-red-600" />
                      <h3 className="font-semibold">{referral.reference_number}</h3>
                      <Badge className={riskColors[referral.risk_level]}>{referral.risk_level}</Badge>
                      <Badge className={statusColors[referral.status]}>{referral.status}</Badge>
                    </div>
                    <p className="text-sm text-gray-700 mb-2 line-clamp-2">{referral.details_of_concern}</p>
                    <p className="text-sm text-gray-600">{format(parseISO(referral.date_of_concern), 'MMM d, yyyy HH:mm')}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setSelectedReferral(referral)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => deleteMutation.mutate(referral.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}