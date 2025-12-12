import React, { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from "react-leaflet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Home, MapPin, Navigation, Clock } from "lucide-react";
import { format } from "date-fns";
import "leaflet/dist/leaflet.css";

/**
 * Visual Route Map Component
 * Displays optimized routes on an interactive map
 * Shows current vs optimized routes with color coding
 */

// Fix for default marker icons in react-leaflet
if (typeof window !== 'undefined') {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  });
}

function MapBoundsHandler({ locations }) {
  const map = useMap();
  
  useEffect(() => {
    if (locations.length > 0) {
      const bounds = locations.map(loc => [loc.latitude, loc.longitude]);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [locations, map]);
  
  return null;
}

export default function RouteMapView({ 
  staff, 
  currentRoute = [], 
  optimizedRoute = null, 
  clients = [],
  onClose 
}) {
  const mapRef = useRef();

  // Get all locations for bounds
  const allLocations = [];
  
  if (staff?.address?.latitude && staff?.address?.longitude) {
    allLocations.push(staff.address);
  }
  
  currentRoute.forEach(visit => {
    const client = clients.find(c => c.id === visit.client_id);
    if (client?.address?.latitude && client?.address?.longitude) {
      allLocations.push(client.address);
    }
  });

  // Build route paths
  const currentRoutePath = [];
  const optimizedRoutePath = [];

  if (staff?.address?.latitude && staff?.address?.longitude) {
    currentRoutePath.push([staff.address.latitude, staff.address.longitude]);
    optimizedRoutePath.push([staff.address.latitude, staff.address.longitude]);
  }

  currentRoute.forEach(visit => {
    const client = clients.find(c => c.id === visit.client_id);
    if (client?.address?.latitude && client?.address?.longitude) {
      currentRoutePath.push([client.address.latitude, client.address.longitude]);
    }
  });

  if (optimizedRoute) {
    optimizedRoute.forEach(visit => {
      const client = clients.find(c => c.id === visit.client_id);
      if (client?.address?.latitude && client?.address?.longitude) {
        optimizedRoutePath.push([client.address.latitude, client.address.longitude]);
      }
    });
  }

  const defaultCenter = allLocations.length > 0 
    ? [allLocations[0].latitude, allLocations[0].longitude]
    : [51.5074, -0.1278]; // London default

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl h-[80vh] flex flex-col">
        <CardHeader className="border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              Route Map - {staff?.full_name}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 p-0 relative">
          <MapContainer
            center={defaultCenter}
            zoom={12}
            className="w-full h-full"
            ref={mapRef}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapBoundsHandler locations={allLocations} />

            {/* Staff Home Marker */}
            {staff?.address?.latitude && staff?.address?.longitude && (
              <Marker 
                position={[staff.address.latitude, staff.address.longitude]}
                icon={L.divIcon({
                  className: 'custom-div-icon',
                  html: `<div style="background: #10b981; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2">
                      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                    </svg>
                  </div>`,
                  iconSize: [32, 32],
                  iconAnchor: [16, 16]
                })}
              >
                <Popup>
                  <div className="text-xs">
                    <p className="font-bold">🏠 {staff.full_name}</p>
                    <p className="text-gray-600">{staff.address.postcode}</p>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Current Route Polyline (Gray) */}
            {currentRoutePath.length > 1 && (
              <Polyline 
                positions={currentRoutePath} 
                color="#9ca3af" 
                weight={3}
                opacity={0.7}
                dashArray="5, 10"
              />
            )}

            {/* Optimized Route Polyline (Green) */}
            {optimizedRoutePath.length > 1 && optimizedRoute && (
              <Polyline 
                positions={optimizedRoutePath} 
                color="#10b981" 
                weight={4}
                opacity={0.9}
              />
            )}

            {/* Visit Markers */}
            {currentRoute.map((visit, idx) => {
              const client = clients.find(c => c.id === visit.client_id);
              if (!client?.address?.latitude || !client?.address?.longitude) return null;

              const optimizedIdx = optimizedRoute?.findIndex(v => v.id === visit.id);
              const moved = optimizedRoute && optimizedIdx !== idx;

              return (
                <Marker
                  key={visit.id}
                  position={[client.address.latitude, client.address.longitude]}
                  icon={L.divIcon({
                    className: 'custom-div-icon',
                    html: `<div style="background: ${moved ? '#f59e0b' : '#3b82f6'}; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); font-weight: bold; color: white; font-size: 12px;">
                      ${idx + 1}
                    </div>`,
                    iconSize: [28, 28],
                    iconAnchor: [14, 14]
                  })}
                >
                  <Popup>
                    <div className="text-xs space-y-1">
                      <p className="font-bold text-sm">{client.full_name}</p>
                      <div className="flex items-center gap-1 text-gray-600">
                        <Clock className="w-3 h-3" />
                        {format(new Date(visit.scheduled_start), 'HH:mm')} - {format(new Date(visit.scheduled_end), 'HH:mm')}
                      </div>
                      <p className="text-gray-600">{client.address.postcode}</p>
                      {moved && optimizedIdx !== undefined && (
                        <Badge className="bg-amber-100 text-amber-800 text-[10px]">
                          Moves to position {optimizedIdx + 1}
                        </Badge>
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>

          {/* Map Legend */}
          <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-3 text-xs space-y-1.5 border">
            <p className="font-bold text-gray-900 mb-2">Legend</p>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center">
                <Home className="w-3 h-3 text-white" />
              </div>
              <span className="text-gray-700">Staff Home</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center text-white font-bold text-[10px]">
                #
              </div>
              <span className="text-gray-700">Visit (Current Order)</span>
            </div>
            {optimizedRoute && (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-amber-500 border-2 border-white flex items-center justify-center text-white font-bold text-[10px]">
                    #
                  </div>
                  <span className="text-gray-700">Visit (Moved)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-0.5 bg-emerald-500" />
                  <span className="text-gray-700">Optimized Route</span>
                </div>
              </>
            )}
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-gray-400" style={{backgroundImage: 'repeating-linear-gradient(90deg, #9ca3af, #9ca3af 5px, transparent 5px, transparent 10px)'}} />
              <span className="text-gray-700">Current Route</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}