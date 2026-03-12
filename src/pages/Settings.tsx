import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { SEOHead, makeWebPage } from "@/components/shared/SEOHead";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Plus,
  Trash2,
  Loader2,
  Settings as SettingsIcon,
  Phone,
  Mail,
  UserPlus,
} from "lucide-react";
import { ApiKeyManager } from "@/components/settings/ApiKeyManager";

interface Contact {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  created_at: string;
}

export default function Settings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchContacts();
  }, [user]);

  const fetchContacts = async () => {
    try {
      const { data, error } = await supabase
        .from("emergency_contacts")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      setContacts(data || []);
    } catch (e) {
      console.error("Error fetching contacts:", e);
      toast.error("Failed to load contacts");
    } finally {
      setLoading(false);
    }
  };

  const addContact = async () => {
    if (!name.trim() || (!phone.trim() && !email.trim())) {
      toast.error("Name and at least one contact method required");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("emergency_contacts").insert({
        user_id: user!.id,
        name: name.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
      });
      if (error) throw error;
      toast.success("Emergency contact added");
      setName("");
      setPhone("");
      setEmail("");
      setShowForm(false);
      fetchContacts();
    } catch (e) {
      console.error("Error adding contact:", e);
      toast.error("Failed to add contact");
    } finally {
      setSaving(false);
    }
  };

  const deleteContact = async (id: string) => {
    try {
      const { error } = await supabase
        .from("emergency_contacts")
        .delete()
        .eq("id", id);
      if (error) throw error;
      setContacts(contacts.filter((c) => c.id !== id));
      toast.success("Contact removed");
    } catch {
      toast.error("Failed to remove contact");
    }
  };

  if (!user) return null;

  return (
    <Layout>
      <SEOHead
        title="Settings | Fent Finder"
        description="Manage your account settings, emergency contacts, and notification preferences."
        path="/settings"
        jsonLd={makeWebPage("Settings", "/settings", "Manage your Fent Finder account settings.")}
      />
      <div className="container py-8 md:py-12">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              <SettingsIcon className="h-4 w-4" />
              Settings
            </div>
            <h1 className="mb-2 text-3xl font-bold md:text-4xl">Your Settings</h1>
            <p className="text-muted-foreground">
              Manage your emergency contacts and preferences
            </p>
          </div>

          {/* Emergency Contacts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Emergency Contacts
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                People who can check on you when a high-risk pill is detected.
                These contacts are used by the Buddy Alert feature on the Results page.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  {contacts.length === 0 && !showForm && (
                    <div className="rounded-lg border-2 border-dashed border-border py-8 text-center">
                      <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mb-1">
                        No emergency contacts yet
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Add someone who can check on you in an emergency
                      </p>
                    </div>
                  )}

                  {/* Contact list */}
                  {contacts.length > 0 && (
                    <div className="space-y-3">
                      {contacts.map((c) => (
                        <div
                          key={c.id}
                          className="flex items-center justify-between gap-3 rounded-lg border border-border p-4"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-foreground truncate">
                              {c.name}
                            </p>
                            <div className="flex flex-wrap gap-3 mt-1">
                              {c.phone && (
                                <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                                  <Phone className="h-3.5 w-3.5" />
                                  {c.phone}
                                </span>
                              )}
                              {c.email && (
                                <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                                  <Mail className="h-3.5 w-3.5" />
                                  {c.email}
                                </span>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0 text-muted-foreground hover:text-destructive"
                            onClick={() => deleteContact(c.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add contact form */}
                  {showForm ? (
                    <div className="rounded-lg border border-border p-4 space-y-4">
                      <h3 className="font-medium text-foreground flex items-center gap-2">
                        <UserPlus className="h-4 w-4 text-primary" />
                        New Emergency Contact
                      </h3>
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="contact-name">Name *</Label>
                          <Input
                            id="contact-name"
                            placeholder="e.g. Sarah"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            maxLength={100}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="contact-phone">Phone number</Label>
                          <Input
                            id="contact-phone"
                            placeholder="e.g. (555) 123-4567"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            maxLength={20}
                            type="tel"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="contact-email">Email</Label>
                          <Input
                            id="contact-email"
                            placeholder="e.g. sarah@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            maxLength={255}
                            type="email"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          * At least one contact method (phone or email) is required.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={addContact}
                          disabled={!name.trim() || (!phone.trim() && !email.trim()) || saving}
                          className="flex-1"
                        >
                          {saving ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Plus className="mr-2 h-4 w-4" />
                          )}
                          Save Contact
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowForm(false);
                            setName("");
                            setPhone("");
                            setEmail("");
                          }}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => setShowForm(true)}
                    >
                      <UserPlus className="h-4 w-4" />
                      Add Emergency Contact
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
