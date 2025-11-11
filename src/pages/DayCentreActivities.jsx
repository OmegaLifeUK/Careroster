import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Search, 
  Edit,
  Users,
  Clock,
  MapPin,
  AlertTriangle,
  CheckCircle,
  Palette,
  Heart,
  GraduationCap,
  Activity as ActivityIcon,
  Wrench
} from "lucide-react";

const categoryIcons = {
  arts_crafts: Palette,
  physical: Heart,
  social: Users,
  educational: GraduationCap,
  life_skills: Wrench,
  therapeutic: Heart,
  recreational: ActivityIcon,
  community_access: MapPin,
};

const categoryColors = {
  arts_crafts: "bg-pink-100 text-pink-800",
  physical: "bg-green-100 text-green-800",
  social: "bg-blue-100 text-blue-800",
  educational: "bg-purple-100 text-purple-800",
  life_skills: "bg-orange-100 text-orange-800",
  therapeutic: "bg-teal-100 text-teal-800",
  recreational: "bg-yellow-100 text-yellow-800",
  community_access: "bg-indigo-100 text-indigo-800",
};

const riskColors = {
  low: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-red-100 text-red-800",
};

const locationLabels = {
  main_hall: "Main Hall",
  art_room: "Art Room",
  kitchen: "Kitchen",
  garden: "Garden",
  quiet_room: "Quiet Room",
  gym: "Gym",
  community: "Community",
};

export default function DayCentreActivities() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedActivity, setSelectedActivity] = useState(null);

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['daycentre-activities'],
    queryFn: () => base44.entities.DayCentreActivity.list(),
  });

  const filteredActivities = activities.filter(activity => {
    const matchesSearch = activity.activity_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || activity.category === categoryFilter;
    const matchesActive = activity.is_active !== false;
    return matchesSearch && matchesCategory && matchesActive;
  });

  const stats = {
    total: activities.filter(a => a.is_active).length,
    artsCrafts: activities.filter(a => a.category === 'arts_crafts' && a.is_active).length,
    physical: activities.filter(a => a.category === 'physical' && a.is_active).length,
    social: activities.filter(a => a.category === 'social' && a.is_active).length,
  };

  if (selectedActivity) {
    const Icon = categoryIcons[selectedActivity.category] || ActivityIcon;

    return (
      <div className="p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          <Button
            variant="outline"
            onClick={() => setSelectedActivity(null)}
            className="mb-6"
          >
            ← Back to Activities
          </Button>

          <div className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-3 rounded-lg ${categoryColors[selectedActivity.category]}`}>
                <Icon className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{selectedActivity.activity_name}</h1>
                <Badge className={categoryColors[selectedActivity.category]}>
                  {selectedActivity.category.replace('_', ' ')}
                </Badge>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-blue-600" />
                  <p className="text-sm text-gray-600">Max Participants</p>
                </div>
                <p className="text-2xl font-bold text-blue-600">{selectedActivity.max_participants}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-green-600" />
                  <p className="text-sm text-gray-600">Staff Required</p>
                </div>
                <p className="text-2xl font-bold text-green-600">{selectedActivity.staff_required}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-orange-600" />
                  <p className="text-sm text-gray-600">Risk Level</p>
                </div>
                <Badge className={riskColors[selectedActivity.risk_level]}>
                  {selectedActivity.risk_level}
                </Badge>
              </CardContent>
            </Card>
          </div>

          <Card className="mb-6">
            <CardHeader className="border-b bg-gradient-to-r from-amber-50 to-yellow-50">
              <CardTitle>Activity Details</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-gray-700">{selectedActivity.description}</p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Location</h3>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span>{locationLabels[selectedActivity.location] || selectedActivity.location}</span>
                  </div>
                </div>

                {selectedActivity.equipment_needed && selectedActivity.equipment_needed.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Equipment Needed</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {selectedActivity.equipment_needed.map((equipment, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-sm">{equipment}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedActivity.benefits && selectedActivity.benefits.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Benefits</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedActivity.benefits.map((benefit, idx) => (
                        <Badge key={idx} variant="outline" className="bg-green-50">
                          {benefit}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedActivity.accessibility && selectedActivity.accessibility.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Accessibility Features</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedActivity.accessibility.map((feature, idx) => (
                        <Badge key={idx} variant="outline" className="bg-blue-50">
                          {feature.replace('_', ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="border-b">
                <CardTitle>Session Planning</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span className="text-blue-900 font-medium">Maximum Capacity</span>
                    <span className="text-2xl font-bold text-blue-600">
                      {selectedActivity.max_participants}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="text-green-900 font-medium">Staff Required</span>
                    <span className="text-2xl font-bold text-green-600">
                      {selectedActivity.staff_required}
                    </span>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Ratio</p>
                    <p className="text-lg font-bold text-gray-900">
                      1:{Math.floor(selectedActivity.max_participants / selectedActivity.staff_required)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Staff to participant ratio</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b">
                <CardTitle>Safety Information</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Risk Level</p>
                    <Badge className={riskColors[selectedActivity.risk_level]} className="text-base px-3 py-1">
                      {selectedActivity.risk_level} risk
                    </Badge>
                  </div>
                  {selectedActivity.risk_level === 'high' && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-red-900">High Risk Activity</p>
                          <p className="text-xs text-red-700 mt-1">
                            Additional safety measures and supervision required
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Day Centre Activities</h1>
            <p className="text-gray-500">Manage activity library and sessions</p>
          </div>
          <Button className="bg-amber-600 hover:bg-amber-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Activity
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 mb-1">Active Activities</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 mb-1">Arts & Crafts</p>
              <p className="text-2xl font-bold text-pink-600">{stats.artsCrafts}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 mb-1">Physical</p>
              <p className="text-2xl font-bold text-green-600">{stats.physical}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 mb-1">Social</p>
              <p className="text-2xl font-bold text-blue-600">{stats.social}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search activities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={categoryFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCategoryFilter("all")}
                >
                  All
                </Button>
                <Button
                  variant={categoryFilter === "arts_crafts" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCategoryFilter("arts_crafts")}
                >
                  Arts & Crafts
                </Button>
                <Button
                  variant={categoryFilter === "physical" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCategoryFilter("physical")}
                >
                  Physical
                </Button>
                <Button
                  variant={categoryFilter === "social" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCategoryFilter("social")}
                >
                  Social
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredActivities.map((activity) => {
            const Icon = categoryIcons[activity.category] || ActivityIcon;

            return (
              <Card key={activity.id} className="hover:shadow-lg transition-all">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-lg ${categoryColors[activity.category]}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{activity.activity_name}</h3>
                        <Badge className={categoryColors[activity.category]} className="text-xs">
                          {activity.category.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {activity.description}
                  </p>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-600" />
                        <span className="text-sm text-blue-900">Max participants</span>
                      </div>
                      <span className="font-bold text-blue-600">{activity.max_participants}</span>
                    </div>

                    <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-900">Staff needed</span>
                      </div>
                      <span className="font-bold text-green-600">{activity.staff_required}</span>
                    </div>

                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-600" />
                        <span className="text-sm text-gray-900">Location</span>
                      </div>
                      <span className="text-sm font-medium">
                        {locationLabels[activity.location] || activity.location}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-gray-600">Risk Level:</span>
                    <Badge className={riskColors[activity.risk_level]}>
                      {activity.risk_level}
                    </Badge>
                  </div>

                  {activity.benefits && activity.benefits.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs text-gray-600 mb-2">Benefits:</p>
                      <div className="flex flex-wrap gap-1">
                        {activity.benefits.slice(0, 2).map((benefit, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {benefit}
                          </Badge>
                        ))}
                        {activity.benefits.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{activity.benefits.length - 2}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setSelectedActivity(activity)}
                    >
                      View Details
                    </Button>
                    <Button variant="outline" size="sm">
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredActivities.length === 0 && !isLoading && (
          <div className="text-center py-12 text-gray-500">
            <p>No activities found</p>
          </div>
        )}
      </div>
    </div>
  );
}