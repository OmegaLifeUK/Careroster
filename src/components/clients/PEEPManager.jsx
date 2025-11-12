import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye, Trash2, Zap, Users } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useToast } from "@/components/ui/toast";

export default function PEEPManager({ client }) {
  const [selectedPEEP, setSelectedPEEP] = useState(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: peeps = [], isLoading } = useQuery({
    queryKey: ['peeps', client.id],
    queryFn: async () => {
      const all = await base44.entities.PEEP.list('-assessment_date');
      return all.filter(p => p.client_id === client.id);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PEEP.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['peeps'] });
      toast.success("Deleted", "PEEP removed");
    },
  });

  if (selectedPEEP) {
    return (
      <div>
        <Button variant="outline" onClick={() => setSelectedPEEP(null)} className="mb-4">
          ← Back
        </Button>
        
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Zap className="w-6 h-6 text-red-600" />
                Personal Emergency Evacuation Plan
              </h2>
              <Badge className={selectedPEEP.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                {selectedPEEP.status}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm bg-red-50 p-4 rounded">
              <p><strong>Assessed:</strong> {format(parseISO(selectedPEEP.assessment_date), 'PPP')}</p>
              <p><strong>Review:</strong> {format(parseISO(selectedPEEP.review_date), 'PPP')}</p>
              <p><strong>Mobility:</strong> {selectedPEEP.mobility_level}</p>
              <p><strong>Staff Required:</strong> {selectedPEEP.staff_required}</p>
            </div>

            <div>
              <h3 className="font-semibold mb-2 text-red-700">Evacuation Method</h3>
              <p className="text-lg font-medium bg-red-100 p-3 rounded">{selectedPEEP.evacuation_method?.replace('_', ' ')}</p>
            </div>

            {selectedPEEP.equipment_required && (
              <div>
                <h3 className="font-semibold mb-2">Equipment Required</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedPEEP.equipment_required.map((eq, idx) => (
                    <Badge key={idx} variant="outline">{eq}</Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded">
                <h3 className="font-semibold mb-2">Location</h3>
                <p className="text-sm"><strong>In Building:</strong> {selectedPEEP.location_in_building}</p>
                <p className="text-sm"><strong>Nearest Exit:</strong> {selectedPEEP.nearest_exit}</p>
                <p className="text-sm"><strong>Alternative:</strong> {selectedPEEP.alternative_exit}</p>
              </div>

              <div className="bg-gray-50 p-4 rounded">
                <h3 className="font-semibold mb-2">Assembly Point</h3>
                <p className="text-sm">{selectedPEEP.assembly_point}</p>
              </div>
            </div>

            {selectedPEEP.special_instructions && (
              <div className="bg-yellow-50 p-4 rounded border-l-4 border-yellow-500">
                <h3 className="font-semibold mb-2 text-yellow-900">Special Instructions</h3>
                <p className="text-sm text-yellow-800">{selectedPEEP.special_instructions}</p>
              </div>
            )}

            {selectedPEEP.hearing && (
              <div>
                <h3 className="font-semibold mb-2">Communication Needs</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p><strong>Hearing Impaired:</strong> {selectedPEEP.hearing.hearing_impaired ? 'Yes' : 'No'}</p>
                  <p><strong>Hearing Aid:</strong> {selectedPEEP.hearing.hearing_aid ? 'Yes' : 'No'}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Personal Emergency Evacuation Plans</h2>
        <Button size="sm" className="bg-red-600 hover:bg-red-700">
          <Plus className="w-4 h-4 mr-2" />
          Add PEEP
        </Button>
      </div>

      {isLoading ? (
        <p>Loading...</p>
      ) : peeps.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Zap className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No PEEPs</h3>
            <p className="text-gray-500">Create an emergency evacuation plan</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {peeps.map(peep => (
            <Card key={peep.id} className="border-l-4 border-red-500">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-5 h-5 text-red-600" />
                      <h3 className="font-semibold">Emergency Evacuation Plan</h3>
                      <Badge className={peep.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100'}>
                        {peep.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm text-gray-600">
                      <p><strong>Method:</strong> {peep.evacuation_method?.replace('_', ' ')}</p>
                      <p className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {peep.staff_required} staff
                      </p>
                      <p><strong>Review:</strong> {format(parseISO(peep.review_date), 'MMM d')}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setSelectedPEEP(peep)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => deleteMutation.mutate(peep.id)}
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