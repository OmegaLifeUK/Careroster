import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, 
  TrendingUp, 
  Calendar,
  Users,
  AlertCircle,
  CheckCircle,
  ArrowRight
} from "lucide-react";
import { format, addDays, parseISO, getDay } from "date-fns";

export default function PredictiveScheduling({ shifts, carers, clients }) {
  const [selectedPrediction, setSelectedPrediction] = useState(null);

  const predictions = useMemo(() => {
    const predictions = [];
    const today = new Date();

    // 1. Predict staffing needs based on historical patterns
    const dayOfWeekPatterns = {};
    shifts.forEach(shift => {
      if (!shift.date) return;
      try {
        const dayOfWeek = getDay(parseISO(shift.date));
        if (!dayOfWeekPatterns[dayOfWeek]) {
          dayOfWeekPatterns[dayOfWeek] = { total: 0, byType: {} };
        }
        dayOfWeekPatterns[dayOfWeek].total++;
        const type = shift.shift_type || 'general';
        dayOfWeekPatterns[dayOfWeek].byType[type] = 
          (dayOfWeekPatterns[dayOfWeek].byType[type] || 0) + 1;
      } catch {}
    });

    // Predict next 7 days staffing needs
    for (let i = 1; i <= 7; i++) {
      const futureDate = addDays(today, i);
      const dayOfWeek = getDay(futureDate);
      const pattern = dayOfWeekPatterns[dayOfWeek];
      
      if (pattern) {
        const avgShifts = Math.round(pattern.total / 4); // Assuming 4 weeks of data
        predictions.push({
          type: 'staffing_prediction',
          date: format(futureDate, 'yyyy-MM-dd'),
          dateFormatted: format(futureDate, 'EEEE, MMM d'),
          predictedShifts: avgShifts,
          confidence: pattern.total > 10 ? 'high' : pattern.total > 5 ? 'medium' : 'low',
          breakdown: pattern.byType,
          icon: Calendar
        });
      }
    }

    // 2. Identify carers at risk of burnout
    const carerWorkload = {};
    const recentShifts = shifts.filter(s => {
      if (!s.date) return false;
      try {
        const shiftDate = parseISO(s.date);
        const daysAgo = (today - shiftDate) / (1000 * 60 * 60 * 24);
        return daysAgo >= 0 && daysAgo <= 14;
      } catch {
        return false;
      }
    });

    recentShifts.forEach(shift => {
      if (shift.carer_id) {
        if (!carerWorkload[shift.carer_id]) {
          carerWorkload[shift.carer_id] = { shifts: 0, hours: 0, consecutiveDays: new Set() };
        }
        carerWorkload[shift.carer_id].shifts++;
        carerWorkload[shift.carer_id].hours += shift.duration_hours || 0;
        carerWorkload[shift.carer_id].consecutiveDays.add(shift.date);
      }
    });

    Object.entries(carerWorkload).forEach(([carerId, data]) => {
      const carer = carers.find(c => c.id === carerId);
      if (!carer) return;

      const avgHoursPerDay = data.hours / 14;
      const workIntensity = data.consecutiveDays.size / 14;

      if (avgHoursPerDay > 8 || workIntensity > 0.7) {
        predictions.push({
          type: 'burnout_risk',
          carer: carer.full_name,
          carerId,
          avgHoursPerDay: avgHoursPerDay.toFixed(1),
          workDays: data.consecutiveDays.size,
          risk: avgHoursPerDay > 10 || workIntensity > 0.85 ? 'high' : 'medium',
          recommendation: avgHoursPerDay > 10 
            ? 'Consider reducing hours or scheduling time off'
            : 'Monitor workload and ensure adequate rest periods',
          icon: AlertCircle
        });
      }
    });

    // 3. Predict client needs growth
    const clientGrowth = {};
    shifts.forEach(shift => {
      if (!shift.client_id) return;
      if (!clientGrowth[shift.client_id]) {
        clientGrowth[shift.client_id] = 0;
      }
      clientGrowth[shift.client_id]++;
    });

    Object.entries(clientGrowth)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .forEach(([clientId, shiftCount]) => {
        const client = clients.find(c => c.id === clientId);
        if (!client) return;

        const avgPerWeek = shiftCount / 4;
        if (avgPerWeek > 5) {
          predictions.push({
            type: 'client_demand',
            client: client.full_name,
            clientId,
            currentAvgPerWeek: avgPerWeek.toFixed(1),
            trend: 'increasing',
            recommendation: 'Consider assigning a dedicated carer or care team',
            icon: TrendingUp
          });
        }
      });

    // 4. Optimal staffing recommendations
    const activeCarers = carers.filter(c => c.status === 'active').length;
    const avgShiftsPerWeek = shifts.filter(s => {
      if (!s.date) return false;
      try {
        const daysAgo = (today - parseISO(s.date)) / (1000 * 60 * 60 * 24);
        return daysAgo >= 0 && daysAgo <= 7;
      } catch {
        return false;
      }
    }).length;

    const shiftsPerCarer = avgShiftsPerWeek / (activeCarers || 1);
    if (shiftsPerCarer > 8) {
      predictions.push({
        type: 'staffing_recommendation',
        currentStaffing: activeCarers,
        avgShiftsPerCarer: shiftsPerCarer.toFixed(1),
        recommendedStaffing: Math.ceil(avgShiftsPerWeek / 7),
        status: 'understaffed',
        recommendation: 'Consider hiring additional carers to maintain quality and prevent burnout',
        icon: Users
      });
    } else if (shiftsPerCarer < 4 && activeCarers > 5) {
      predictions.push({
        type: 'staffing_recommendation',
        currentStaffing: activeCarers,
        avgShiftsPerCarer: shiftsPerCarer.toFixed(1),
        status: 'overstaffed',
        recommendation: 'Staff utilization is low. Consider workload distribution or capacity building',
        icon: Users
      });
    }

    return predictions;
  }, [shifts, carers, clients]);

  const getConfidenceColor = (confidence) => {
    switch (confidence) {
      case 'high': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'high': return 'bg-red-100 text-red-800 border-red-300';
      case 'medium': return 'bg-orange-100 text-orange-800 border-orange-300';
      default: return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  if (predictions.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600">
            Not enough data for predictive insights yet. 
            Continue using the system to build prediction models.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-6 h-6 text-purple-600" />
        <h2 className="text-xl font-semibold text-gray-900">Predictive Insights</h2>
        <Badge className="bg-purple-100 text-purple-800">
          {predictions.length} insights
        </Badge>
      </div>

      <div className="grid gap-4">
        {predictions.map((prediction, idx) => {
          const Icon = prediction.icon;

          return (
            <Card 
              key={idx}
              className={`hover:shadow-lg transition-all cursor-pointer ${
                prediction.type === 'burnout_risk' && prediction.risk === 'high'
                  ? 'border-red-300 bg-red-50'
                  : ''
              }`}
              onClick={() => setSelectedPrediction(prediction)}
            >
              <CardContent className="p-6">
                {prediction.type === 'staffing_prediction' && (
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900">
                          {prediction.dateFormatted}
                        </h3>
                        <Badge className={getConfidenceColor(prediction.confidence)}>
                          {prediction.confidence} confidence
                        </Badge>
                      </div>
                      <p className="text-gray-700 mb-2">
                        Predicted demand: <strong>{prediction.predictedShifts} shifts</strong>
                      </p>
                      {prediction.breakdown && (
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(prediction.breakdown).map(([type, count]) => (
                            <Badge key={type} variant="outline" className="text-xs">
                              {type}: {count}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {prediction.type === 'burnout_risk' && (
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      prediction.risk === 'high' ? 'bg-red-100' : 'bg-orange-100'
                    }`}>
                      <Icon className={`w-6 h-6 ${
                        prediction.risk === 'high' ? 'text-red-600' : 'text-orange-600'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900">
                          Burnout Risk: {prediction.carer}
                        </h3>
                        <Badge className={getRiskColor(prediction.risk)}>
                          {prediction.risk} risk
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-700 space-y-1 mb-2">
                        <p>• Average: {prediction.avgHoursPerDay}h per day</p>
                        <p>• Worked {prediction.workDays} of last 14 days</p>
                      </div>
                      <p className="text-sm text-gray-600 italic">
                        {prediction.recommendation}
                      </p>
                    </div>
                  </div>
                )}

                {prediction.type === 'client_demand' && (
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-2">
                        High Demand Client: {prediction.client}
                      </h3>
                      <p className="text-gray-700 mb-2">
                        Currently averaging <strong>{prediction.currentAvgPerWeek} shifts/week</strong>
                      </p>
                      <p className="text-sm text-gray-600 italic">
                        {prediction.recommendation}
                      </p>
                    </div>
                  </div>
                )}

                {prediction.type === 'staffing_recommendation' && (
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      prediction.status === 'understaffed' ? 'bg-red-100' : 'bg-yellow-100'
                    }`}>
                      <Icon className={`w-6 h-6 ${
                        prediction.status === 'understaffed' ? 'text-red-600' : 'text-yellow-600'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900">Staffing Analysis</h3>
                        <Badge className={
                          prediction.status === 'understaffed' 
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }>
                          {prediction.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-700 space-y-1 mb-2">
                        <p>• Current staff: {prediction.currentStaffing} active carers</p>
                        <p>• Average: {prediction.avgShiftsPerCarer} shifts per carer</p>
                        {prediction.recommendedStaffing && (
                          <p>• Recommended: {prediction.recommendedStaffing} carers</p>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 italic">
                        {prediction.recommendation}
                      </p>
                    </div>
                  </div>
                )}

                <div className="mt-3 pt-3 border-t flex justify-end">
                  <Button size="sm" variant="ghost" className="text-blue-600">
                    View Details
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}