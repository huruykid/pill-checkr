import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, X, Send, Loader2, UserPlus, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface Contact {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
}

interface BuddyAlertProps {
  drugName?: string;
  riskLevel?: string;
  className?: string;
}

export function BuddyAlert({ drugName, riskLevel, className }: BuddyAlertProps) {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [saving, setSaving] = useState(false);

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

  const addContact = async () => {
    if (!newName.trim() || (!newPhone.trim() && !newEmail.trim())) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("emergency_contacts").insert({
        user_id: user!.id,
        name: newName.trim(),
        phone: newPhone.trim() || null,
        email: newEmail.trim() || null,
      });
      if (error) throw error;
      toast.success("Contact added");
      setNewName("");
      setNewPhone("");
      setNewEmail("");
      setShowAdd(false);
      fetchContacts();
    } catch (e) {
      console.error("Error adding contact:", e);
      toast.error("Failed to add contact");
    } finally {
      setSaving(false);
    }
  };

  const removeContact = async (id: string) => {
    try {
      await supabase.from("emergency_contacts").delete().eq("id", id);
      setContacts(contacts.filter((c) => c.id !== id));
      toast.success("Contact removed");
    } catch {
      toast.error("Failed to remove contact");
    }
  };

  const sendAlert = () => {
    const message = `I used Pill Checkr and a potentially dangerous pill was detected${drugName ? ` (${drugName})` : ""}${riskLevel ? ` — Risk level: ${riskLevel.toUpperCase()}` : ""}. Please check on me.`;

    // For now, copy to clipboard as a placeholder for actual SMS/email integration
    navigator.clipboard.writeText(message).then(() => {
      toast.success("Alert message copied! Send it to your contacts via text or email.", {
        duration: 5000,
      });
    }).catch(() => {
      toast.info(`Alert message: "${message}"`, { duration: 8000 });
    });
  };

  if (!user) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-5 w-5 text-primary" />
            Buddy Alert System
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Sign in to set up emergency contacts who can check on you.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-5 w-5 text-primary" />
          Buddy Alert System
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Add trusted contacts who can check on you when a risky pill is detected.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Existing contacts */}
            {contacts.length > 0 && (
              <div className="space-y-2">
                {contacts.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {[c.phone, c.email].filter(Boolean).join(" • ")}
                      </p>
                    </div>
                    <button
                      onClick={() => removeContact(c.id)}
                      className="shrink-0 rounded-full p-1 hover:bg-muted"
                    >
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add contact form */}
            {showAdd ? (
              <div className="space-y-2 rounded-lg border border-border p-3">
                <Input
                  placeholder="Name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="h-9"
                />
                <Input
                  placeholder="Phone number"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="h-9"
                />
                <Input
                  placeholder="Email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="h-9"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={addContact}
                    disabled={!newName.trim() || (!newPhone.trim() && !newEmail.trim()) || saving}
                    className="flex-1"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAdd(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={() => setShowAdd(true)}
              >
                <UserPlus className="h-4 w-4" />
                Add Emergency Contact
              </Button>
            )}

            {/* Send alert button */}
            {contacts.length > 0 && (riskLevel === "high" || riskLevel === "medium") && (
              <Button
                variant="warning"
                className="w-full gap-2"
                onClick={sendAlert}
              >
                <Send className="h-4 w-4" />
                Send Alert to My Contacts
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
