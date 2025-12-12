import React from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup } from "react-leaflet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Navigation, X, TrendingDown, Route } from "lucide-react";
import { format } from "date-fns";
import "leaflet/dist/leaflet.css";

// Fix leaflet default icon issue
import L from "leaflet";
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

export default function RouteMapViewer({ 
  staffMember, 
  routeData, 
  coordinates, 
  onClose,
  onApplyRoute 
}) {
  if (!coordinates || coordinates.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader className="border-b bg-gradient-to-r from-blue-500 to-blue-600">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Route className="w-5 h-5" />
              Route Optimization
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-gray-500 text-center">No location data available for mapping</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate map center
  const center = coordinates.reduce(
    (acc, coord) => ({
      lat: acc.lat + coord.lat / coordinates.length,
      lng: acc.lng + coord.lng / coordinates.length,
    }),
    { lat: 0, lng: 0 }
  );

  // Create route line coordinates
  const routeLine = coordinates.map(c => [c.lat, c.lng]);

  return (
    <Card className="w-full shadow-2xl">
      <CardHeader className="border-b bg-gradient-to-r from-blue-500 to-blue-600">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center gap-2 mb-1">
              <Route className="w-5 h-5" />
              Optimized Route: {staffMember.full_name}
            </CardTitle>
            <div className="flex items-center gap-3 text-white text-sm">
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span>{coordinates.length} stops</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{routeData.totalTravelTime} min travel</span>
              </div>
              {routeData.savings > 0 && (
                <Badge className="bg-green-500 text-white">
                  <TrendingDown className="w-3 h-3 mr-1" />
                  {routeData.savings}min saved ({routeData.savingsPercent}%)
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {routeData.savings > 0 && (
              <Button 
                onClick={onApplyRoute}
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                Apply Route
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-[300px_1fr]">
          {/* Route Timeline */}
          <div className="border-r bg-gray-50 p-4 overflow-y-auto max-h-[500px]">
            <h3 className="font-bold text-sm text-gray-700 mb-3 flex items-center gap-2">
              <Navigation className="w-4 h-4 text-blue-600" />
              Visit Sequence
            </h3>
            <div className="space-y-2">
              {routeData.optimizedVisits.map((visit, idx) => {
                const coord = coordinates[idx];
                return (
                  <div key={visit.id} className="bg-white rounded-lg border p-2 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-xs text-gray-900 truncate">{coord?.clientName}</p>
                        <div className="flex items-center gap-1 text-[10px] text-gray-600 mt-0.5">
                          <Clock className="w-3 h-3" />
                          <span>{format(new Date(visit.scheduled_start), 'HH:mm')}</span>
                          <span className="text-gray-400">•</span>
                          <span>{visit.duration_minutes}m</span>
                        </div>
                        {coord?.address?.postcode && (
                          <p className="text-[10px] text-gray-500 mt-0.5">{coord.address.postcode}</p>
                        )}
                        {idx < routeData.optimizedVisits.length - 1 && visit.travelToNext && (
                          <div className="flex items-center gap-1 mt-1 text-[10px] text-blue-600">
                            <Navigation className="w-3 h-3" />
                            <span className="font-medium">{visit.travelToNext}m to next</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Map */}
          <div className="h-[500px]">
            <MapContainer
              center={[center.lat, center.lng]}
              zoom={12}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {/* Route line */}
              <Polyline 
                positions={routeLine} 
                color="#3B82F6" 
                weight={3}
                opacity={0.7}
              />

              {/* Visit markers */}
              {coordinates.map((coord, idx) => (
                <Marker 
                  key={idx} 
                  position={[coord.lat, coord.lng]}
                >
                  <Popup>
                    <div className="p-2">
                      <p className="font-bold text-sm">{idx + 1}. {coord.clientName}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        {format(new Date(coord.visitTime), 'HH:mm')}
                      </p>
                      {coord.address?.street && (
                        <p className="text-xs text-gray-500 mt-1">{coord.address.street}</p>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}