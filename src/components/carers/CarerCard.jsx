import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, Mail, MapPin, Award, Edit, Trash2 } from "lucide-react";

const statusColors = {
  active: "bg-green-100 text-green-800",
  inactive: "bg-gray-100 text-gray-800",
  on_leave: "bg-orange-100 text-orange-800",
};

export default function CarerCard({ carer, qualifications = [], onEdit, onDelete }) {
  if (!carer) return null;

  const carerQualifications = Array.isArray(qualifications) ? qualifications.filter(q => 
    q && carer.qualifications?.includes(q.id)
  ) : [];

  return (
    <Card className="hover:shadow-lg transition-all">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center text-white font-semibold text-lg">
              {carer.full_name?.charAt(0) || '?'}
            </div>
            <div>
              <h3 className="font-semibold text-lg">{carer.full_name}</h3>
              <p className="text-sm text-gray-500">
                {carer.employment_type?.replace('_', ' ') || 'Not specified'}
              </p>
            </div>
          </div>
          <Badge className={statusColors[carer.status] || statusColors.inactive}>
            {carer.status?.replace('_', ' ') || 'Unknown'}
          </Badge>
        </div>

        <div className="space-y-2 mb-4">
          {carer.phone && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Phone className="w-4 h-4" />
              <span>{carer.phone}</span>
            </div>
          )}
          {carer.email && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Mail className="w-4 h-4" />
              <span className="truncate">{carer.email}</span>
            </div>
          )}
          {carer.address?.city && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="w-4 h-4" />
              <span>{carer.address.city}</span>
            </div>
          )}
        </div>

        {carerQualifications.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-1 text-sm text-gray-600 mb-2">
              <Award className="w-4 h-4" />
              <span className="font-medium">Qualifications:</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {carerQualifications.map(qual => (
                <Badge key={qual.id} variant="outline" className="text-xs">
                  {qual.qualification_name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {carer.hourly_rate && (
          <div className="mb-4 p-2 bg-gray-50 rounded">
            <p className="text-sm text-gray-600">Hourly Rate</p>
            <p className="text-lg font-semibold text-green-700">£{carer.hourly_rate?.toFixed(2)}</p>
          </div>
        )}

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={(e) => {
              e.stopPropagation();
              if (onEdit) onEdit(carer);
            }}
            className="flex-1"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={(e) => {
              e.stopPropagation();
              if (onDelete) onDelete(carer.id);
            }}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}