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
  Image as ImageIcon
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

  const handleFileSelect = useCallback((file: File) => {
    // Validate file type
    if (!file.type.startsWith("image/")) {
      setImageError("Please select an image file");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setImageError("Image must be less than 10MB");
      return;
    }

    setImageFile(file);
    setImageError(null);

    // Create preview
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
      // Call the edge function for analysis
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

      // Navigate to results with the report ID
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
      <div className="container py-8 md:py-12">
        <div className="mx-auto max-w-2xl">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-3xl font-bold md:text-4xl">Check a Pill</h1>
            <p className="text-muted-foreground">
              Upload a clear photo for analysis. Include a reference object like a coin for better accuracy.
            </p>
          </div>

          {/* Disclaimer */}
          <Disclaimer variant="compact" className="mb-8" />

          {/* Form */}
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
                    onClick={clearImage}
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
          </div>
        </div>
      </div>
    </Layout>
  );
}
