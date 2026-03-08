import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ApiImportTab, type ApiImportParams, type ApiImportResult, type ImportStats } from "@/components/admin/ApiImportTab";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Pill, BookOpen, ShieldCheck, Database as DatabaseIcon } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type PillReference = Database["public"]["Tables"]["pill_reference"]["Row"];
type EducationPost = Database["public"]["Tables"]["education_posts"]["Row"];
type PillShape = Database["public"]["Enums"]["pill_shape"];
type PillColor = Database["public"]["Enums"]["pill_color"];

const SHAPES: PillShape[] = ["round", "oval", "capsule", "diamond", "triangle", "hexagon", "rectangle", "other"];
const COLORS: PillColor[] = ["white", "blue", "yellow", "pink", "green", "orange", "red", "purple", "gray", "brown", "tan", "multicolor", "other"];

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);

  const [pills, setPills] = useState<PillReference[]>([]);
  const [pillsLoading, setPillsLoading] = useState(true);
  const [pillDialog, setPillDialog] = useState(false);
  const [newPill, setNewPill] = useState<{ drug_name: string; imprint: string; shape: PillShape; color: PillColor; notes: string }>({
    drug_name: "",
    imprint: "",
    shape: "round",
    color: "white",
    notes: "",
  });

  const [posts, setPosts] = useState<EducationPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [postDialog, setPostDialog] = useState(false);
  const [newPost, setNewPost] = useState({ title: "", slug: "", summary: "", body: "" });

  const [importing, setImporting] = useState(false);
  const [latestImport, setLatestImport] = useState<ApiImportResult | null>(null);
  const [importStats, setImportStats] = useState<ImportStats | null>(null);

  const fetchPills = async () => {
    setPillsLoading(true);
    const { data, error } = await supabase.from("pill_reference").select("*").order("drug_name");

    if (error) {
      toast.error("Failed to load pill references");
      setPills([]);
    } else {
      setPills(data || []);
    }

    setPillsLoading(false);
  };

  const fetchPosts = async () => {
    setPostsLoading(true);
    const { data, error } = await supabase.from("education_posts").select("*").order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load education posts");
      setPosts([]);
    } else {
      setPosts(data || []);
    }

    setPostsLoading(false);
  };

  const fetchImportStats = async () => {
    const [
      totalCount,
      manualCount,
      rxImageCount,
      dailyMedCount,
      lastSync,
    ] = await Promise.all([
      supabase.from("pill_reference").select("id", { head: true, count: "exact" }),
      supabase.from("pill_reference").select("id", { head: true, count: "exact" }).eq("source", "manual"),
      supabase.from("pill_reference").select("id", { head: true, count: "exact" }).eq("source", "rximage"),
      supabase.from("pill_reference").select("id", { head: true, count: "exact" }).eq("source", "dailymed"),
      supabase
        .from("pill_reference")
        .select("last_synced")
        .not("last_synced", "is", null)
        .order("last_synced", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    setImportStats({
      total: totalCount.count || 0,
      manual: manualCount.count || 0,
      rximage: rxImageCount.count || 0,
      dailymed: dailyMedCount.count || 0,
      lastSyncedAt: lastSync.data?.last_synced || null,
    });
  };

  const checkAdmin = async () => {
    try {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!data) {
        toast.error("Access denied. Admin role required.");
        navigate("/");
        return;
      }

      setIsAdmin(true);
      await Promise.all([fetchPills(), fetchPosts(), fetchImportStats()]);
    } catch {
      navigate("/");
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }

    if (user) {
      void checkAdmin();
    }
  }, [user, authLoading, navigate]);

  const addPill = async () => {
    if (!newPill.drug_name || !newPill.imprint) {
      toast.error("Drug name and imprint are required");
      return;
    }

    const { error } = await supabase.from("pill_reference").insert({
      drug_name: newPill.drug_name,
      imprint: newPill.imprint,
      shape: newPill.shape,
      color: newPill.color,
      notes: newPill.notes || null,
    });

    if (error) {
      toast.error("Failed to add pill reference");
      return;
    }

    toast.success("Pill reference added");
    setPillDialog(false);
    setNewPill({ drug_name: "", imprint: "", shape: "round", color: "white", notes: "" });
    await Promise.all([fetchPills(), fetchImportStats()]);
  };

  const deletePill = async (id: string) => {
    const { error } = await supabase.from("pill_reference").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete");
      return;
    }

    toast.success("Deleted");
    await Promise.all([fetchPills(), fetchImportStats()]);
  };

  const addPost = async () => {
    if (!newPost.title || !newPost.slug || !newPost.body) {
      toast.error("Title, slug, and body are required");
      return;
    }

    const { error } = await supabase.from("education_posts").insert({
      title: newPost.title,
      slug: newPost.slug,
      summary: newPost.summary || null,
      body: newPost.body,
    });

    if (error) {
      toast.error("Failed to add post");
      return;
    }

    toast.success("Post added");
    setPostDialog(false);
    setNewPost({ title: "", slug: "", summary: "", body: "" });
    await fetchPosts();
  };

  const deletePost = async (id: string) => {
    const { error } = await supabase.from("education_posts").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete");
      return;
    }

    toast.success("Deleted");
    await fetchPosts();
  };

  const runApiImport = async ({ source, category, limit, dryRun }: ApiImportParams) => {
    setImporting(true);

    try {
      const { data, error } = await supabase.functions.invoke("import-pill-data", {
        body: { source, category, limit, dryRun, enrichLimit: limit },
      });

      if (error) throw error;

      const result = data as ApiImportResult;
      setLatestImport(result);

      toast.success(
        dryRun
          ? `Dry run complete: ${result.inserted} insertable, ${result.updated} updatable, ${result.duplicatesSkipped} duplicates`
          : `Import complete: ${result.inserted} inserted, ${result.updated} updated, ${result.enriched} enriched`,
      );

      await Promise.all([fetchPills(), fetchImportStats()]);
    } catch (error) {
      console.error(error);
      toast.error("Import failed. Please try again.");
    } finally {
      setImporting(false);
    }
  };

  if (authLoading || checking) {
    return (
      <Layout>
        <div className="container flex min-h-[50vh] items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!isAdmin) return null;

  return (
    <Layout>
      <div className="container py-8 md:py-12">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold md:text-4xl">ADMIN PANEL</h1>
          </div>

          <Tabs defaultValue="pills">
            <TabsList className="mb-6">
              <TabsTrigger value="pills" className="gap-2">
                <Pill className="h-4 w-4" />
                Pill References ({pills.length})
              </TabsTrigger>
              <TabsTrigger value="education" className="gap-2">
                <BookOpen className="h-4 w-4" />
                Education ({posts.length})
              </TabsTrigger>
              <TabsTrigger value="imports" className="gap-2">
                <DatabaseIcon className="h-4 w-4" />
                API Import
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pills">
              <div className="mb-4 flex justify-end">
                <Dialog open={pillDialog} onOpenChange={setPillDialog}>
                  <DialogTrigger asChild>
                    <Button><Plus className="h-4 w-4" /> Add Pill Reference</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>ADD PILL REFERENCE</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Drug Name *</Label>
                        <Input value={newPill.drug_name} onChange={(e) => setNewPill({ ...newPill, drug_name: e.target.value })} placeholder="e.g., Oxycodone 30mg" />
                      </div>
                      <div className="space-y-2">
                        <Label>Imprint *</Label>
                        <Input value={newPill.imprint} onChange={(e) => setNewPill({ ...newPill, imprint: e.target.value })} placeholder="e.g., M30" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Shape</Label>
                          <Select value={newPill.shape} onValueChange={(value: PillShape) => setNewPill({ ...newPill, shape: value })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {SHAPES.map((shape) => <SelectItem key={shape} value={shape}>{shape}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Color</Label>
                          <Select value={newPill.color} onValueChange={(value: PillColor) => setNewPill({ ...newPill, color: value })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {COLORS.map((color) => <SelectItem key={color} value={color}>{color}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Notes</Label>
                        <Textarea value={newPill.notes} onChange={(e) => setNewPill({ ...newPill, notes: e.target.value })} placeholder="Optional notes" />
                      </div>
                      <Button onClick={addPill} className="w-full">Add Reference</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              {pillsLoading ? (
                <div className="py-8 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /></div>
              ) : (
                <div className="space-y-2">
                  {pills.map((pill) => (
                    <Card key={pill.id} className="overflow-hidden">
                      <CardContent className="flex items-center justify-between p-4">
                        <div>
                          <p className="font-semibold text-foreground">{pill.drug_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {pill.imprint} • {pill.shape} • {pill.color}
                          </p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => deletePill(pill.id)} className="text-muted-foreground hover:text-danger">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="education">
              <div className="mb-4 flex justify-end">
                <Dialog open={postDialog} onOpenChange={setPostDialog}>
                  <DialogTrigger asChild>
                    <Button><Plus className="h-4 w-4" /> Add Post</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>ADD EDUCATION POST</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Title *</Label>
                        <Input value={newPost.title} onChange={(e) => setNewPost({ ...newPost, title: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Slug *</Label>
                        <Input value={newPost.slug} onChange={(e) => setNewPost({ ...newPost, slug: e.target.value })} placeholder="url-friendly-slug" />
                      </div>
                      <div className="space-y-2">
                        <Label>Summary</Label>
                        <Input value={newPost.summary} onChange={(e) => setNewPost({ ...newPost, summary: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Body * (Markdown)</Label>
                        <Textarea value={newPost.body} onChange={(e) => setNewPost({ ...newPost, body: e.target.value })} rows={10} />
                      </div>
                      <Button onClick={addPost} className="w-full">Add Post</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              {postsLoading ? (
                <div className="py-8 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /></div>
              ) : (
                <div className="space-y-2">
                  {posts.map((post) => (
                    <Card key={post.id} className="overflow-hidden">
                      <CardContent className="flex items-center justify-between p-4">
                        <div>
                          <p className="font-semibold text-foreground">{post.title}</p>
                          <p className="text-sm text-muted-foreground">/{post.slug}</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => deletePost(post.id)} className="text-muted-foreground hover:text-danger">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="imports">
              <ApiImportTab
                isImporting={importing}
                latestImport={latestImport}
                stats={importStats}
                onImport={runApiImport}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}
