import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { useQuery } from "@tanstack/react-query";
import { 
  Search, 
  X, 
  Users, 
  UserCircle, 
  Calendar, 
  MapPin,
  Home,
  Activity,
  Clock,
  FileText,
  TrendingUp
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const GlobalSearch = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef(null);

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

  const { data: domClients = [] } = useQuery({
    queryKey: ['domcare-clients'],
    queryFn: () => base44.entities.DomCareClient.list(),
    enabled: isOpen,
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: () => base44.entities.Staff.list(),
    enabled: isOpen,
  });

  const { data: slClients = [] } = useQuery({
    queryKey: ['supported-living-clients'],
    queryFn: () => base44.entities.SupportedLivingClient.list(),
    enabled: isOpen,
  });

  const { data: dcClients = [] } = useQuery({
    queryKey: ['day-centre-clients'],
    queryFn: () => base44.entities.DayCentreClient.list(),
    enabled: isOpen,
  });

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const searchQuery = query.toLowerCase();
    const searchResults = [];

    // Search residential clients
    clients.forEach(client => {
      if (client.full_name?.toLowerCase().includes(searchQuery)) {
        searchResults.push({
          type: 'residential_client',
          icon: UserCircle,
          title: client.full_name,
          subtitle: 'Residential Client',
          action: () => navigate(createPageUrl("Clients") + "?id=" + client.id),
          color: 'text-green-600',
          bgColor: 'bg-green-50',
        });
      }
    });

    // Search carers
    carers.forEach(carer => {
      if (carer.full_name?.toLowerCase().includes(searchQuery)) {
        searchResults.push({
          type: 'carer',
          icon: Users,
          title: carer.full_name,
          subtitle: 'Carer',
          action: () => navigate(createPageUrl("Carers")),
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
        });
      }
    });

    // Search dom care clients
    domClients.forEach(client => {
      if (client.full_name?.toLowerCase().includes(searchQuery)) {
        searchResults.push({
          type: 'dom_client',
          icon: MapPin,
          title: client.full_name,
          subtitle: 'Domiciliary Client',
          action: () => navigate(createPageUrl("DomCareClients")),
          color: 'text-green-600',
          bgColor: 'bg-green-50',
        });
      }
    });

    // Search staff
    staff.forEach(s => {
      if (s.full_name?.toLowerCase().includes(searchQuery)) {
        searchResults.push({
          type: 'staff',
          icon: Users,
          title: s.full_name,
          subtitle: 'Dom Care Staff',
          action: () => navigate(createPageUrl("DomCareStaff")),
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
        });
      }
    });

    // Search supported living clients
    slClients.forEach(client => {
      if (client.full_name?.toLowerCase().includes(searchQuery)) {
        searchResults.push({
          type: 'sl_client',
          icon: Home,
          title: client.full_name,
          subtitle: 'Supported Living Client',
          action: () => navigate(createPageUrl("SupportedLivingClients")),
          color: 'text-indigo-600',
          bgColor: 'bg-indigo-50',
        });
      }
    });

    // Search day centre clients
    dcClients.forEach(client => {
      if (client.full_name?.toLowerCase().includes(searchQuery)) {
        searchResults.push({
          type: 'dc_client',
          icon: Activity,
          title: client.full_name,
          subtitle: 'Day Centre Client',
          action: () => navigate(createPageUrl("DayCentreClients")),
          color: 'text-amber-600',
          bgColor: 'bg-amber-50',
        });
      }
    });

    // Add quick actions
    const quickActions = [
      {
        type: 'action',
        icon: Calendar,
        title: 'Schedule',
        subtitle: 'View and manage shifts',
        action: () => navigate(createPageUrl("Schedule")),
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        keywords: ['schedule', 'shifts', 'roster', 'calendar'],
      },
      {
        type: 'action',
        icon: MapPin,
        title: 'Dom Care Schedule',
        subtitle: 'Manage visits and runs',
        action: () => navigate(createPageUrl("DomCareSchedule")),
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        keywords: ['domiciliary', 'visits', 'runs', 'schedule'],
      },
      {
        type: 'action',
        icon: FileText,
        title: 'Reports',
        subtitle: 'View analytics and reports',
        action: () => navigate(createPageUrl("Reports")),
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        keywords: ['reports', 'analytics', 'statistics'],
      },
    ];

    quickActions.forEach(action => {
      const matchesKeywords = action.keywords?.some(k => k.includes(searchQuery));
      const matchesTitle = action.title.toLowerCase().includes(searchQuery);
      
      if (matchesKeywords || matchesTitle) {
        searchResults.push(action);
      }
    });

    setResults(searchResults.slice(0, 10));
    setSelectedIndex(0);
  }, [query, clients, carers, domClients, staff, slClients, dcClients, navigate]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      results[selectedIndex].action();
      onClose();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-[9999] flex items-start justify-center pt-20"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden"
        >
          <div className="flex items-center gap-3 p-4 border-b">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search clients, staff, or navigate..."
              className="flex-1 outline-none text-lg"
            />
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {results.length > 0 ? (
            <div className="max-h-96 overflow-y-auto">
              {results.map((result, index) => {
                const Icon = result.icon;
                return (
                  <button
                    key={index}
                    onClick={() => {
                      result.action();
                      onClose();
                    }}
                    className={`w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors ${
                      index === selectedIndex ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${result.bgColor}`}>
                      <Icon className={`w-5 h-5 ${result.color}`} />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-gray-900">{result.title}</p>
                      <p className="text-sm text-gray-500">{result.subtitle}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : query ? (
            <div className="p-8 text-center text-gray-500">
              <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No results found for "{query}"</p>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <p className="text-sm">Start typing to search...</p>
              <p className="text-xs mt-2 text-gray-400">
                Press <kbd className="px-2 py-1 bg-gray-100 rounded">Cmd+K</kbd> to open search
              </p>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};