import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Disclaimer } from "@/components/shared/Disclaimer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Camera, 
  Upload, 
  X, 
  AlertCircle, 
  Loader2,
  CheckCircle,
  Image as ImageIcon,
  AlertTriangle,
  Lightbulb,
  RefreshCw,
  Skull
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface QualityIssue {
  issue: string;
  severity: "minor" | "moderate" | "major";
  description: string;
  fix: string;
}

interface QualityFeedback {
  quality: "good" | "fair" | "poor";
  issues: QualityIssue[];
  recommendation: string | null;
}

const SHAPES = [
  { value: "round", label: "Round" },
  { value: "oval", label: "Oval" },
  { value: "capsule", label: "Capsule" },
  { value: "diamond", label: "Diamond" },
  { value: "triangle", label: "Triangle" },
  { value: "hexagon", label: "Hexagon" },
  { value: "rectangle", label: "Rectangle/Bar" },
  { value: "other", label: "Other" },
];

const COLORS = [
  { value: "white", label: "White" },
  { value: "blue", label: "Blue" },
  { value: "yellow", label: "Yellow" },
  { value: "pink", label: "Pink" },
  { value: "green", label: "Green" },
  { value: "orange", label: "Orange" },
  { value: "red", label: "Red" },
  { value: "purple", label: "Purple" },
  { value: "gray", label: "Gray" },
  { value: "brown", label: "Brown" },
  { value: "tan", label: "Tan" },
  { value: "multicolor", label: "Multicolor" },
  { value: "other", label: "Other" },
];

export default function CheckPill() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imprint, setImprint] = useState("");
  const [shape, setShape] = useState("");
  const [color, setColor] = useState("");
  const [hasReference, setHasReference] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [qualityFeedback, setQualityFeedback] = useState<QualityFeedback | null>(null);
  const [showRetakePrompt, setShowRetakePrompt] = useState(false);
  const [currentReportId, setCurrentReportId] = useState<string | null>(null);

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      setImageError("Please select an image file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setImageError("Image must be less than 10MB");
      return;
    }

    setImageFile(file);
    setImageError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setImageError(null);
    setQualityFeedback(null);
    setShowRetakePrompt(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleAnalyze = async () => {
    if (!imagePreview) {
      toast.error("Please upload an image first");
      return;
    }

    setIsAnalyzing(true);

    try {
      const { data, error } = await supabase.functions.invoke("analyze-pill", {
        body: {
          image: imagePreview,
          imprint: imprint || null,
          shape: shape || null,
          color: color || null,
          hasReferenceObject: hasReference,
        },
      });

      if (error) throw error;

      const feedback: QualityFeedback = {
        quality: data.imageQuality,
        issues: data.qualityIssues || [],
        recommendation: data.overallRecommendation
      };
      setQualityFeedback(feedback);
      setCurrentReportId(data.reportId);

      if (data.imageQuality === "poor") {
        setShowRetakePrompt(true);
        toast.warning("Image quality is low. Consider retaking the photo for better results.");
        setIsAnalyzing(false);
        return;
      }

      navigate(`/results/${data.reportId}`);
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error("Failed to analyze pill. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Layout>
      {/* Hero Header */}
      <section className="relative bg-primary py-10 md:py-14 texture-skulls text-primary-foreground overflow-hidden">
        <div className="container relative z-10">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-sm bg-primary-foreground/10 px-4 py-2">
              <Skull className="h-5 w-5" />
              <span className="font-semibold uppercase tracking-wider text-sm">Pill Check</span>
            </div>
            <h1 className="font-display text-4xl md:text-5xl tracking-wide">
              CHECK A PILL
            </h1>
            <p className="mt-3 text-primary-foreground/80 font-sans">
              Upload a clear photo for analysis. Include a reference object like a coin for better accuracy.
            </p>
          </div>
        </div>
      </section>

      <div className="container py-8 md:py-12">
        <div className="mx-auto max-w-2xl">
          {/* Disclaimer */}
          <Disclaimer variant="compact" className="mb-8" />

          {/* Form */}
          <div className="space-y-8">
            {/* Image Upload */}
            <div className="space-y-3">
              <Label className="text-base font-display uppercase tracking-wide">Pill Photo</Label>
              
              {!imagePreview ? (
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  className="relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-sm border-2 border-dashed border-border bg-muted/30 p-6 transition-colors hover:border-primary/50 hover:bg-accent/50"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect(file);
                    }}
                  />
                  <ImageIcon className="mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="mb-2 text-center font-semibold text-foreground">
                    Drop image here or click to upload
                  </p>
                  <p className="text-center text-sm text-muted-foreground">
                    Supports JPEG, PNG, WEBP (max 10MB)
                  </p>
                  <div className="mt-4 flex gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Browse
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (fileInputRef.current) {
                          fileInputRef.current.setAttribute("capture", "environment");
                          fileInputRef.current.click();
                        }
                      }}
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      Camera
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="relative overflow-hidden rounded-sm border-2 border-border">
                  <img
                    src={imagePreview}
                    alt="Pill preview"
                    className="h-auto w-full max-h-[300px] object-contain bg-muted/30"
                  />
                  <button
                    type="button"
                    onClick={clearImage}
                    className="absolute right-2 top-2 rounded-full bg-foreground/80 p-2 text-background transition-colors hover:bg-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <div className="absolute bottom-2 left-2 flex items-center gap-2 rounded-sm bg-success/90 px-3 py-1.5 text-sm font-semibold uppercase text-success-foreground">
                    <CheckCircle className="h-4 w-4" />
                    Uploaded
                  </div>
                </div>
              )}

              {imageError && (
                <div className="flex items-center gap-2 rounded-sm bg-danger-light px-3 py-2 text-sm text-danger">
                  <AlertCircle className="h-4 w-4" />
                  {imageError}
                </div>
              )}

              {/* Quality Feedback Panel */}
              {showRetakePrompt && qualityFeedback && (
                <div className="space-y-4 rounded-sm border-2 border-warning bg-warning/10 p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-warning" />
                    <div className="space-y-1">
                      <h3 className="font-display uppercase text-foreground">Low Image Quality</h3>
                      <p className="text-sm text-muted-foreground font-sans">
                        The analysis may be inaccurate due to image quality issues. Consider retaking the photo.
                      </p>
                    </div>
                  </div>

                  {qualityFeedback.issues.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold uppercase text-foreground">Issues Found:</h4>
                      <div className="space-y-2">
                        {qualityFeedback.issues.map((issue, idx) => (
                          <div 
                            key={idx} 
                            className={`rounded-sm p-3 ${
                              issue.severity === "major" 
                                ? "bg-danger/10 border border-danger/20" 
                                : issue.severity === "moderate"
                                ? "bg-warning/10 border border-warning/20"
                                : "bg-muted/50 border border-border"
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-sm ${
                                issue.severity === "major" 
                                  ? "bg-danger/20 text-danger" 
                                  : issue.severity === "moderate"
                                  ? "bg-warning/20 text-warning"
                                  : "bg-muted text-muted-foreground"
                              }`}>
                                {issue.severity}
                              </span>
                              <span className="font-semibold text-foreground capitalize">{issue.issue}</span>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2 font-sans">{issue.description}</p>
                            <div className="flex items-start gap-2 text-sm">
                              <Lightbulb className="h-4 w-4 mt-0.5 flex-shrink-0 text-secondary" />
                              <span className="text-foreground font-sans">{issue.fix}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {qualityFeedback.recommendation && (
                    <div className="rounded-sm bg-secondary/20 border border-secondary/30 p-3">
                      <div className="flex items-start gap-2">
                        <Lightbulb className="h-5 w-5 mt-0.5 flex-shrink-0 text-secondary-foreground" />
                        <div>
                          <h4 className="font-display uppercase text-foreground mb-1">Top Tip</h4>
                          <p className="text-sm text-foreground font-sans">{qualityFeedback.recommendation}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <Button
                      variant="outline"
                      onClick={clearImage}
                      className="flex-1"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Retake Photo
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        if (currentReportId) {
                          navigate(`/results/${currentReportId}`);
                        }
                      }}
                      className="flex-1"
                      disabled={!currentReportId}
                    >
                      Continue Anyway
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Optional Fields */}
            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Optional Details
              </p>

              <div className="space-y-2">
                <Label htmlFor="imprint" className="font-display uppercase">Imprint / Markings</Label>
                <Input
                  id="imprint"
                  placeholder="e.g., M30, XANAX 2, G3722"
                  value={imprint}
                  onChange={(e) => setImprint(e.target.value)}
                  className="h-12"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="font-display uppercase">Shape</Label>
                  <Select value={shape} onValueChange={setShape}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select shape" />
                    </SelectTrigger>
                    <SelectContent>
                      {SHAPES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="font-display uppercase">Color</Label>
                  <Select value={color} onValueChange={setColor}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select color" />
                    </SelectTrigger>
                    <SelectContent>
                      {COLORS.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-3 rounded-sm bg-muted/50 p-4 border-2 border-border">
                <Checkbox
                  id="reference"
                  checked={hasReference}
                  onCheckedChange={(checked) => setHasReference(!!checked)}
                />
                <div className="space-y-1">
                  <Label htmlFor="reference" className="cursor-pointer font-semibold">
                    I included a reference object (coin)
                  </Label>
                  <p className="text-sm text-muted-foreground font-sans">
                    Including a coin helps estimate the pill's actual size
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              variant="default"
              size="xl"
              className="w-full"
              onClick={handleAnalyze}
              disabled={!imagePreview || isAnalyzing}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Skull className="h-5 w-5" />
                  Analyze Pill
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}