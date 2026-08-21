import { useState } from "react";
import { AlertTriangle, Shield, Heart, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/useI18n";

const ONBOARDING_KEY = "pc_onboarding_complete";

interface OnboardingWalkthroughProps {
  onComplete: () => void;
}

export function OnboardingWalkthrough({ onComplete }: OnboardingWalkthroughProps) {
  const { t } = useI18n();
  const [step, setStep] = useState(0);

  const steps = [
    {
      icon: <AlertTriangle className="h-12 w-12 text-danger" />,
      title: t("onboarding.step1Title"),
      description: t("onboarding.step1Desc"),
      bg: "bg-danger-light",
      border: "border-danger/30",
    },
    {
      icon: <Shield className="h-12 w-12 text-primary" />,
      title: t("onboarding.step2Title"),
      description: t("onboarding.step2Desc"),
      bg: "bg-card",
      border: "border-border",
    },
    {
      icon: <Heart className="h-12 w-12 text-success" />,
      title: t("onboarding.step3Title"),
      description: t("onboarding.step3Desc"),
      bg: "bg-success-light",
      border: "border-success/30",
    },
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      localStorage.setItem(ONBOARDING_KEY, "true");
      onComplete();
    }
  };

  const handleSkip = () => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    onComplete();
  };

  const current = steps[step];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 backdrop-blur-sm p-4">
      <div className={cn("relative w-full max-w-md rounded-2xl border-2 p-8 shadow-xl animate-fade-in", current.bg, current.border)}>
        <button
          onClick={handleSkip}
          className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex flex-col items-center text-center gap-5">
          {current.icon}
          
          <h2 className="text-2xl font-bold text-foreground">{current.title}</h2>
          
          <p className="text-sm text-muted-foreground leading-relaxed font-sans normal-case">
            {current.description}
          </p>

          {/* Progress dots */}
          <div className="flex gap-2">
            {steps.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-2 rounded-full transition-all",
                  i === step ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30"
                )}
              />
            ))}
          </div>

          <Button onClick={handleNext} size="lg" className="w-full gap-2">
            {step < steps.length - 1 ? (
              <>
                {t("onboarding.next")}
                <ArrowRight className="h-4 w-4" />
              </>
            ) : (
              t("onboarding.getStarted")
            )}
          </Button>

          {step < steps.length - 1 && (
            <button
              onClick={handleSkip}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("onboarding.skip")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function useOnboardingComplete(): boolean {
  return localStorage.getItem(ONBOARDING_KEY) === "true";
}
