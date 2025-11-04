import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Shield, AlertTriangle, Loader2, CheckCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function SOSButton({ carer, activeShift }) {
  const [showDialog, setShowDialog] = useState(false);
  const [notes, setNotes] = useState("");
  const [success, setSuccess] = useState(false);
  
  const queryClient = useQueryClient();

  const createSOSAlert = useMutation({
    mutationFn: async () => {
      // Get current location
      let location = null;
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0,
          });
        });
        
        location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          address: "Current location",
        };
      } catch (error) {
        console.error("Location error:", error);
        // Continue without location if unavailable
      }

      const alertData = {
        carer_id: carer.id,
        shift_id: activeShift?.id || null,
        location,
        status: "active",
        notes: notes || "Emergency assistance requested",
      };

      const alert = await base44.entities.SOSAlert.create(alertData);

      // Send notifications to all admin users
      try {
        const users = await base44.entities.User.list();
        const admins = users.filter(u => u.role === 'admin');

        const notificationPromises = admins.map(admin =>
          base44.entities.Notification.create({
            recipient_id: admin.email,
            title: `🚨 SOS ALERT: ${carer.full_name}`,
            message: `Emergency assistance requested by ${carer.full_name}${activeShift ? ` during active shift` : ''}. ${location ? `Location: Lat ${location.latitude.toFixed(4)}, Lon ${location.longitude.toFixed(4)}` : 'Location unavailable'}`,
            type: "sos_alert",
            priority: "urgent",
            is_read: false,
            related_entity_type: "shift",
            related_entity_id: activeShift?.id,
          })
        );

        await Promise.all(notificationPromises);
      } catch (error) {
        console.error("Error creating notifications:", error);
      }

      return alert;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sos-alerts'] });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setShowDialog(false);
        setNotes("");
      }, 3000);
    },
  });

  const handleSOSClick = () => {
    setShowDialog(true);
  };

  const handleConfirmSOS = () => {
    createSOSAlert.mutate();
  };

  return (
    <>
      <Card className="border-2 border-red-500 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50">
          <CardTitle className="flex items-center gap-2 text-red-900">
            <Shield className="w-5 h-5" />
            Emergency
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-sm text-gray-600 mb-4">
            If you need immediate assistance, press the SOS button. This will alert all managers with your location.
          </p>
          <Button
            onClick={handleSOSClick}
            className="w-full h-16 bg-red-600 hover:bg-red-700 text-white text-lg font-bold shadow-lg hover:shadow-xl transition-all"
          >
            <Shield className="w-6 h-6 mr-2" />
            SOS - Request Help
          </Button>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-900">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              Emergency Assistance
            </DialogTitle>
          </DialogHeader>

          {success ? (
            <div className="py-8 text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-green-900 mb-2">
                Help is on the way!
              </h3>
              <p className="text-gray-600">
                All managers have been notified of your emergency. Someone will contact you shortly.
              </p>
            </div>
          ) : (
            <>
              <div className="py-4">
                <p className="text-gray-700 mb-4">
                  <strong>This will immediately alert all managers to your location and situation.</strong>
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  You can add additional notes if needed:
                </p>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional: Describe the situation..."
                  className="h-24"
                  disabled={createSOSAlert.isPending}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDialog(false)}
                  disabled={createSOSAlert.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmSOS}
                  disabled={createSOSAlert.isPending}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {createSOSAlert.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending Alert...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4 mr-2" />
                      Confirm SOS
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}