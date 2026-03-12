import { createContext, useContext, useState, ReactNode } from "react";

type Language = "en" | "es";

interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Results page
    "results.title": "Analysis Results",
    "results.backToCheck": "Back to Check",
    "results.possibleMatches": "Possible Matches",
    "results.noMatch": "Unable to match to known references",
    "results.noMatchDesc": "This pill could not be confidently matched to any entries in our reference database.",
    "results.uncertaintyTitle": "Uncertainty & Consistency Check",
    "results.matchBreakdown": "Match Breakdown",
    "results.imprintMatch": "Imprint Match",
    "results.colorSimilarity": "Color Similarity",
    "results.shapeMatch": "Shape Match",
    "results.sizeConsistency": "Size Consistency",
    "results.inconsistencyScore": "Inconsistency Score",
    "results.highInconsistency": "High inconsistency",
    "results.moderateInconsistency": "Moderate inconsistency",
    "results.lowInconsistency": "Low inconsistency",
    "results.matchConfidence": "Match Confidence",
    "results.consistencyNotes": "Consistency notes:",
    "results.riskNotes": "Risk assessment notes:",
    "results.poorImage": "Image quality is poor - results may be less accurate",
    "results.whatToDoNext": "What To Do Next",
    "results.saveToAccount": "Save to Account",
    "results.saveToHistory": "Save to History",
    "results.checkAnother": "Check Another Pill",
    "results.visualComparison": "Visual Comparison",
    "results.noRefImage": "No reference image — visual comparison not available",
    "results.openFullMap": "Open Full Map — Find Treatment Centers & Naloxone Near You",

    // Harm reduction steps
    "steps.1": "Never use alone - have someone with you who can call for help",
    "steps.2": "Start with a small test dose and wait to feel effects",
    "steps.3": "Have naloxone (Narcan) available and know how to use it",
    "steps.4": "Know the signs of overdose: slow breathing, blue lips, unresponsive",
    "steps.5": "If unable to confidently match, treat as higher risk",
    "steps.6": "Call 911 immediately if you suspect an overdose",

    // Emergency bar
    "emergency.title": "🆘 Emergency",
    "emergency.911": "911",
    "emergency.poisonControl": "Poison Control",
    "emergency.988": "988 Crisis",
    "emergency.footer": "If you or someone else is in danger, call immediately. Good Samaritan laws protect you in most states.",

    // Harm reduction resources
    "hr.title": "Harm Reduction Resources",
    "hr.findHelp": "Find help near you →",
    "hr.crisisLines": "Crisis Lines",
    "hr.neverUseAlone": "Never Use Alone",
    "hr.neverUseAloneDesc": "1-800-484-3731 — Stay on the line while you use. They'll call 911 if you stop responding.",
    "hr.988Title": "988 Suicide & Crisis Lifeline",
    "hr.988Desc": "Call or text 988 — Free, confidential, 24/7 support.",
    "hr.testStripsTitle": "Fentanyl Test Strips",
    "hr.testStripsDesc": "Fentanyl test strips can detect fentanyl in pills, powders, and liquids. They cost ~$1 each and take 2-5 minutes.",
    "hr.getTestStrips": "Get Test Strips",
    "hr.naloxoneTitle": "Get Naloxone (Narcan)",
    "hr.naloxoneDesc": "Naloxone reverses opioid overdoses and can save lives. It's available without a prescription in most states. Carry it even if you don't use — you might save someone else.",
    "hr.freeByMail": "Free by Mail (NEXT Distro)",
    "hr.findNaloxone": "Find Naloxone Near Me",

    // Nav
    "nav.language": "EN",
  },
  es: {
    // Results page
    "results.title": "Resultados del Análisis",
    "results.backToCheck": "Volver a Verificar",
    "results.possibleMatches": "Posibles Coincidencias",
    "results.noMatch": "No se pudo identificar con referencias conocidas",
    "results.noMatchDesc": "Esta pastilla no pudo ser identificada con confianza en nuestra base de datos de referencia.",
    "results.uncertaintyTitle": "Verificación de Incertidumbre y Consistencia",
    "results.matchBreakdown": "Desglose de Coincidencia",
    "results.imprintMatch": "Coincidencia de Grabado",
    "results.colorSimilarity": "Similitud de Color",
    "results.shapeMatch": "Coincidencia de Forma",
    "results.sizeConsistency": "Consistencia de Tamaño",
    "results.inconsistencyScore": "Puntuación de Inconsistencia",
    "results.highInconsistency": "Alta inconsistencia",
    "results.moderateInconsistency": "Inconsistencia moderada",
    "results.lowInconsistency": "Baja inconsistencia",
    "results.matchConfidence": "Confianza de Coincidencia",
    "results.consistencyNotes": "Notas de consistencia:",
    "results.riskNotes": "Notas de evaluación de riesgo:",
    "results.poorImage": "La calidad de la imagen es baja — los resultados pueden ser menos precisos",
    "results.whatToDoNext": "Qué Hacer Ahora",
    "results.saveToAccount": "Guardar en Cuenta",
    "results.saveToHistory": "Guardar en Historial",
    "results.checkAnother": "Verificar Otra Pastilla",
    "results.visualComparison": "Comparación Visual",
    "results.noRefImage": "Sin imagen de referencia — comparación visual no disponible",
    "results.openFullMap": "Abrir Mapa — Encontrar Centros de Tratamiento y Naloxona Cerca",

    // Harm reduction steps
    "steps.1": "Nunca uses solo/a — ten a alguien contigo que pueda pedir ayuda",
    "steps.2": "Comienza con una dosis pequeña de prueba y espera a sentir los efectos",
    "steps.3": "Ten naloxona (Narcan) disponible y aprende a usarla",
    "steps.4": "Conoce los signos de sobredosis: respiración lenta, labios azules, sin respuesta",
    "steps.5": "Si no se puede identificar con confianza, trátala como de mayor riesgo",
    "steps.6": "Llama al 911 inmediatamente si sospechas una sobredosis",

    // Emergency bar
    "emergency.title": "🆘 Emergencia",
    "emergency.911": "911",
    "emergency.poisonControl": "Control de Envenenamiento",
    "emergency.988": "988 Crisis",
    "emergency.footer": "Si tú o alguien más está en peligro, llama inmediatamente. Las leyes del Buen Samaritano te protegen en la mayoría de los estados.",

    // Harm reduction resources
    "hr.title": "Recursos de Reducción de Daños",
    "hr.findHelp": "Encuentra ayuda cerca →",
    "hr.crisisLines": "Líneas de Crisis",
    "hr.neverUseAlone": "Nunca Uses Solo/a",
    "hr.neverUseAloneDesc": "1-800-484-3731 — Quédate en la línea mientras usas. Llamarán al 911 si dejas de responder.",
    "hr.988Title": "988 Línea de Crisis y Prevención del Suicidio",
    "hr.988Desc": "Llama o envía un mensaje al 988 — Gratis, confidencial, apoyo 24/7.",
    "hr.testStripsTitle": "Tiras de Prueba de Fentanilo",
    "hr.testStripsDesc": "Las tiras de prueba pueden detectar fentanilo en pastillas, polvos y líquidos. Cuestan ~$1 cada una y toman 2-5 minutos.",
    "hr.getTestStrips": "Obtener Tiras de Prueba",
    "hr.naloxoneTitle": "Obtener Naloxona (Narcan)",
    "hr.naloxoneDesc": "La naloxona revierte sobredosis de opioides y puede salvar vidas. Está disponible sin receta en la mayoría de los estados. Llévala aunque no uses — podrías salvar a alguien.",
    "hr.freeByMail": "Gratis por Correo (NEXT Distro)",
    "hr.findNaloxone": "Encontrar Naloxona Cerca",

    // Nav
    "nav.language": "ES",
  },
};

const I18nContext = createContext<I18nContextType>({
  lang: "en",
  setLang: () => {},
  t: (key: string) => key,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem("ff_lang");
    return (saved === "es" ? "es" : "en") as Language;
  });

  const handleSetLang = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem("ff_lang", newLang);
  };

  const t = (key: string): string => {
    return translations[lang][key] || translations.en[key] || key;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang: handleSetLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export const useI18n = () => useContext(I18nContext);
