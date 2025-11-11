import React, { useState, useEffect } from "react";
import { Search, X, Users, UserCircle, Calendar, Home, Activity, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export default function GlobalSearch({ isOpen, onClose }) {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  // Fetch all searchable data
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
    enabled: isOpen,
  });

  const { data: carers = [] } = useQuery({
    queryKey: ['carers'],
    queryFn: () => base44.entities.Carer.list(),
    enabled: isOpen,
  });

  const { data: domCareClients = [] } = useQuery({
    queryKey: ['domcare-clients'],
    queryFn: () => base44.entities.DomCareClient.list(),
    enabled: isOpen,
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: () => base44.entities.Staff.list(),
    enabled: isOpen,
  });

  const { data: supportedLivingClients = [] } = useQuery({
    queryKey: ['supported-living-clients'],
    queryFn: () => base44.entities.SupportedLivingClient.list(),
    enabled: isOpen,
  });

  const { data: dayCentreClients = [] } = useQuery({
    queryKey: ['daycentre-clients'],
    queryFn: () => base44.entities.DayCentreClient.list(),
    enabled: isOpen,
  });

  // Search logic
  const searchResults = React.useMemo(() => {
    if (!query.trim()) return [];

    const lowerQuery = query.toLowerCase();
    const results = [];

    // Search clients
    clients.forEach(client => {
      if (client.full_name?.toLowerCase().includes(lowerQuery)) {
        results.push({
          id: client.id,
          title: client.full_name,
          subtitle: "Residential Client",
          icon: UserCircle,
          color: "text-green-600",
          action: () => {
            navigate(createPageUrl("Clients"));
            onClose();
          }
        });
      }
    });

    // Search carers
    carers.forEach(carer => {
      if (carer.full_name?.toLowerCase().includes(lowerQuery) || 
          carer.email?.toLowerCase().includes(lowerQuery)) {
        results.push({
          id: carer.id,
          title: carer.full_name,
          subtitle: "Carer",
          icon: Users,
          color: "text-blue-600",
          action: () => {
            navigate(createPageUrl("Carers"));
            onClose();
          }
        });
      }
    });

    // Search dom care clients
    domCareClients.forEach(client => {
      if (client.full_name?.toLowerCase().includes(lowerQuery)) {
        results.push({
          id: client.id,
          title: client.full_name,
          subtitle: "Domiciliary Care Client",
          icon: UserCircle,
          color: "text-green-600",
          action: () => {
            navigate(createPageUrl("DomCareClients"));
            onClose();
          }
        });
      }
    });

    // Search staff
    staff.forEach(member => {
      if (member.full_name?.toLowerCase().includes(lowerQuery) || 
          member.email?.toLowerCase().includes(lowerQuery)) {
        results.push({
          id: member.id,
          title: member.full_name,
          subtitle: "Domiciliary Care Staff",
          icon: Users,
          color: "text-blue-600",
          action: () => {
            navigate(createPageUrl("DomCareStaff"));
            onClose();
          }
        });
      }
    });

    // Search supported living clients
    supportedLivingClients.forEach(client => {
      if (client.full_name?.toLowerCase().includes(lowerQuery)) {
        results.push({
          id: client.id,
          title: client.full_name,
          subtitle: "Supported Living Client",
          icon: Home,
          color: "text-indigo-600",
          action: () => {
            navigate(createPageUrl("SupportedLivingClients"));
            onClose();
          }
        });
      }
    });

    // Search day centre clients
    dayCentreClients.forEach(client => {
      if (client.full_name?.toLowerCase().includes(lowerQuery)) {
        results.push({
          id: client.id,
          title: client.full_name,
          subtitle: "Day Centre Client",
          icon: Activity,
          color: "text-amber-600",
          action: () => {
            navigate(createPageUrl("DayCentreClients"));
            onClose();
          }
        });
      }
    });

    return results.slice(0, 10); // Limit to 10 results
  }, [query, clients, carers, domCareClients, staff, supportedLivingClients, dayCentreClients, navigate, onClose]);

  // Quick actions (always visible)
  const quickActions = [
    { title: "Go to Dashboard", icon: Calendar, action: () => { navigate(createPageUrl("Dashboard")); onClose(); } },
    { title: "Go to Schedule", icon: Calendar, action: () => { navigate(createPageUrl("Schedule")); onClose(); } },
    { title: "Go to Clients", icon: UserCircle, action: () => { navigate(createPageUrl("Clients")); onClose(); } },
    { title: "Go to Carers", icon: Users, action: () => { navigate(createPageUrl("Carers")); onClose(); } },
  ];

  // Handle ESC key to close - simplified version
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e) => {
      if (e.key === "Escape" || e.keyCode === 27) {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape, true); // Use capture phase
    return () => document.removeEventListener("keydown", handleEscape, true);
  }, [isOpen, onClose]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        document.getElementById("global-search-input")?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 pt-20 fade-in"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-2xl max-h-[70vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              id="global-search-input"
              type="text"
              placeholder="Search clients, staff, carers..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 pr-10 h-12 text-lg"
            />
            <button
              onClick={onClose}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-200 rounded transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="overflow-y-auto max-h-[calc(70vh-100px)]">
          {query.trim() ? (
            searchResults.length > 0 ? (
              <div className="p-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2">
                  Search Results ({searchResults.length})
                </p>
                {searchResults.map((result) => {
                  const Icon = result.icon;
                  return (
                    <button
                      key={result.id}
                      onClick={result.action}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 transition-colors text-left"
                    >
                      <div className={`w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center ${result.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{result.title}</p>
                        <p className="text-sm text-gray-500 truncate">{result.subtitle}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-12 text-center">
                <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No results found</p>
                <p className="text-sm text-gray-400 mt-1">Try searching for a different name</p>
              </div>
            )
          ) : (
            <div className="p-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2 mb-2">
                Quick Actions
              </p>
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <button
                    key={index}
                    onClick={action.action}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{action.title}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer tip */}
        <div className="border-t p-3 bg-gray-50">
          <p className="text-xs text-gray-500 text-center">
            Press <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs">ESC</kbd> to close
          </p>
        </div>
      </Card>
    </div>
  );
}