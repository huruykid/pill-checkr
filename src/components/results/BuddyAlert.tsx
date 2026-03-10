import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Users, Send, Loader2, AlertTriangle, CheckCircle, Phone, Mail, Settings } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface Contact {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
}

interface BuddyAlertProps {
  reportId?: string;
  drugName?: string;
  riskLevel?: string;
  className?: string;
}

const ALERT_MESSAGE =
  "I used Pill Checkr and a potentially dangerous substance was detected. Please check on me. — Sent via Fent Finder";

export function BuddyAlert({ reportId, drugName, riskLevel, className }: BuddyAlertProps) {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (user) fetchContacts();
  }, [user]);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("emergency_contacts")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      setContacts(data || []);
    } catch (e) {
      console.error("Error fetching contacts:", e);
    } finally {
      setLoading(false);
    }
  };

  const sendAlert = async () => {
    if (!user) return;
    setSending(true);
    try {
      const contactsSummary = contacts.map((c) => ({
        name: c.name,
        phone: c.phone,
        email: c.email,
      }));

      const { error } = await supabase.from("buddy_alerts").insert({
        user_id: user.id,
        report_id: reportId || null,
        contacts_notified: contactsSummary,
        message: ALERT_MESSAGE,
      });

      if (error) throw error;

      setSent(true);
      setShowConfirm(false);
      toast.success("Alert saved — SMS/email delivery coming soon", {
        duration: 5000,
      });
    } catch (e) {
      console.error("Error saving alert:", e);
      toast.error("Failed to save alert");
    } finally {
      setSending(false);
    }
  };

  // Only show for high risk
  if (riskLevel !== "high") return null;

  // Not signed in
  if (!user) {
    return (
      <div className={`rounded-lg border-2 border-destructive/40 bg-destructive/5 p-5 ${className || ""}`}>
        <div className="flex items-center gap-3 mb-2">
          <AlertTriangle className="h-6 w-6 text-destructive" />
          <h3 className="font-bold text-destructive text-lg">🚨 Alert My Emergency Contacts</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          Sign in to set up emergency contacts and send alerts when dangerous substances are detected.
        </p>
        <Link to="/auth">
          <Button variant="outline" size="sm">Sign in to enable</Button>
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`rounded-lg border-2 border-destructive/40 bg-destructive/5 p-5 flex items-center justify-center ${className || ""}`}>
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  // No contacts configured
  if (contacts.length === 0) {
    return (
      <div className={`rounded-lg border-2 border-destructive/40 bg-destructive/5 p-5 ${className || ""}`}>
        <div className="flex items-center gap-3 mb-2">
          <AlertTriangle className="h-6 w-6 text-destructive" />
          <h3 className="font-bold text-destructive text-lg">🚨 Alert My Emergency Contacts</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          You haven't added any emergency contacts yet. Set them up in Settings so someone can check on you.
        </p>
        <Link to="/settings">
          <Button variant="outline" size="sm" className="gap-2">
            <Settings className="h-4 w-4" />
            Go to Settings
          </Button>
        </Link>
      </div>
    );
  }

  // Already sent
  if (sent) {
    return (
      <div className={`rounded-lg border-2 border-success/40 bg-success/5 p-5 ${className || ""}`}>
        <div className="flex items-center gap-3">
          <CheckCircle className="h-6 w-6 text-success" />
          <div>
            <h3 className="font-bold text-success text-lg">Alert Saved</h3>
            <p className="text-sm text-muted-foreground">
              {contacts.length} contact{contacts.length !== 1 ? "s" : ""} will be notified. SMS/email delivery coming soon.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`rounded-lg border-2 border-destructive/40 bg-destructive/5 p-5 ${className || ""}`}>
        <div className="flex items-center gap-3 mb-3">
          <AlertTriangle className="h-6 w-6 text-destructive animate-pulse" />
          <h3 className="font-bold text-destructive text-lg">🚨 Alert My Emergency Contacts</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          This pill was flagged as <strong className="text-destructive">HIGH RISK</strong>.
          Send an alert to your {contacts.length} emergency contact{contacts.length !== 1 ? "s" : ""} so someone can check on you.
        </p>
        <Button
          variant="danger"
          size="lg"
          className="w-full gap-2 text-base font-bold"
          onClick={() => setShowConfirm(true)}
        >
          <Send className="h-5 w-5" />
          Send Alert to {contacts.length} Contact{contacts.length !== 1 ? "s" : ""}
        </Button>
      </div>

      {/* Confirmation Modal */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirm Alert
            </DialogTitle>
            <DialogDescription>
              The following message will be sent to your emergency contacts:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Message preview */}
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm text-foreground leading-relaxed italic">
                "{ALERT_MESSAGE}"
              </p>
            </div>

            {/* Contact list */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Notifying:</p>
              {contacts.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 rounded-lg border border-border px-3 py-2"
                >
                  <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                    <div className="flex flex-wrap gap-2">
                      {c.phone && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {c.phone}
                        </span>
                      )}
                      {c.email && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {c.email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              variant="danger"
              className="w-full gap-2 font-bold"
              onClick={sendAlert}
              disabled={sending}
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {sending ? "Sending..." : "Confirm & Send Alert"}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowConfirm(false)}
              disabled={sending}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
