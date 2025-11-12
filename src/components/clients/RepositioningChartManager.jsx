import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye, Trash2, Activity } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useToast } from "@/components/ui/toast";

export default function RepositioningChartManager({ client }) {
  const [selectedChart, setSelectedChart] = useState(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: charts = [], isLoading } = useQuery({
    queryKey: ['repositioning-charts', client.id],
    queryFn: async () => {
      const all = await base44.entities.RepositioningChart.list('-chart_date');
      return all.filter(c => c.client_id === client.id);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.RepositioningChart.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repositioning-charts'] });
      toast.success("Deleted", "Repositioning chart removed");
    },
  });

  if (selectedChart) {
    return (
      <div>
        <Button variant="outline" onClick={() => setSelectedChart(null)} className="mb-4">
          ← Back
        </Button>
        
        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Activity className="w-6 h-6 text-green-600" />
              Repositioning Chart - {format(parseISO(selectedChart.chart_date), 'PPP')}
            </h2>

            <div className="bg-green-50 p-4 rounded">
              <p><strong>Frequency:</strong> Every {selectedChart.repositioning_frequency_hours} hours</p>
              {selectedChart.pressure_relieving_equipment && (
                <p><strong>Equipment:</strong> {selectedChart.pressure_relieving_equipment.join(', ')}</p>
              )}
            </div>

            {selectedChart.repositioning_records && (
              <div>
                <h3 className="font-semibold mb-2">Repositioning Records</h3>
                <div className="space-y-2">
                  {selectedChart.repositioning_records.map((record, idx) => (
                    <div key={idx} className="bg-gray-50 p-3 rounded">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{record.time}</p>
                        <Badge>{record.position}</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">Skin: {record.skin_condition}</p>
                      <p className="text-sm text-gray-600">Staff: {record.staff_initials}</p>
                    </div>
                  ))}
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
        <h2 className="text-xl font-bold">Repositioning Charts</h2>
        <Button size="sm" className="bg-green-600 hover:bg-green-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Chart
        </Button>
      </div>

      {isLoading ? (
        <p>Loading...</p>
      ) : charts.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Activity className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No repositioning charts</h3>
            <p className="text-gray-500">Create a chart to track repositioning</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {charts.map(chart => (
            <Card key={chart.id} className="border-l-4 border-green-500">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="w-5 h-5 text-green-600" />
                      <h3 className="font-semibold">{format(parseISO(chart.chart_date), 'MMM d, yyyy')}</h3>
                    </div>
                    <p className="text-sm text-gray-600">Frequency: Every {chart.repositioning_frequency_hours} hours</p>
                    <p className="text-sm text-gray-600">Records: {chart.repositioning_records?.length || 0}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setSelectedChart(chart)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => deleteMutation.mutate(chart.id)}
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