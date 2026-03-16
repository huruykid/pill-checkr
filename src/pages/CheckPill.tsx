import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEOHead, jsonLdWebApp } from "@/components/shared/SEOHead";
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
  Type,
  Search,
  Zap
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

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

const SCORINGS = [
  { value: "none", label: "None (no break line)" },
  { value: "single", label: "Single line" },
  { value: "double", label: "Cross / X pattern" },
  { value: "quad", label: "Four-way split" },
  { value: "other", label: "Other" },
];

export default function CheckPill() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backFileInputRef = useRef<HTMLInputElement>(null);
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [backImageFile, setBackImageFile] = useState<File | null>(null);
  const [backImagePreview, setBackImagePreview] = useState<string | null>(null);
  const [imprint, setImprint] = useState("");
  const [shape, setShape] = useState("");
  const [color, setColor] = useState("");
  const [scoring, setScoring] = useState("");
  const [sizeMm, setSizeMm] = useState("");
  const [hasReference, setHasReference] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const stepTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const [qualityFeedback, setQualityFeedback] = useState<QualityFeedback | null>(null);
  const [showRetakePrompt, setShowRetakePrompt] = useState(false);
  const [currentReportId, setCurrentReportId] = useState<string | null>(null);
  const [mode, setMode] = useState<"photo" | "quick">("photo");

  const handleFileSelect = useCallback((file: File, side: "front" | "back" = "front") => {
    if (!file.type.startsWith("image/")) {
      setImageError("Please select an image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setImageError("Image must be less than 10MB");
      return;
    }
    setImageError(null);
    const reader = new FileReader();
    if (side === "back") {
      setBackImageFile(file);
      reader.onload = (e) => setBackImagePreview(e.target?.result as string);
    } else {
      setImageFile(file);
      reader.onload = (e) => setImagePreview(e.target?.result as string);
    }
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

  const clearImage = (side: "front" | "back" = "front") => {
    if (side === "back") {
      setBackImageFile(null);
      setBackImagePreview(null);
      if (backFileInputRef.current) backFileInputRef.current.value = "";
    } else {
      setImageFile(null);
      setImagePreview(null);
      setImageError(null);
      setQualityFeedback(null);
      setShowRetakePrompt(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const uploadImage = async (file: File, suffix?: string): Promise<string | null> => {
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const base = crypto.randomUUID();
      const fileName = suffix ? `${base}_${suffix}.${ext}` : `${base}.${ext}`;
      const { error } = await supabase.storage
        .from("pill-images")
        .upload(fileName, file, { contentType: file.type });
      if (error) throw error;
      return fileName;
    } catch (err) {
      console.error("Image upload failed:", err);
      return null;
    }
  };

  const ANALYSIS_STEPS = mode === "photo" ? [
    { label: "Uploading image…", icon: Upload },
    { label: "Extracting features…", icon: Camera },
    { label: "Searching database…", icon: Search },
    { label: "Comparing visually…", icon: ImageIcon },
    { label: "Generating report…", icon: CheckCircle },
  ] : [
    { label: "Searching database…", icon: Search },
    { label: "Matching references…", icon: Zap },
    { label: "Generating report…", icon: CheckCircle },
  ];

  const clearStepTimers = () => {
    stepTimersRef.current.forEach(clearTimeout);
    stepTimersRef.current = [];
  };

  const handleQuickCheck = async () => {
    if (!imprint.trim()) {
      toast.error("Please enter an imprint / marking for quick check");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisStep(0);
    clearStepTimers();

    try {
      stepTimersRef.current.push(setTimeout(() => setAnalysisStep(1), 800));
      stepTimersRef.current.push(setTimeout(() => setAnalysisStep(2), 1600));

      const { data, error } = await supabase.functions.invoke("analyze-pill", {
        body: {
          quickCheck: true,
          imprint: imprint.trim(),
          shape: shape || null,
          color: color || null,
          scoring: scoring || null,
          estimatedSizeMm: sizeMm ? parseFloat(sizeMm) : null,
        },
      });

      clearStepTimers();
      setAnalysisStep(2);

      if (error) throw error;

      navigate(`/results/${data.reportId}`);
    } catch (error) {
      console.error("Quick check error:", error);
      toast.error("Failed to check pill. Please try again.");
    } finally {
      clearStepTimers();
      setIsAnalyzing(false);
      setAnalysisStep(0);
    }
  };

  const handleAnalyze = async () => {
    if (!imagePreview || !imageFile) {
      toast.error("Please upload an image first");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisStep(0);
    clearStepTimers();

    try {
      // Step 0: Uploading image
      const photoUrl = await uploadImage(imageFile);
      let backPhotoUrl: string | null = null;
      if (backImageFile && backImagePreview) {
        backPhotoUrl = await uploadImage(backImageFile, "back");
      }

      // Step 1: Extracting features (real call starts)
      setAnalysisStep(1);

      // Schedule simulated progress steps during the edge function call
      stepTimersRef.current.push(setTimeout(() => setAnalysisStep(2), 2000));
      stepTimersRef.current.push(setTimeout(() => setAnalysisStep(3), 4500));
      stepTimersRef.current.push(setTimeout(() => setAnalysisStep(4), 7000));

      // Call the edge function for analysis
      const { data, error } = await supabase.functions.invoke("analyze-pill", {
          body: {
            quickCheck: false,
            image: imagePreview,
            backImage: backImagePreview || null,
            imprint: imprint || null,
            shape: shape || null,
            color: color || null,
            scoring: scoring || null,
            estimatedSizeMm: sizeMm ? parseFloat(sizeMm) : null,
            hasReferenceObject: hasReference,
            photoUrl: photoUrl || null,
            backPhotoUrl: backPhotoUrl || null,
          },
      });

      clearStepTimers();
      setAnalysisStep(4); // Jump to final step on completion

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
        setAnalysisStep(0);
        return;
      }

      navigate(`/results/${data.reportId}`);
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error("Failed to analyze pill. Please try again.");
    } finally {
      clearStepTimers();
      setIsAnalyzing(false);
      setAnalysisStep(0);
    }
  };

  return (
    <Layout>
      <SEOHead
        title="Check a Pill | Fent Finder"
        description="Upload a photo of your pill to visually compare it against known reference images. Free, anonymous, and instant results."
        path="/check"
        jsonLd={jsonLdWebApp}
      />
      <div className="container py-8 md:py-12">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-3xl font-bold md:text-4xl">Check a Pill</h1>
            <p className="text-muted-foreground font-sans normal-case">
              Upload a clear photo for analysis. Include a reference object like a coin for better accuracy.
            </p>
          </div>

          <Disclaimer variant="compact" className="mb-8" />

          <div className="space-y-8">
            {/* Image Upload */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Pill Photo</Label>
              
              {!imagePreview ? (
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  className="relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 p-6 transition-colors hover:border-primary/50 hover:bg-accent/50"
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
                  <p className="mb-2 text-center font-medium text-foreground">
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
                <div className="relative overflow-hidden rounded-xl border border-border">
                  <img
                    src={imagePreview}
                    alt="Pill preview"
                    className="h-auto w-full max-h-[300px] object-contain bg-muted/30"
                  />
                  <button
                    type="button"
                    onClick={() => clearImage("front")}
                    className="absolute right-2 top-2 rounded-full bg-foreground/80 p-2 text-background transition-colors hover:bg-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <div className="absolute bottom-2 left-2 flex items-center gap-2 rounded-lg bg-success/90 px-3 py-1.5 text-sm text-success-foreground">
                    <CheckCircle className="h-4 w-4" />
                    Image uploaded
                  </div>
                </div>
              )}

              {imageError && (
                <div className="flex items-center gap-2 rounded-lg bg-danger-light px-3 py-2 text-sm text-danger">
                  <AlertCircle className="h-4 w-4" />
                  {imageError}
                </div>
              )}

              {/* Quality Feedback Panel */}
              {showRetakePrompt && qualityFeedback && (
                <div className="space-y-4 rounded-xl border-2 border-warning bg-warning/10 p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-warning" />
                    <div className="space-y-1">
                      <h3 className="font-semibold text-foreground">Low Image Quality Detected</h3>
                      <p className="text-sm text-muted-foreground">
                        The analysis may be inaccurate due to image quality issues. Consider retaking the photo.
                      </p>
                    </div>
                  </div>

                  {qualityFeedback.issues.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-foreground">Issues Found:</h4>
                      <div className="space-y-2">
                        {qualityFeedback.issues.map((issue, idx) => (
                          <div 
                            key={idx} 
                            className={`rounded-lg p-3 ${
                              issue.severity === "major" 
                                ? "bg-danger/10 border border-danger/20" 
                                : issue.severity === "moderate"
                                ? "bg-warning/10 border border-warning/20"
                                : "bg-muted/50 border border-border"
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-xs font-medium uppercase px-2 py-0.5 rounded ${
                                issue.severity === "major" 
                                  ? "bg-danger/20 text-danger" 
                                  : issue.severity === "moderate"
                                  ? "bg-warning/20 text-warning"
                                  : "bg-muted text-muted-foreground"
                              }`}>
                                {issue.severity}
                              </span>
                              <span className="font-medium text-foreground capitalize">{issue.issue}</span>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{issue.description}</p>
                            <div className="flex items-start gap-2 text-sm">
                              <Lightbulb className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
                              <span className="text-foreground">{issue.fix}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {qualityFeedback.recommendation && (
                    <div className="rounded-lg bg-primary/10 border border-primary/20 p-3">
                      <div className="flex items-start gap-2">
                        <Lightbulb className="h-5 w-5 mt-0.5 flex-shrink-0 text-primary" />
                        <div>
                          <h4 className="font-medium text-foreground mb-1">Top Recommendation</h4>
                          <p className="text-sm text-foreground">{qualityFeedback.recommendation}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <Button variant="outline" onClick={() => clearImage("front")} className="flex-1">
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Retake Photo
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        if (currentReportId) navigate(`/results/${currentReportId}`);
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

            {/* Back Image Upload (Optional) */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Back of Pill <span className="text-muted-foreground font-normal text-sm">(optional)</span></Label>
              
              {!backImagePreview ? (
                <div
                  className="relative flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 p-4 transition-colors hover:border-primary/50 hover:bg-accent/50"
                  onClick={() => backFileInputRef.current?.click()}
                >
                  <input
                    ref={backFileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect(file, "back");
                    }}
                  />
                  <ImageIcon className="mb-2 h-8 w-8 text-muted-foreground" />
                  <p className="text-center text-sm text-muted-foreground">
                    Upload back side for better accuracy
                  </p>
                </div>
              ) : (
                <div className="relative overflow-hidden rounded-xl border border-border">
                  <img
                    src={backImagePreview}
                    alt="Pill back preview"
                    className="h-auto w-full max-h-[200px] object-contain bg-muted/30"
                  />
                  <button
                    type="button"
                    onClick={() => clearImage("back")}
                    className="absolute right-2 top-2 rounded-full bg-foreground/80 p-2 text-background transition-colors hover:bg-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <div className="absolute bottom-2 left-2 flex items-center gap-2 rounded-lg bg-success/90 px-3 py-1.5 text-sm text-success-foreground">
                    <CheckCircle className="h-4 w-4" />
                    Back uploaded
                  </div>
                </div>
              )}
            </div>

            {/* Optional Fields */}
            <div className="space-y-4">
              <p className="text-sm font-medium text-muted-foreground">
                Optional: Add details to improve matching accuracy
              </p>

              <div className="space-y-2">
                <Label htmlFor="imprint">Imprint / Markings</Label>
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
                  <Label>Shape</Label>
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
                  <Label>Color</Label>
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

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Scoring / Break Lines <span className="text-muted-foreground font-normal text-sm">(optional)</span></Label>
                  <Select value={scoring} onValueChange={setScoring}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select scoring pattern" />
                    </SelectTrigger>
                    <SelectContent>
                      {SCORINGS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sizeMm">Size (mm) <span className="text-muted-foreground font-normal text-sm">(optional)</span></Label>
                  <Input
                    id="sizeMm"
                    type="number"
                    step="0.5"
                    min="1"
                    max="50"
                    placeholder="e.g., 8.5"
                    value={sizeMm}
                    onChange={(e) => setSizeMm(e.target.value)}
                    className="h-12"
                  />
                  <p className="text-xs text-muted-foreground">Diameter or length — place next to a coin for scale</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 rounded-lg bg-muted/50 p-4">
                <Checkbox
                  id="reference"
                  checked={hasReference}
                  onCheckedChange={(checked) => setHasReference(!!checked)}
                />
                <div className="space-y-1">
                  <Label htmlFor="reference" className="cursor-pointer font-medium">
                    I included a reference object (coin)
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Including a coin helps estimate the pill's actual size
                  </p>
                </div>
              </div>
            </div>

            {/* Analysis Progress */}
            {isAnalyzing && (
              <div className="rounded-xl border border-border bg-card p-5 space-y-4 animate-fade-in">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">Analyzing your pill…</span>
                    <span className="text-muted-foreground">{Math.round(((analysisStep + 1) / ANALYSIS_STEPS.length) * 100)}%</span>
                  </div>
                  <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
                      style={{ width: `${((analysisStep + 1) / ANALYSIS_STEPS.length) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  {ANALYSIS_STEPS.map((step, idx) => {
                    const isCompleted = idx < analysisStep;
                    const isCurrent = idx === analysisStep;
                    const StepIcon = step.icon;
                    return (
                      <div
                        key={idx}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all duration-300 ${
                          isCurrent
                            ? "bg-primary/10 border border-primary/20"
                            : isCompleted
                            ? "opacity-70"
                            : "opacity-30"
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle className="h-4 w-4 flex-shrink-0 text-success" />
                        ) : isCurrent ? (
                          <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin text-primary" />
                        ) : (
                          <StepIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                        )}
                        <span className={`text-sm font-sans normal-case ${
                          isCurrent ? "font-medium text-foreground" : "text-muted-foreground"
                        }`}>
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <Button
              variant="hero"
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
                <>Analyze Pill</>
              )}
            </Button>

            {!user && (
              <p className="text-center text-sm text-muted-foreground">
                <a href="/auth" className="text-primary hover:underline">Sign in</a> to save your check history automatically.
              </p>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
