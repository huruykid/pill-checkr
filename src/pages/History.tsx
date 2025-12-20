import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { RiskBadge } from "@/components/shared/RiskBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { History as HistoryIcon, Search, Trash2, AlertCircle } from "lucide-react";

interface HistoryItem {
  id: string;
  date: string;
  riskLevel: "low" | "medium" | "high";
  imprint: string | null;
  shape: string | null;
  color: string | null;
}

export default function History() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = () => {
    try {
      const stored = localStorage.getItem("pillCheckHistory");
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Error loading history:", error);
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = () => {
    localStorage.removeItem("pillCheckHistory");
    setHistory([]);
  };

  const removeItem = (id: string) => {
    const updated = history.filter((item) => item.id !== id);
    localStorage.setItem("pillCheckHistory", JSON.stringify(updated));
    setHistory(updated);
  };

  return (
    <Layout>
      <div className="container py-8 md:py-12">
        <div className="mx-auto max-w-2xl">
          {/* Header */}
          <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h1 className="text-3xl font-bold md:text-4xl">Check History</h1>
              <p className="mt-1 text-muted-foreground">
                Your previous pill checks
              </p>
            </div>
            {history.length > 0 && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={clearHistory}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Clear All
              </Button>
            )}
          </div>

          {/* Info Banner */}
          <div className="mb-6 flex items-start gap-3 rounded-lg bg-accent/50 p-4 text-sm">
            <AlertCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <p className="text-muted-foreground">
              History is stored locally in your browser. Sign in to sync across devices.
            </p>
          </div>

          {/* History List */}
          {loading ? (
            <div className="py-12 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : history.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <HistoryIcon className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
                <h3 className="mb-2 text-lg font-semibold">No history yet</h3>
                <p className="mb-6 text-muted-foreground">
                  Your pill check history will appear here
                </p>
                <Link to="/check">
                  <Button>
                    <Search className="mr-2 h-4 w-4" />
                    Check a Pill
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {history.map((item) => (
                <Card key={item.id} className="overflow-hidden transition-all hover:shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <Link 
                        to={`/results/${item.id}`}
                        className="flex-1 min-w-0"
                      >
                        <div className="flex items-center gap-4">
                          <RiskBadge level={item.riskLevel} size="sm" showIcon={false} />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-foreground truncate">
                              {item.imprint || "Unknown imprint"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {item.shape && `${item.shape}`}
                              {item.color && ` • ${item.color}`}
                              {item.date && ` • ${format(new Date(item.date), "MMM d, yyyy")}`}
                            </p>
                          </div>
                        </div>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(item.id)}
                        className="shrink-0 text-muted-foreground hover:text-danger"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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
