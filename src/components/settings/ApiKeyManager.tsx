import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Key,
  Plus,
  Copy,
  Eye,
  EyeOff,
  Trash2,
  Loader2,
  Activity,
  Clock,
  AlertTriangle,
} from "lucide-react";

interface ApiKey {
  id: string;
  label: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  request_count: number;
  is_active: boolean;
  revoked_at: string | null;
}

export function ApiKeyManager() {
  const { user } = useAuth();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState("");
  const [newRawKey, setNewRawKey] = useState<string | null>(null);
  const [showRawKey, setShowRawKey] = useState(false);

  useEffect(() => {
    fetchKeys();
  }, [user]);

  const fetchKeys = async () => {
    try {
      const { data, error } = await supabase
        .from("api_keys" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setKeys((data as any[]) || []);
    } catch (e) {
      console.error("Error fetching API keys:", e);
      toast.error("Failed to load API keys");
    } finally {
      setLoading(false);
    }
  };

  const generateKey = async () => {
    if (!label.trim()) {
      toast.error("Please enter a label for this API key");
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-api-key", {
        body: { label: label.trim() },
      });
      if (error) throw error;
      setNewRawKey(data.raw_key);
      setShowRawKey(true);
      setLabel("");
      setShowForm(false);
      toast.success("API key generated! Copy it now — you won't see it again.");
      fetchKeys();
    } catch (e) {
      console.error("Error generating key:", e);
      toast.error("Failed to generate API key");
    } finally {
      setGenerating(false);
    }
  };

  const revokeKey = async (id: string) => {
    try {
      const { error } = await supabase
        .from("api_keys" as any)
        .update({ is_active: false, revoked_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
      toast.success("API key revoked");
      fetchKeys();
    } catch {
      toast.error("Failed to revoke API key");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const formatDate = (d: string | null) => {
    if (!d) return "Never";
    return new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const activeKeys = keys.filter((k) => k.is_active);
  const revokedKeys = keys.filter((k) => !k.is_active);
  const totalRequests = keys.reduce((sum, k) => sum + (k.request_count || 0), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5 text-primary" />
          API Keys
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Generate API keys to integrate Stamped into your platform.
          Keys are shown only once — store them securely.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Usage stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-border p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{activeKeys.length}</p>
            <p className="text-xs text-muted-foreground">Active Keys</p>
          </div>
          <div className="rounded-lg border border-border p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{totalRequests.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total Requests</p>
          </div>
          <div className="rounded-lg border border-border p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{revokedKeys.length}</p>
            <p className="text-xs text-muted-foreground">Revoked</p>
          </div>
        </div>

        {/* New key display */}
        {newRawKey && (
          <div className="rounded-lg border-2 border-primary bg-primary/5 p-4 space-y-2">
            <div className="flex items-center gap-2 text-primary">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-semibold">Copy your API key now!</span>
            </div>
            <p className="text-xs text-muted-foreground">
              This key will not be shown again. Store it somewhere safe.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-muted px-3 py-2 text-xs font-mono break-all">
                {showRawKey ? newRawKey : "•".repeat(40)}
              </code>
              <Button size="icon" variant="ghost" onClick={() => setShowRawKey(!showRawKey)}>
                {showRawKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button size="icon" variant="ghost" onClick={() => copyToClipboard(newRawKey)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => setNewRawKey(null)}>
              I've saved my key
            </Button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Key list */}
            {keys.length === 0 && !showForm && (
              <div className="rounded-lg border-2 border-dashed border-border py-8 text-center">
                <Key className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-1">No API keys yet</p>
                <p className="text-xs text-muted-foreground">
                  Generate a key to start integrating with the Stamped API
                </p>
              </div>
            )}

            {keys.length > 0 && (
              <div className="space-y-3">
                {keys.map((k) => (
                  <div
                    key={k.id}
                    className={`rounded-lg border p-4 ${
                      k.is_active ? "border-border" : "border-border/50 opacity-60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{k.label}</span>
                          <Badge variant={k.is_active ? "default" : "secondary"}>
                            {k.is_active ? "Active" : "Revoked"}
                          </Badge>
                        </div>
                        <code className="text-xs text-muted-foreground font-mono">
                          {k.key_prefix}{"•".repeat(20)}
                        </code>
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Created {formatDate(k.created_at)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Activity className="h-3 w-3" />
                            {k.request_count.toLocaleString()} requests
                          </span>
                          <span>Last used {formatDate(k.last_used_at)}</span>
                        </div>
                      </div>
                      {k.is_active && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => revokeKey(k.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Generate key form */}
            {showForm ? (
              <div className="rounded-lg border border-border p-4 space-y-4">
                <h3 className="font-medium text-foreground flex items-center gap-2">
                  <Plus className="h-4 w-4 text-primary" />
                  Generate New API Key
                </h3>
                <div className="space-y-1.5">
                  <Label htmlFor="key-label">Label *</Label>
                  <Input
                    id="key-label"
                    placeholder="e.g. Production Server, Mobile App"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    maxLength={100}
                  />
                  <p className="text-xs text-muted-foreground">
                    A descriptive name to identify this key's purpose.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={generateKey}
                    disabled={!label.trim() || generating}
                    className="flex-1"
                  >
                    {generating ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Key className="mr-2 h-4 w-4" />
                    )}
                    Generate Key
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowForm(false);
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
                Generate New API Key
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
