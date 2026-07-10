import { AgencyProjectJourneyStepper } from "@/components/agency/journey/agency-project-journey-stepper";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type AgencyProjectJourneyStepperDialogProps = {
  teamId: string;
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
};

export function AgencyProjectJourneyStepperDialog({
  teamId,
  projectId,
  open,
  onOpenChange,
  className,
}: AgencyProjectJourneyStepperDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-h-[90vh] max-w-5xl overflow-y-auto", className)}>
        <DialogHeader>
          <DialogTitle>Edit journey</DialogTitle>
        </DialogHeader>
        <AgencyProjectJourneyStepper teamId={teamId} projectId={projectId} layout="horizontal" />
      </DialogContent>
    </Dialog>
  );
}
