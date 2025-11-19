import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Send, Calendar } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import TrainingMatrixGrid from "@/components/compliance/TrainingMatrixGrid";

export default function TrainingMatrix() {
  const [view, setView] = useState("matrix"); // "matrix" or "offers"
  const [showOfferDialog, setShowOfferDialog] = useState(false);
  const [offerData, setOfferData] = useState({
    course_name: "",
    course_date: "",
    start_time: "",
    end_time: "",
    location: "",
    max_attendees: 20,
    auto_update_rota: true
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const data = await base44.entities.Staff.list();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: trainingModules = [] } = useQuery({
    queryKey: ['training-modules'],
    queryFn: async () => {
      const data = await base44.entities.TrainingModule.list();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['training-assignments'],
    queryFn: async () => {
      const data = await base44.entities.TrainingAssignment.list();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: trainingOffers = [] } = useQuery({
    queryKey: ['training-offers'],
    queryFn: async () => {
      const data = await base44.entities.TrainingOffer.list('-course_date');
      return Array.isArray(data) ? data : [];
    },
  });

  const createOfferMutation = useMutation({
    mutationFn: (data) => base44.entities.TrainingOffer.create({
      ...data,
      status: 'sent',
      sent_to_staff_ids: staff.map(s => s.id),
      responses: []
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-offers'] });
      setShowOfferDialog(false);
      toast.success("Success", "Training offer sent to all staff");
    },
  });



  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Training Matrix</h1>
            <p className="text-gray-500">Staff training compliance & schedule</p>
          </div>
          <Button onClick={() => setShowOfferDialog(true)} className="bg-purple-600 hover:bg-purple-700">
            <Send className="w-4 h-4 mr-2" />
            Send Training Offer
          </Button>
        </div>

        <div className="flex gap-3 mb-6">
          <Button
            variant={view === "matrix" ? "default" : "outline"}
            onClick={() => setView("matrix")}
          >
            Training Matrix
          </Button>
          <Button
            variant={view === "offers" ? "default" : "outline"}
            onClick={() => setView("offers")}
          >
            Training Offers ({trainingOffers.length})
          </Button>
        </div>

        {view === "matrix" ? (
          <TrainingMatrixGrid 
            staff={staff}
            trainingModules={trainingModules}
            assignments={assignments}
          />
        ) : (
          <div className="space-y-4">
            {trainingOffers.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <GraduationCap className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500">No training offers sent yet</p>
                </CardContent>
              </Card>
            ) : (
              trainingOffers.map(offer => (
                <Card key={offer.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <Calendar className="w-5 h-5 text-purple-600" />
                          <h3 className="font-semibold text-lg">{offer.course_name}</h3>
                          <Badge className={
                            offer.status === 'fully_booked' ? 'bg-red-100 text-red-800' :
                            offer.status === 'completed' ? 'bg-gray-300 text-gray-600' :
                            'bg-blue-100 text-blue-800'
                          }>
                            {offer.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-gray-600">
                          <div>Date: {offer.course_date}</div>
                          <div>Time: {offer.start_time} - {offer.end_time}</div>
                          <div>Location: {offer.location}</div>
                          <div>Max: {offer.max_attendees}</div>
                        </div>
                      </div>
                    </div>
                    
                    {offer.responses && offer.responses.length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-sm font-medium mb-2">Responses:</p>
                        <div className="flex gap-4 text-sm">
                          <span className="text-green-700">
                            ✓ Accepted: {offer.responses.filter(r => r.response === 'accepted').length}
                          </span>
                          <span className="text-red-700">
                            ✗ Declined: {offer.responses.filter(r => r.response === 'declined').length}
                          </span>
                          <span className="text-yellow-700">
                            ? Maybe: {offer.responses.filter(r => r.response === 'maybe').length}
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {showOfferDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl">
              <CardHeader className="border-b">
                <CardTitle>Send Training Offer</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Course Name *</label>
                    <Input
                      value={offerData.course_name}
                      onChange={(e) => setOfferData({ ...offerData, course_name: e.target.value })}
                      placeholder="e.g., Safeguarding Adults Level 2"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Date *</label>
                      <Input
                        type="date"
                        value={offerData.course_date}
                        onChange={(e) => setOfferData({ ...offerData, course_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Start Time *</label>
                      <Input
                        type="time"
                        value={offerData.start_time}
                        onChange={(e) => setOfferData({ ...offerData, start_time: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">End Time *</label>
                      <Input
                        type="time"
                        value={offerData.end_time}
                        onChange={(e) => setOfferData({ ...offerData, end_time: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Location</label>
                      <Input
                        value={offerData.location}
                        onChange={(e) => setOfferData({ ...offerData, location: e.target.value })}
                        placeholder="Training venue"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Max Attendees</label>
                      <Input
                        type="number"
                        value={offerData.max_attendees}
                        onChange={(e) => setOfferData({ ...offerData, max_attendees: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-3 bg-blue-50 rounded">
                    <input
                      type="checkbox"
                      id="auto_rota"
                      checked={offerData.auto_update_rota}
                      onChange={(e) => setOfferData({ ...offerData, auto_update_rota: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <label htmlFor="auto_rota" className="text-sm">
                      Automatically update rota when staff accept (blocks their availability)
                    </label>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <Button variant="outline" onClick={() => setShowOfferDialog(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={() => {
                        if (!offerData.course_name || !offerData.course_date || !offerData.start_time || !offerData.end_time) {
                          toast.error("Error", "Please fill in all required fields");
                          return;
                        }
                        createOfferMutation.mutate(offerData);
                      }}
                      disabled={createOfferMutation.isPending}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {createOfferMutation.isPending ? "Sending..." : "Send to All Staff"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}