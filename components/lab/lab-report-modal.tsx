"use client";

import * as React from "react";
import { Send, FileText, LoaderCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export function LabReportModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  isSubmitting 
}: { 
  isOpen: boolean; 
  onClose: () => void;
  onSubmit: (report: string) => void;
  isSubmitting: boolean;
}) {
  const [report, setReport] = React.useState("");
  const [submitted, setSubmitted] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!report.trim()) return;
    
    // In a real app we'd await the mutation, here we simulate the callback
    onSubmit(report);
    setSubmitted(true);
    
    // Auto close after success
    setTimeout(() => {
      onClose();
      setSubmitted(false);
      setReport("");
    }, 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Post-Lab Writeup
            </DialogTitle>
            <DialogDescription>
              Document your findings, the steps you took to capture the flags, and any vulnerabilities discovered. This report will be graded manually.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {submitted ? (
              <div className="flex flex-col items-center justify-center py-8 text-center animate-fade-in">
                <CheckCircle className="h-12 w-12 text-success mb-4" />
                <h3 className="font-semibold text-lg">Report Submitted!</h3>
                <p className="text-sm text-muted-foreground mt-2">Your writeup is pending review by an instructor.</p>
              </div>
            ) : (
              <Textarea
                placeholder="Write your markdown report here..."
                className="min-h-[250px] font-mono text-sm resize-none"
                value={report}
                onChange={(e) => setReport(e.target.value)}
                disabled={isSubmitting}
              />
            )}
          </div>
          
          {!submitted && (
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
                Skip
              </Button>
              <Button type="submit" disabled={!report.trim() || isSubmitting}>
                {isSubmitting ? (
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Submit Report
              </Button>
            </DialogFooter>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
