import React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { 
  MoreVertical, 
  Calendar, 
  FileText, 
  Pill, 
  AlertTriangle,
  MessageSquare,
  ClipboardList,
  Zap
} from "lucide-react";
import { generateShiftsFromCarePlan } from "@/components/workflow/AutomatedWorkflowEngine";
import { useToast } from "@/components/ui/toast";
import { useQueryClient } from "@tanstack/react-query";

export default function QuickActionsMenu({ client, carePlan }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = React.useState(false);

  const handleGenerateShifts = async () => {
    if (!carePlan) {
      toast.error("No Care Plan", "Create a care plan first to auto-generate shifts");
      return;
    }

    setIsGenerating(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const result = await generateShiftsFromCarePlan(carePlan.id, client.id, today, nextWeek);
      
      if (result.created > 0) {
        toast.success("Shifts Generated", `Created ${result.created} shifts from care plan tasks`);
        queryClient.invalidateQueries({ queryKey: ['shifts'] });
      } else {
        toast.info("No Shifts Created", "No daily tasks found in care plan or shifts already exist");
      }
    } catch (err) {
      toast.error("Generation Failed", "Could not generate shifts");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <MoreVertical className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-purple-600" />
          Quick Actions
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleGenerateShifts} disabled={isGenerating || !carePlan}>
          <Calendar className="w-4 h-4 mr-2" />
          {isGenerating ? "Generating..." : "Generate Shifts from Care Plan"}
        </DropdownMenuItem>
        
        <DropdownMenuItem>
          <FileText className="w-4 h-4 mr-2" />
          Create Progress Note
        </DropdownMenuItem>
        
        <DropdownMenuItem>
          <MessageSquare className="w-4 h-4 mr-2" />
          Send Message to Family
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem>
          <AlertTriangle className="w-4 h-4 mr-2 text-orange-600" />
          Create Alert
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}