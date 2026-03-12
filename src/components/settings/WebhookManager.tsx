import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Webhook,
  Plus,
  Trash2,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Send,
} from "lucide-react";

interface WebhookRow {
  id: string;
  url: string;
  label: string;
  is_active: boolean;
  events: string[];
  created_at: string;
}

interface DeliveryRow {
  id: string;
  event_type: string;
  status_code: number | null;
  success: boolean;
  delivered_at: string;
  response_body: string | null;
}

export function WebhookManager() {
  const { user } = useAuth();
  const [webhooks, setWebhooks] = useState<WebhookRow[]>([]);
  const [deliveries, setDeliveries] = useState<Record<string, DeliveryRow[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");

  useEffect(() => {
    fetchWebhooks();
  }, [user]);

  const fetchWebhooks = async () => {
    try {
      const { data, error } = await supabase
        .from("webhooks" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setWebhooks((data as any[]) || []);
    } catch (e) {
      console.error("Error fetching webhooks:", e);
      toast.error("Failed to load webhooks");
    } finally {
      setLoading(false);
    }
  };

  const fetchDeliveries = async (webhookId: string) => {
    if (deliveries[webhookId]) {
      setExpandedId(expandedId === webhookId ? null : webhookId);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("webhook_deliveries" as any)
        .select("*")
        .eq("webhook_id", webhookId)
        .order("delivered_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      setDeliveries((prev) => ({ ...prev, [webhookId]: (data as any[]) || [] }));
      setExpandedId(webhookId);
    } catch {
      toast.error("Failed to load delivery history");
    }
  };

  const addWebhook = async () => {
    if (!url.trim()) {
      toast.error("Webhook URL is required");
      return;
    }
    try {
      new URL(url.trim());
    } catch {
      toast.error("Please enter a valid URL");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("webhooks" as any).insert({
        user_id: user!.id,
        url: url.trim(),
        label: label.trim() || "Untitled Webhook",
        events: ["high_risk_analysis"],
      } as any);
      if (error) throw error;
      toast.success("Webhook added");
      setUrl("");
      setLabel("");
      setShowForm(false);
      fetchWebhooks();
    } catch (e) {
      console.error("Error adding webhook:", e);
      toast.error("Failed to add webhook");
    } finally {
      setSaving(false);
    }
  };

  const toggleWebhook = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("webhooks" as any)
        .update({ is_active: !isActive } as any)
        .eq("id", id);
      if (error) throw error;
      setWebhooks((prev) =>
        prev.map((w) => (w.id === id ? { ...w, is_active: !isActive } : w))
      );
    } catch {
      toast.error("Failed to update webhook");
    }
  };

  const deleteWebhook = async (id: string) => {
    try {
      const { error } = await supabase
        .from("webhooks" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
      setWebhooks((prev) => prev.filter((w) => w.id !== id));
      toast.success("Webhook deleted");
    } catch {
      toast.error("Failed to delete webhook");
    }
  };

  const sendTest = async (webhook: WebhookRow) => {
    toast.info("Sending test webhook...");
    try {
      const { error } = await supabase.functions.invoke("send-webhook-test", {
        body: { webhookId: webhook.id },
      });
      if (error) throw error;
      toast.success("Test webhook sent!");
      // Refresh deliveries
      const { data } = await supabase
        .from("webhook_deliveries" as any)
        .select("*")
        .eq("webhook_id", webhook.id)
        .order("delivered_at", { ascending: false })
        .limit(20);
      setDeliveries((prev) => ({ ...prev, [webhook.id]: (data as any[]) || [] }));
      setExpandedId(webhook.id);
    } catch {
      toast.error("Failed to send test webhook");
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Webhook className="h-5 w-5 text-primary" />
          Webhooks
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Receive real-time POST notifications when high-risk pills are analyzed.
          Configure an endpoint URL and we'll send structured JSON payloads.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {webhooks.length === 0 && !showForm && (
              <div className="rounded-lg border-2 border-dashed border-border py-8 text-center">
                <Webhook className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-1">No webhooks configured</p>
                <p className="text-xs text-muted-foreground">
                  Add a URL to receive alerts when high-risk pills are detected
                </p>
              </div>
            )}

            {webhooks.map((w) => (
              <div key={w.id} className="rounded-lg border border-border">
                <div className="flex items-start justify-between gap-3 p-4">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{w.label}</span>
                      <Badge variant={w.is_active ? "default" : "secondary"}>
                        {w.is_active ? "Active" : "Paused"}
                      </Badge>
                    </div>
                    <code className="text-xs text-muted-foreground font-mono break-all block">
                      {w.url}
                    </code>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {w.events.map((e) => (
                        <Badge key={e} variant="outline" className="text-[10px]">
                          {e}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      checked={w.is_active}
                      onCheckedChange={() => toggleWebhook(w.id, w.is_active)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-primary"
                      onClick={() => sendTest(w)}
                      title="Send test"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => deleteWebhook(w.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Delivery history toggle */}
                <button
                  onClick={() => fetchDeliveries(w.id)}
                  className="flex w-full items-center justify-between border-t border-border px-4 py-2 text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    Delivery History
                  </span>
                  {expandedId === w.id ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </button>

                {expandedId === w.id && deliveries[w.id] && (
                  <div className="border-t border-border bg-muted/30 p-3 space-y-2">
                    {deliveries[w.id].length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        No deliveries yet
                      </p>
                    ) : (
                      deliveries[w.id].map((d) => (
                        <div
                          key={d.id}
                          className="flex items-center justify-between gap-2 rounded border border-border bg-background px-3 py-2"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {d.success ? (
                              <CheckCircle className="h-3.5 w-3.5 text-success shrink-0" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                            )}
                            <span className="text-xs font-mono truncate">
                              {d.event_type}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {d.status_code && (
                              <Badge
                                variant={d.success ? "default" : "destructive"}
                                className="text-[10px]"
                              >
                                {d.status_code}
                              </Badge>
                            )}
                            <span className="text-[10px] text-muted-foreground">
                              {formatDate(d.delivered_at)}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}

            {showForm ? (
              <div className="rounded-lg border border-border p-4 space-y-4">
                <h3 className="font-medium text-foreground flex items-center gap-2">
                  <Plus className="h-4 w-4 text-primary" />
                  Add Webhook Endpoint
                </h3>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="webhook-label">Label</Label>
                    <Input
                      id="webhook-label"
                      placeholder="e.g. Production Alert Server"
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                      maxLength={100}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="webhook-url">Endpoint URL *</Label>
                    <Input
                      id="webhook-url"
                      placeholder="https://your-server.com/webhooks/fentfinder"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      maxLength={500}
                      type="url"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    We'll POST a JSON payload with report details when a high-risk analysis completes.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={addWebhook}
                    disabled={!url.trim() || saving}
                    className="flex-1"
                  >
                    {saving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Webhook className="mr-2 h-4 w-4" />
                    )}
                    Save Webhook
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowForm(false);
                      setUrl("");
                      setLabel("");
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
                <Plus className="h-4 w-4" />
                Add Webhook Endpoint
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
