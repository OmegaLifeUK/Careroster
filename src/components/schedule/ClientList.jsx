import React from "react";
import { Badge } from "@/components/ui/badge";
import { MapPin, Heart } from "lucide-react";

export default function ClientList({ clients, shifts }) {
  const getClientShiftCount = (clientId) => {
    return shifts.filter(s => s.client_id === clientId).length;
  };

  return (
    <div className="p-2 space-y-2">
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 mb-2">
        Active Clients
      </h4>
      {clients.map((client) => {
        const shiftCount = getClientShiftCount(client.id);
        
        return (
          <div
            key={client.id}
            className="p-3 border rounded-lg bg-white hover:shadow-md transition-all"
          >
            <div className="flex items-start gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-green-500 flex items-center justify-center text-white font-medium text-sm flex-shrink-0">
                {client.full_name?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-gray-900 truncate">
                  {client.full_name}
                </p>
                <div className="flex items-center gap-1 mt-1 flex-wrap">
                  {client.address?.city && (
                    <Badge variant="outline" className="text-xs">
                      <MapPin className="w-3 h-3 mr-1" />
                      {client.address.city}
                    </Badge>
                  )}
                  {client.care_needs && client.care_needs.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      <Heart className="w-3 h-3 mr-1" />
                      {client.care_needs.length} needs
                    </Badge>
                  )}
                </div>
                {shiftCount > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {shiftCount} scheduled shift{shiftCount !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}