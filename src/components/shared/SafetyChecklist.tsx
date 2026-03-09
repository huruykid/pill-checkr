import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ExternalLink, ShieldCheck } from "lucide-react";

const STORAGE_KEY = "safetyChecklist";

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  link?: { url: string; text: string };
}

const items: ChecklistItem[] = [
  {
    id: "naloxone",
    label: "Get Narcan/naloxone",
    description: "Naloxone reverses opioid overdoses. Free by mail or at pharmacies.",
    link: { url: "https://nextdistro.org/naloxone", text: "Get free naloxone" },
  },
  {
    id: "test-strips",
    label: "Get fentanyl test strips",
    description: "Inexpensive strips that detect fentanyl in pills and powders.",
    link: { url: "https://dancesafe.org/product/fentanyl-test-strips-pack-of-10-free-shipping/", text: "Order test strips" },
  },
  {
    id: "hotline",
    label: "Save the Never Use Alone number",
    description: "1-800-484-3731 — They stay on the line and call 911 if you go unresponsive.",
    link: { url: "tel:18004843731", text: "Call now" },
  },
  {
    id: "rescue-breathing",
    label: "Learn rescue breathing",
    description: "Know how to keep someone alive until help arrives.",
    link: { url: "/education", text: "Read our guide" },
  },
  {
    id: "tell-someone",
    label: "Tell someone you trust",
    description: "Let a friend, family member, or partner know — they could save your life.",
  },
];

export function SafetyChecklist() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setChecked(JSON.parse(saved));
    } catch {}
  }, []);

  const toggle = (id: string) => {
    const next = { ...checked, [id]: !checked[id] };
    setChecked(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const completedCount = items.filter((i) => checked[i.id]).length;
  const progress = Math.round((completedCount / items.length) * 100);

  return (
    <Card className="mb-8 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Safety Kit Checklist
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Prepare yourself — completing these steps could save a life.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {completedCount} of {items.length} complete
            </span>
            <span className="font-medium text-primary">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/30"
            >
              <Checkbox
                id={item.id}
                checked={!!checked[item.id]}
                onCheckedChange={() => toggle(item.id)}
                className="mt-0.5"
              />
              <div className="flex-1">
                <Label
                  htmlFor={item.id}
                  className={`cursor-pointer font-medium ${
                    checked[item.id] ? "line-through text-muted-foreground" : "text-foreground"
                  }`}
                >
                  {item.label}
                </Label>
                <p className="mt-0.5 text-sm text-muted-foreground">{item.description}</p>
                {item.link && (
                  <a
                    href={item.link.url}
                    target={item.link.url.startsWith("http") ? "_blank" : undefined}
                    rel={item.link.url.startsWith("http") ? "noopener noreferrer" : undefined}
                    className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                  >
                    {item.link.text}
                    {item.link.url.startsWith("http") && <ExternalLink className="h-3 w-3" />}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
