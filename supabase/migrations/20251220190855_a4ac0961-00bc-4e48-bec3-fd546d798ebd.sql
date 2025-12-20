-- Create enums for consistent data types
CREATE TYPE risk_level AS ENUM ('low', 'medium', 'high');
CREATE TYPE image_quality AS ENUM ('good', 'fair', 'poor');
CREATE TYPE confidence_level AS ENUM ('low', 'medium', 'high');
CREATE TYPE pill_shape AS ENUM ('round', 'oval', 'capsule', 'diamond', 'triangle', 'hexagon', 'rectangle', 'other');
CREATE TYPE pill_color AS ENUM ('white', 'blue', 'yellow', 'pink', 'green', 'orange', 'red', 'purple', 'gray', 'brown', 'tan', 'multicolor', 'other');

-- Pill reference database (for matching)
CREATE TABLE public.pill_reference (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  drug_name TEXT NOT NULL,
  imprint TEXT NOT NULL,
  shape pill_shape NOT NULL DEFAULT 'round',
  color pill_color NOT NULL DEFAULT 'white',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Reports table (user pill checks)
CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  imprint_text TEXT,
  shape pill_shape,
  color pill_color,
  photo_url TEXT,
  image_quality image_quality DEFAULT 'fair',
  risk_level risk_level DEFAULT 'medium',
  notes TEXT,
  has_reference_object BOOLEAN DEFAULT false
);

-- Matches table (results from matching)
CREATE TABLE public.matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL,
  drug_name TEXT NOT NULL,
  matched_imprint TEXT,
  matched_shape pill_shape,
  matched_color pill_color,
  confidence confidence_level DEFAULT 'low',
  explanation TEXT
);

-- Education posts
CREATE TABLE public.education_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  body TEXT NOT NULL,
  summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.pill_reference ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_posts ENABLE ROW LEVEL SECURITY;

-- Pill reference is publicly readable (reference data)
CREATE POLICY "Pill reference is publicly readable" ON public.pill_reference
  FOR SELECT USING (true);

-- Reports: users can see their own, anyone can insert
CREATE POLICY "Anyone can create reports" ON public.reports
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view their own reports" ON public.reports
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own reports" ON public.reports
  FOR UPDATE USING (auth.uid() = user_id);

-- Matches: readable if you can see the report
CREATE POLICY "Matches are readable with report access" ON public.matches
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.reports 
      WHERE reports.id = matches.report_id 
      AND (reports.user_id = auth.uid() OR reports.user_id IS NULL)
    )
  );

CREATE POLICY "Anyone can create matches" ON public.matches
  FOR INSERT WITH CHECK (true);

-- Education posts are publicly readable
CREATE POLICY "Education posts are publicly readable" ON public.education_posts
  FOR SELECT USING (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add trigger to education_posts
CREATE TRIGGER update_education_posts_updated_at
  BEFORE UPDATE ON public.education_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed pill reference data (demo dataset)
INSERT INTO public.pill_reference (drug_name, imprint, shape, color, notes) VALUES
  ('Oxycodone 30mg', 'M30', 'round', 'blue', 'Legitimate pharmaceutical - commonly counterfeited'),
  ('Oxycodone 30mg', 'A215', 'round', 'blue', 'Legitimate pharmaceutical - commonly counterfeited'),
  ('Alprazolam 2mg', 'XANAX 2', 'rectangle', 'white', 'Legitimate pharmaceutical - commonly counterfeited'),
  ('Alprazolam 2mg', 'G3722', 'rectangle', 'white', 'Legitimate pharmaceutical'),
  ('Alprazolam 1mg', 'XANAX 1.0', 'oval', 'blue', 'Legitimate pharmaceutical'),
  ('Hydrocodone 10mg', 'M367', 'capsule', 'white', 'Legitimate pharmaceutical'),
  ('Acetaminophen 500mg', 'TYLENOL 500', 'capsule', 'white', 'Over-the-counter pain reliever'),
  ('Ibuprofen 200mg', 'I-2', 'round', 'brown', 'Over-the-counter pain reliever'),
  ('Adderall 30mg', 'AD 30', 'round', 'orange', 'Legitimate pharmaceutical - commonly counterfeited'),
  ('Percocet 10mg', 'PERCOCET 10', 'oval', 'yellow', 'Legitimate pharmaceutical'),
  ('Oxycodone 15mg', 'M15', 'round', 'green', 'Legitimate pharmaceutical'),
  ('Fentanyl 100mcg', 'DURAGESIC', 'rectangle', 'tan', 'Transdermal patch - not a pill'),
  ('Morphine 30mg', 'ABG 30', 'round', 'purple', 'Legitimate pharmaceutical');

-- Seed education posts
INSERT INTO public.education_posts (title, slug, body, summary) VALUES
  ('Fake Pills 101', 'fake-pills-101', 
   '## What Are Counterfeit Pills?

Counterfeit pills are fake medications made to look like real prescription drugs. They often contain dangerous substances like fentanyl, methamphetamine, or other harmful fillers.

### Key Facts

- The DEA has found that 6 out of 10 counterfeit pills contain a potentially lethal dose of fentanyl
- Fake pills are nearly impossible to identify by appearance alone
- Even pills that look identical to real medications can be deadly

### How Are They Made?

Counterfeit pills are typically:
- Manufactured in illegal labs
- Pressed to look like real medications
- Sold on the street or through social media

### The Bottom Line

There is no way to know if a pill is counterfeit just by looking at it. The only way to be certain is through laboratory testing.',
   'Learn about counterfeit pills and why they are dangerous'),

  ('Understanding Fentanyl Risk', 'fentanyl-risk',
   '## Why Fentanyl Is So Dangerous

Fentanyl is a synthetic opioid that is 50-100 times more potent than morphine. Even a tiny amount can be fatal.

### Lethal Dose

- A lethal dose of fentanyl can be as small as 2 milligrams
- This is roughly the size of 5-7 grains of salt
- You cannot see, smell, or taste fentanyl in pills

### Signs of Fentanyl Overdose

- Slow, shallow breathing or no breathing
- Blue lips and fingertips
- Unresponsive to loud noise or pain
- Limp body, pale skin

### What To Do

If you suspect an overdose:
1. Call 911 immediately
2. Administer naloxone if available
3. Perform rescue breathing if trained
4. Stay with the person until help arrives',
   'Understanding why fentanyl contamination is deadly'),

  ('How to Take a Good Pill Photo', 'pill-photo-tips',
   '## Taking Quality Photos for Analysis

Good photos help improve the accuracy of pill identification. Follow these tips for best results.

### Lighting

- Use natural daylight when possible
- Avoid harsh shadows or direct sunlight
- Make sure the pill is evenly lit

### Background

- Use a plain, contrasting background
- White paper works well for dark pills
- Dark surface works well for light pills

### Focus

- Hold your camera steady
- Tap to focus on the pill
- Make sure the imprint is clearly visible

### Reference Object

- Include a coin (like a quarter) for size reference
- Keep the coin on the same surface as the pill
- This helps estimate the actual size

### Multiple Angles

- Take photos of both sides of the pill
- Capture the edge/thickness
- Get close-ups of any markings',
   'Tips for taking clear photos of pills'),

  ('Overdose Response Basics', 'overdose-response',
   '## Recognizing and Responding to Overdose

Quick action saves lives. Know the signs and how to respond.

### Signs of Opioid Overdose

- Unconscious or unresponsive
- Slow, shallow, or no breathing
- Choking or gurgling sounds
- Blue or gray lips/fingertips
- Pale, clammy skin

### SAVE A LIFE - Follow These Steps

1. **Call 911 immediately** - Most states have Good Samaritan laws that protect you
2. **Administer naloxone (Narcan)** if available
3. **Perform rescue breathing** - Tilt head back, lift chin, give 1 breath every 5 seconds
4. **Place in recovery position** - On their side to prevent choking
5. **Stay until help arrives**

### Good Samaritan Laws

Most states protect people who call 911 to report an overdose from drug possession charges. Check your local laws, but never hesitate to call for help.',
   'How to recognize and respond to an overdose'),

  ('Naloxone Basics', 'naloxone-basics',
   '## What Is Naloxone?

Naloxone (brand name Narcan) is a medication that can reverse an opioid overdose within minutes.

### How It Works

- Blocks opioid receptors in the brain
- Reverses breathing problems caused by overdose
- Works within 2-5 minutes
- Effects last 30-90 minutes

### Getting Naloxone

- Available without prescription in most states
- Free at many harm reduction programs
- Some pharmacies carry it over-the-counter
- Ask your doctor or pharmacist

### How to Use Nasal Spray

1. Peel back packaging to remove device
2. Hold with thumb on bottom and 2 fingers on nozzle
3. Insert nozzle into one nostril
4. Press firmly to release dose
5. If no response in 2-3 minutes, give second dose in other nostril

### Important Notes

- Naloxone only works on opioids
- The person may need multiple doses
- They may experience withdrawal symptoms
- Always call 911 - effects wear off before drugs clear the system',
   'Learn about naloxone and how to use it');