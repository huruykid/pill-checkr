import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, CheckCircle, XCircle, Clock, Eye } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type PillShape = Database["public"]["Enums"]["pill_shape"];
type PillColor = Database["public"]["Enums"]["pill_color"];

interface Submission {
  id: string;
  user_id: string;
  drug_name: string;
  imprint: string;
  shape: PillShape;
  color: PillColor;
  photo_url: string | null;
  notes: string | null;
  status: string;
  reviewer_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export function CommunitySubmissionsTab() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [rejectDialog, setRejectDialog] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchSubmissions();
  }, [filter]);

  const fetchSubmissions = async () => {
    setLoading(true);
    let query = supabase
      .from("community_submissions")
      .select("*")
      .order("created_at", { ascending: false });

    if (filter !== "all") {
      query = query.eq("status", filter);
    }

    const { data, error } = await query;
    if (!error && data) setSubmissions(data as Submission[]);
    setLoading(false);
  };

  const approve = async (sub: Submission) => {
    if (!user) return;
    setProcessing(sub.id);

    // Insert into pill_reference
    const { error: insertError } = await supabase.from("pill_reference").insert({
      drug_name: sub.drug_name,
      imprint: sub.imprint,
      shape: sub.shape,
      color: sub.color,
      notes: sub.notes,
      source: "community",
    });

    if (insertError) {
      toast.error("Failed to add to pill reference");
      setProcessing(null);
      return;
    }

    // Update submission status
    const { error: updateError } = await supabase
      .from("community_submissions")
      .update({
        status: "approved",
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", sub.id);

    if (updateError) {
      toast.error("Approved but failed to update submission status");
    } else {
      toast.success(`Approved "${sub.drug_name}" — added to pill reference`);
    }

    setProcessing(null);
    await fetchSubmissions();
  };

  const reject = async () => {
    if (!user || !rejectDialog) return;
    if (!rejectReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    setProcessing(rejectDialog);

    const { error } = await supabase
      .from("community_submissions")
      .update({
        status: "rejected",
        reviewer_notes: rejectReason.trim(),
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", rejectDialog);

    if (error) {
      toast.error("Failed to reject submission");
    } else {
      toast.success("Submission rejected");
    }

    setRejectDialog(null);
    setRejectReason("");
    setProcessing(null);
    await fetchSubmissions();
  };

  const viewPhoto = async (path: string) => {
    const { data } = await supabase.storage
      .from("pill-images")
      .createSignedUrl(path, 3600);
    if (data?.signedUrl) setPhotoUrl(data.signedUrl);
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-success text-success-foreground gap-1"><CheckCircle className="h-3 w-3" />Approved</Badge>;
      case "rejected":
        return <Badge className="bg-danger text-danger-foreground gap-1"><XCircle className="h-3 w-3" />Rejected</Badge>;
      default:
        return <Badge className="bg-warning text-warning-foreground gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
    }
  };

  const counts = {
    pending: submissions.length,
  };

  return (
    <div>
      {/* Filter buttons */}
      <div className="mb-4 flex gap-2">
        {(["pending", "approved", "rejected", "all"] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="py-8 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /></div>
      ) : submissions.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">No {filter === "all" ? "" : filter} submissions found.</p>
      ) : (
        <div className="space-y-3">
          {submissions.map((sub) => (
            <Card key={sub.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-foreground">{sub.drug_name}</p>
                      {statusBadge(sub.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {sub.imprint} • {sub.shape} • {sub.color}
                    </p>
                    {sub.notes && (
                      <p className="mt-1 text-sm text-muted-foreground italic">"{sub.notes}"</p>
                    )}
                    {sub.reviewer_notes && (
                      <p className="mt-1 text-sm text-danger">Review: {sub.reviewer_notes}</p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(sub.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {sub.photo_url && (
                      <Button variant="ghost" size="icon" onClick={() => viewPhoto(sub.photo_url!)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    {sub.status === "pending" && (
                      <>
                        <Button
                          variant="success"
                          size="sm"
                          disabled={processing === sub.id}
                          onClick={() => approve(sub)}
                        >
                          {processing === sub.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle className="h-4 w-4" /> Approve</>}
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          disabled={processing === sub.id}
                          onClick={() => { setRejectDialog(sub.id); setRejectReason(""); }}
                        >
                          <XCircle className="h-4 w-4" /> Reject
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Reject Dialog */}
      <Dialog open={!!rejectDialog} onOpenChange={() => setRejectDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Submission</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Reason for rejection (shown to the user)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              maxLength={500}
              rows={3}
            />
            <Button variant="danger" className="w-full" onClick={reject} disabled={!!processing}>
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Rejection"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Photo Preview Dialog */}
      <Dialog open={!!photoUrl} onOpenChange={() => setPhotoUrl(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Submitted Photo</DialogTitle>
          </DialogHeader>
          {photoUrl && (
            <img src={photoUrl} alt="Submitted pill" className="w-full rounded-sm" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
