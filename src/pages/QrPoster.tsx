import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useI18n, LANGUAGES, type Language } from "@/hooks/useI18n";
import { SITE_URL } from "@/components/shared/SEOHead";
import { appStoreUrl, APP_STORE_LIVE } from "@/components/shared/AppStoreBadge";
import { Printer } from "lucide-react";

/**
 * Printable one-page poster (Letter or A4) for syringe service programs,
 * venues, campuses, pharmacies. Print to PDF from the browser: no PDF
 * dependency. Each poster gets its own ?c= code so its scans are separable.
 *
 *   /qr?c=ssp-downtown&lang=es
 *
 * QR target: the App Store campaign link once the listing is live, else the
 * web landing page. Both work forever; the landing page also works before
 * launch, which is why posters can be printed early.
 */
export default function QrPoster() {
  const { t, lang, setLang } = useI18n();
  const [params] = useSearchParams();
  const campaign = (params.get("c") || "poster").replace(/[^a-z0-9_-]/gi, "").slice(0, 40) || "poster";
  const [svg, setSvg] = useState<string>("");

  useEffect(() => {
    const wanted = params.get("lang");
    if (wanted && LANGUAGES.includes(wanted as Language) && wanted !== lang) setLang(wanted as Language);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const target = useMemo(() => {
    const web = `${SITE_URL}/go?c=${campaign}${lang !== "en" ? `&lang=${lang}` : ""}`;
    return APP_STORE_LIVE ? appStoreUrl(campaign) : web;
  }, [campaign, lang]);

  useEffect(() => {
    // Lazy import keeps the QR library out of the main bundle.
    import("qrcode-generator").then((m) => {
      const qrcode = m.default;
      const qr = qrcode(0, "M");
      qr.addData(target);
      qr.make();
      setSvg(qr.createSvgTag({ cellSize: 8, margin: 2, scalable: true }));
    });
  }, [target]);

  return (
    <div className="min-h-dvh bg-white text-black">
      <style>{`
        @page { size: auto; margin: 12mm; }
        @media print {
          .no-print { display: none !important; }
          .poster { box-shadow: none !important; border: none !important; }
          html, body { background: #fff !important; }
        }
      `}</style>

      <div className="no-print mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-4">
        <p className="text-sm text-neutral-600">
          Campaign code <code className="rounded bg-neutral-100 px-1.5 py-0.5">{campaign}</code> · QR opens {target}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setLang(lang === "es" ? "en" : "es")}>
            {lang === "es" ? "English" : "Español"}
          </Button>
          <Button size="sm" className="gap-2" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print / Save PDF
          </Button>
        </div>
      </div>

      <article className="poster mx-auto flex w-[210mm] max-w-full flex-col items-center border border-neutral-200 bg-white px-[16mm] py-[14mm] text-center shadow-lg print:w-auto">
        <h1 className="font-display text-[44pt] leading-[0.95] tracking-wide">{t("poster.headline")}</h1>
        <p className="mt-3 font-display text-[30pt] leading-none text-red-600">{t("poster.sub")}</p>

        <div
          className="my-8 w-[92mm] [&_svg]:h-auto [&_svg]:w-full"
          dangerouslySetInnerHTML={{ __html: svg }}
          aria-label="QR code"
        />

        <p className="max-w-[150mm] text-[15pt] leading-snug">
          {t("poster.line1")}<br />{t("poster.line2")}<br />{t("poster.line3")}
        </p>

        <p className="mt-5 rounded-full border-2 border-black px-5 py-1.5 text-[13pt] font-semibold">{t("poster.free")}</p>

        <p className="mt-6 max-w-[150mm] text-[11pt] leading-snug text-neutral-700">{t("poster.never")}</p>

        <div className="mt-6 flex items-center gap-3 text-[11pt] text-neutral-600">
          <span className="font-display text-[16pt] text-black">PILL CHECKR</span>
          <span>·</span>
          <span>{SITE_URL.replace(/^https?:\/\//, "")}/go</span>
        </div>
      </article>
    </div>
  );
}
