-- Add new fields to reports table
ALTER TABLE public.reports 
ADD COLUMN IF NOT EXISTS match_confidence public.confidence_level DEFAULT NULL,
ADD COLUMN IF NOT EXISTS anomaly_score integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS anomaly_reasons text[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS risk_reasons text[] DEFAULT NULL;

-- Add match_reasons to matches table
ALTER TABLE public.matches
ADD COLUMN IF NOT EXISTS match_reasons text DEFAULT NULL;

-- Create pill_reference_images table for reference images
CREATE TABLE IF NOT EXISTS public.pill_reference_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pill_reference_id UUID NOT NULL REFERENCES public.pill_reference(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on pill_reference_images
ALTER TABLE public.pill_reference_images ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Pill reference images are publicly readable"
ON public.pill_reference_images
FOR SELECT
USING (true);