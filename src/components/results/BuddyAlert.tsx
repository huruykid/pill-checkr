import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/hooks/useI18n";
import { Button } from "@/components/ui/button";
import { Users, MessageSquare, Mail, Phone } from "lucide-react";
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

// `?&body=` is the form both iOS Messages and Android accept.
const smsHref = (message: string, phone = "") =>
  `sms:${phone.replace(/[^\d+]/g, "")}?&body=${encodeURIComponent(message)}`;

// The message leaves from the person's own phone (share sheet, Messages, Mail).
// Stamped sends and stores nothing, so it works for guests and never claims a
// delivery it can't make.
export function BuddyAlert({ riskLevel, className }: BuddyAlertProps) {
  const { user } = useAuth();
  const { t } = useI18n();
  const [contacts, setContacts] = useState<Contact[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("emergency_contacts")
      .select("*")
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (error) console.error("Error fetching contacts:", error);
        else setContacts(data || []);
      });
  }, [user]);

  // Only show for high risk
  if (riskLevel !== "high") return null;

  const message = t("buddy.message");

  const textFriend = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ text: message });
        return;
      } catch (e) {
        if ((e as DOMException)?.name === "AbortError") return;
      }
    }
    window.location.href = smsHref(message);
  };

  return (
    <div className={`rounded-lg border-2 border-danger/40 bg-danger-light p-5 ${className || ""}`}>
      <div className="flex items-center gap-3 mb-2">
        <Users className="h-6 w-6 text-danger shrink-0" />
        <h3 className="font-bold text-danger-text text-lg">{t("buddy.title")}</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">{t("buddy.body")}</p>

      <div className="space-y-2">
        {contacts.map((c) =>
          c.phone ? (
            <Button key={c.id} asChild variant="danger" className="w-full min-h-11 gap-2 font-bold">
              <a href={smsHref(message, c.phone)}>
                <MessageSquare className="h-5 w-5" />
                {t("buddy.textContact").replace("{name}", c.name)}
              </a>
            </Button>
          ) : c.email ? (
            <Button key={c.id} asChild variant="outline" className="w-full min-h-11 gap-2">
              <a href={`mailto:${c.email}?body=${encodeURIComponent(message)}`}>
                <Mail className="h-5 w-5" />
                {t("buddy.emailContact").replace("{name}", c.name)}
              </a>
            </Button>
          ) : null,
        )}

        <Button
          variant={contacts.some((c) => c.phone) ? "outline" : "danger"}
          className="w-full min-h-11 gap-2 font-bold"
          onClick={textFriend}
        >
          <MessageSquare className="h-5 w-5" />
          {t("buddy.textFriend")}
        </Button>

        <Button asChild variant="outline" className="w-full min-h-11 gap-2">
          <a href="tel:18004843731">
            <Phone className="h-5 w-5" />
            {t("buddy.callNUA")}
          </a>
        </Button>
        <p className="text-xs text-muted-foreground">{t("buddy.nuaDesc")}</p>

        {user && contacts.length === 0 && (
          <Link to="/settings" className="inline-flex items-center min-h-11 text-sm text-primary hover:underline">
            {t("buddy.addContacts")}
          </Link>
        )}
      </div>
    </div>
  );
}
