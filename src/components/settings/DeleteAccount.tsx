import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Loader2, Trash2, TriangleAlert } from "lucide-react";

/** In-app account deletion — required by App Store Guideline 5.1.1(v). */
export function DeleteAccount() {
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-account", {
        body: { confirm: "DELETE" },
      });
      if (error || data?.error) throw new Error(error?.message || data?.error);
      // Clear anything cached locally as well.
      [
        "pillCheckHistory",
        "pc_onboarding_complete",
        "pc_session_id",
        "sessionId",
        "pc_alert_location",
        "safetyChecklist",
      ].forEach((k) => localStorage.removeItem(k));
      await supabase.auth.signOut();
      toast.success("Your account and data have been deleted.");
      navigate("/", { replace: true });
    } catch (e) {
      console.error(e);
      toast.error("Could not delete account. Please try again or contact support.");
      setDeleting(false);
    }
  };

  return (
    <Card className="mt-6 border-danger/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-danger">
          <TriangleAlert className="h-5 w-5" />
          Delete Account
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Permanently deletes your account, check history, uploaded pill photos, emergency contacts,
          test strip logs, and API keys. This cannot be undone.
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="gap-2">
              <Trash2 className="h-4 w-4" />
              Delete my account
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete your account?</AlertDialogTitle>
              <AlertDialogDescription>
                All of your data will be erased immediately. Type <strong>DELETE</strong> to confirm.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2">
              <Label htmlFor="confirm-delete">Confirmation</Label>
              <Input
                id="confirm-delete"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                autoComplete="off"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={confirmText !== "DELETE" || deleting}
                onClick={(e) => { e.preventDefault(); handleDelete(); }}
                className="bg-danger text-danger-foreground hover:bg-danger/90"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete permanently"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
