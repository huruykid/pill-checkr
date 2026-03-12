import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEOHead } from "@/components/shared/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, Upload, Clock, CheckCircle, XCircle, Users } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type PillShape = Database["public"]["Enums"]["pill_shape"];
type PillColor = Database["public"]["Enums"]["pill_color"];

const SHAPES: PillShape[] = ["round", "oval", "capsule", "diamond", "triangle", "hexagon", "rectangle", "other"];
const COLORS: PillColor[] = ["white", "blue", "yellow", "pink", "green", "orange", "red", "purple", "gray", "brown", "tan", "multicolor", "other"];

interface Submission {
  id: string;
  drug_name: string;
  imprint: string;
  shape: PillShape;
  color: PillColor;
  photo_url: string | null;
  notes: string | null;
  status: string;
  reviewer_notes: string | null;
  created_at: string;
}

export default function Contribute() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    drug_name: "",
    imprint: "",
    shape: "round" as PillShape,
    color: "white" as PillColor,
    notes: "",
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [backPhotoFile, setBackPhotoFile] = useState<File | null>(null);
  const [backPhotoPreview, setBackPhotoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) fetchSubmissions();
  }, [user]);

  const fetchSubmissions = async () => {
    setLoadingSubs(true);
    const { data, error } = await supabase
      .from("community_submissions")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) setSubmissions(data as Submission[]);
    setLoadingSubs(false);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Photo must be under 5MB");
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const drugName = form.drug_name.trim();
    const imprint = form.imprint.trim();

    if (!drugName || drugName.length > 200) {
      toast.error("Drug name is required (max 200 chars)");
      return;
    }
    if (!imprint || imprint.length > 100) {
      toast.error("Imprint is required (max 100 chars)");
      return;
    }

    setSubmitting(true);
    let photoUrl: string | null = null;
    let backPhotoUrl: string | null = null;

    if (photoFile) {
      setUploading(true);
      const ext = photoFile.name.split(".").pop() || "jpg";
      const path = `community/${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("pill-images")
        .upload(path, photoFile, { contentType: photoFile.type });

      if (uploadError) {
        toast.error("Photo upload failed");
        setSubmitting(false);
        setUploading(false);
        return;
      }
      photoUrl = path;
    }

    if (backPhotoFile) {
      setUploading(true);
      const ext = backPhotoFile.name.split(".").pop() || "jpg";
      const path = `community/${user.id}/${Date.now()}_back.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("pill-images")
        .upload(path, backPhotoFile, { contentType: backPhotoFile.type });

      if (uploadError) {
        toast.error("Back photo upload failed");
        setSubmitting(false);
        setUploading(false);
        return;
      }
      backPhotoUrl = path;
    }
    setUploading(false);

    const { error } = await supabase.from("community_submissions").insert({
      user_id: user.id,
      drug_name: drugName,
      imprint: imprint,
      shape: form.shape,
      color: form.color,
      notes: form.notes.trim() || null,
      photo_url: photoUrl,
      back_photo_url: backPhotoUrl,
    } as any);

    if (error) {
      toast.error("Submission failed. Please try again.");
    } else {
      toast.success("Submission received! An admin will review it.");
      setForm({ drug_name: "", imprint: "", shape: "round", color: "white", notes: "" });
      setPhotoFile(null);
      setPhotoPreview(null);
      setBackPhotoFile(null);
      setBackPhotoPreview(null);
      await fetchSubmissions();
    }

    setSubmitting(false);
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

  if (authLoading) {
    return (
      <Layout>
        <div className="container flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEOHead
        title="Contribute to the Pill Database — Fent Finder"
        description="Help build the community pill reference database. Submit pill details and photos to help keep others safe."
        path="/contribute"
      />
      <div className="container py-8 md:py-12">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8 flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold md:text-4xl">CONTRIBUTE</h1>
              <p className="text-muted-foreground">Help build a safer pill reference database</p>
            </div>
          </div>

          {/* Submission Form */}
          <Card className="mb-8 border-2 border-primary/30">
            <CardHeader>
              <CardTitle className="text-lg">Submit a Pill Entry</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Drug Name *</Label>
                  <Input
                    value={form.drug_name}
                    onChange={(e) => setForm({ ...form, drug_name: e.target.value })}
                    placeholder="e.g., Oxycodone 30mg"
                    maxLength={200}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Imprint *</Label>
                  <Input
                    value={form.imprint}
                    onChange={(e) => setForm({ ...form, imprint: e.target.value })}
                    placeholder="e.g., M30"
                    maxLength={100}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Shape</Label>
                    <Select value={form.shape} onValueChange={(v: PillShape) => setForm({ ...form, shape: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SHAPES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Color</Label>
                    <Select value={form.color} onValueChange={(v: PillColor) => setForm({ ...form, color: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {COLORS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Photo (optional)</Label>
                  <div className="flex items-center gap-4">
                    <label className="flex cursor-pointer items-center gap-2 rounded-sm border-2 border-dashed border-border px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground">
                      <Upload className="h-4 w-4" />
                      {photoFile ? photoFile.name : "Choose file"}
                      <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                    </label>
                    {photoPreview && (
                      <img src={photoPreview} alt="Preview" className="h-16 w-16 rounded-sm border border-border object-cover" />
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notes (optional)</Label>
                  <Textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Any additional details about this pill"
                    maxLength={500}
                    rows={3}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />{uploading ? "Uploading..." : "Submitting..."}</>
                  ) : (
                    "Submit for Review"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Past Submissions */}
          <h2 className="mb-4 text-xl font-bold">Your Submissions</h2>
          {loadingSubs ? (
            <div className="py-8 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /></div>
          ) : submissions.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No submissions yet. Be the first to contribute!</p>
          ) : (
            <div className="space-y-3">
              {submissions.map((sub) => (
                <Card key={sub.id} className="overflow-hidden">
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-foreground">{sub.drug_name}</p>
                        {statusBadge(sub.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {sub.imprint} • {sub.shape} • {sub.color}
                      </p>
                      {sub.status === "rejected" && sub.reviewer_notes && (
                        <p className="mt-1 text-sm text-danger">Reason: {sub.reviewer_notes}</p>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(sub.created_at).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
