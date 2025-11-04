import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { 
  LogIn, 
  LogOut, 
  MapPin, 
  Clock, 
  User,
  CheckCircle,
  AlertTriangle,
  Loader2
} from "lucide-react";
import { format } from "date-fns";

// Geo-fencing distance threshold in meters
const GEO_FENCE_RADIUS = 100; // 100 meters

export default function ClockInOut({ shift, carer, client, timeAttendance }) {
  const [loading, setLoading] = useState(false);
  const [locationError, setLocationError] = useState(null);
  
  const queryClient = useQueryClient();

  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  // Check if location matches client address
  const checkLocationMatch = (latitude, longitude) => {
    if (!client?.address?.latitude || !client?.address?.longitude) {
      return "not_available";
    }

    const distance = calculateDistance(
      latitude,
      longitude,
      client.address.latitude,
      client.address.longitude
    );

    return distance <= GEO_FENCE_RADIUS ? "match" : "mismatch";
  };

  // Get current position
  const getCurrentPosition = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by your browser"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => resolve(position),
        (error) => reject(error),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  // Create notification for managers
  const createLocationMismatchNotification = async (locationMatch, isClockIn) => {
    if (locationMatch === "mismatch" || locationMatch === "not_available") {
      try {
        // Get all admin users
        const users = await base44.entities.User.list();
        const admins = users.filter(u => u.role === 'admin');

        const notificationPromises = admins.map(admin =>
          base44.entities.Notification.create({
            recipient_id: admin.email,
            title: `Location Alert: ${carer.full_name}`,
            message: `${carer.full_name} ${isClockIn ? 'clocked in' : 'clocked out'} outside the expected location for ${client.full_name}'s shift.`,
            type: "clock_alert",
            priority: "high",
            is_read: false,
            related_entity_type: "shift",
            related_entity_id: shift.id,
          })
        );

        await Promise.all(notificationPromises);
      } catch (error) {
        console.error("Error creating notification:", error);
      }
    }
  };

  const clockInMutation = useMutation({
    mutationFn: async () => {
      setLoading(true);
      setLocationError(null);

      try {
        const position = await getCurrentPosition();
        const { latitude, longitude } = position.coords;

        const locationMatch = checkLocationMatch(latitude, longitude);

        const attendanceData = {
          shift_id: shift.id,
          carer_id: carer.id,
          clock_in_time: new Date().toISOString(),
          clock_in_location: {
            latitude,
            longitude,
            address: "Current location",
          },
          clock_in_location_match: locationMatch,
          location_verified: locationMatch === "match",
        };

        const attendance = await base44.entities.TimeAttendance.create(attendanceData);
        
        // Update shift status
        await base44.entities.Shift.update(shift.id, { status: "in_progress" });

        // Create notification if location mismatch
        await createLocationMismatchNotification(locationMatch, true);

        return attendance;
      } catch (error) {
        setLocationError(error.message);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-shifts'] });
      queryClient.invalidateQueries({ queryKey: ['my-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    },
  });

  const clockOutMutation = useMutation({
    mutationFn: async () => {
      setLoading(true);
      setLocationError(null);

      try {
        const position = await getCurrentPosition();
        const { latitude, longitude } = position.coords;

        const locationMatch = checkLocationMatch(latitude, longitude);

        const clockOutTime = new Date();
        const clockInTime = new Date(timeAttendance.clock_in_time);
        const totalHours = (clockOutTime - clockInTime) / (1000 * 60 * 60);

        const updatedAttendance = {
          ...timeAttendance,
          clock_out_time: clockOutTime.toISOString(),
          clock_out_location: {
            latitude,
            longitude,
            address: "Current location",
          },
          clock_out_location_match: locationMatch,
          total_hours: totalHours,
        };

        await base44.entities.TimeAttendance.update(timeAttendance.id, updatedAttendance);
        
        // Update shift status
        await base44.entities.Shift.update(shift.id, { 
          status: "completed",
          actual_start_time: timeAttendance.clock_in_time,
          actual_end_time: clockOutTime.toISOString(),
        });

        // Create notification if location mismatch
        await createLocationMismatchNotification(locationMatch, false);

        return updatedAttendance;
      } catch (error) {
        setLocationError(error.message);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-shifts'] });
      queryClient.invalidateQueries({ queryKey: ['my-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    },
  });

  const handleClockIn = () => {
    if (confirm("Ready to start your shift?")) {
      clockInMutation.mutate();
    }
  };

  const handleClockOut = () => {
    if (confirm("Are you sure you want to end your shift?")) {
      clockOutMutation.mutate();
    }
  };

  const getLocationMatchBadge = (locationMatch) => {
    if (!locationMatch) return null;

    const configs = {
      match: { color: "bg-green-100 text-green-800", icon: CheckCircle, text: "Location Verified" },
      mismatch: { color: "bg-red-100 text-red-800", icon: AlertTriangle, text: "Location Mismatch" },
      not_available: { color: "bg-yellow-100 text-yellow-800", icon: AlertTriangle, text: "Location Unavailable" },
    };

    const config = configs[locationMatch];
    if (!config) return null;

    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <config.icon className="w-3 h-3" />
        {config.text}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <User className="w-5 h-5 text-gray-600" />
            <span className="font-semibold text-lg">{client?.full_name || "Unknown Client"}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Clock className="w-4 h-4" />
            <span className="text-sm">
              {shift.start_time} - {shift.end_time}
            </span>
            <Badge variant="outline">{shift.shift_type}</Badge>
          </div>
          {client?.address && (
            <div className="flex items-center gap-2 text-gray-600 mt-2">
              <MapPin className="w-4 h-4" />
              <span className="text-sm">
                {client.address.street && `${client.address.street}, `}
                {client.address.city} {client.address.postcode}
              </span>
            </div>
          )}
        </div>
      </div>

      {locationError && (
        <Card className="p-3 bg-red-50 border-red-200">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-900">Location Error</p>
              <p className="text-xs text-red-700 mt-1">{locationError}</p>
              <p className="text-xs text-red-600 mt-1">
                Please enable location services and try again.
              </p>
            </div>
          </div>
        </Card>
      )}

      {timeAttendance?.clock_in_time && !timeAttendance?.clock_out_time && (
        <Card className="p-3 bg-green-50 border-green-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-medium text-green-900">Clocked In</span>
            </div>
            {getLocationMatchBadge(timeAttendance.clock_in_location_match)}
          </div>
          <p className="text-sm text-green-700">
            Started at {format(new Date(timeAttendance.clock_in_time), "h:mm a")}
          </p>
        </Card>
      )}

      {timeAttendance?.clock_out_time && (
        <Card className="p-3 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-900">Shift Completed</span>
            </div>
            {getLocationMatchBadge(timeAttendance.clock_out_location_match)}
          </div>
          <div className="text-sm text-blue-700 space-y-1">
            <p>Clocked in: {format(new Date(timeAttendance.clock_in_time), "h:mm a")}</p>
            <p>Clocked out: {format(new Date(timeAttendance.clock_out_time), "h:mm a")}</p>
            <p className="font-medium">Total: {timeAttendance.total_hours?.toFixed(2)}h</p>
          </div>
        </Card>
      )}

      <div className="flex gap-3">
        {!timeAttendance?.clock_in_time && (
          <Button
            onClick={handleClockIn}
            disabled={loading || clockInMutation.isPending}
            className="flex-1 bg-green-600 hover:bg-green-700 h-14 text-lg"
          >
            {loading || clockInMutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Clocking In...
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5 mr-2" />
                Clock In
              </>
            )}
          </Button>
        )}

        {timeAttendance?.clock_in_time && !timeAttendance?.clock_out_time && (
          <Button
            onClick={handleClockOut}
            disabled={loading || clockOutMutation.isPending}
            className="flex-1 bg-red-600 hover:bg-red-700 h-14 text-lg"
          >
            {loading || clockOutMutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Clocking Out...
              </>
            ) : (
              <>
                <LogOut className="w-5 h-5 mr-2" />
                Clock Out
              </>
            )}
          </Button>
        )}
      </div>

      {shift.tasks && shift.tasks.length > 0 && (
        <Card className="p-4 bg-gray-50">
          <p className="text-sm font-medium text-gray-700 mb-2">Tasks:</p>
          <ul className="space-y-1">
            {shift.tasks.map((task, idx) => (
              <li key={idx} className="text-sm text-gray-600 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                {task}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {shift.notes && (
        <Card className="p-4 bg-yellow-50 border-yellow-200">
          <p className="text-sm font-medium text-yellow-900 mb-1">Important Notes:</p>
          <p className="text-sm text-yellow-800">{shift.notes}</p>
        </Card>
      )}
    </div>
  );
}