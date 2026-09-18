"use client";

import { Building2, Check, CircleAlert, Copy, GraduationCap, KeyRound, Loader2, RefreshCw, Telescope, User } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { submitAccessRequest, TIERS, type AccessTier } from "@/lib/access-request";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LiquidMetalButton } from "@/components/ui/liquid-metal-button";
import { Textarea } from "@/components/ui/textarea";

const TIER_ICONS: Record<AccessTier, typeof GraduationCap> = {
  academic: GraduationCap,
  observatory: Telescope,
  independent: User,
};

const PRODUCTS = ["Horizon imaging", "Lensing models", "Transient alerts", "Spectroscopy", "Raw VLBI"];
const MIN_USE_CASE = 40;

interface Values {
  name: string;
  email: string;
  organization: string;
  tier: AccessTier;
  useCase: string;
  products: string[];
  agree: boolean;
}

type Field = "name" | "email" | "organization" | "useCase" | "agree";
type Errors = Partial<Record<Field, string>>;

function validate(v: Values): Errors {
  const errors: Errors = {};
  if (v.name.trim().length < 2) errors.name = "Please enter your full name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email.trim())) errors.email = "Enter a valid email address.";
  if (v.tier !== "independent" && v.organization.trim().length < 2) {
    errors.organization = "Institution or facility is required for this tier.";
  }
  if (v.useCase.trim().length < MIN_USE_CASE) {
    errors.useCase = `Tell us a little more (at least ${MIN_USE_CASE} characters).`;
  }
  if (!v.agree) errors.agree = "Please accept the data-use policy.";
  return errors;
}

const TOKEN_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";

function randomToken(length: number) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => TOKEN_ALPHABET[b % TOKEN_ALPHABET.length]).join("");
}

/** Visual preview of the key format a tier receives. Not a credential. */
function TokenPreview({ tier }: { tier: AccessTier }) {
  const [body, setBody] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const meta = TIERS.find((t) => t.id === tier)!;
  const token = body ? `${meta.tokenPrefix}_live_${body}` : null;

  const regenerate = useCallback(() => setBody(randomToken(28)), []);
  // Generated client-side only (after hydration), so server and client HTML agree.
  useEffect(() => {
    const frame = requestAnimationFrame(regenerate);
    return () => cancelAnimationFrame(frame);
  }, [regenerate]);

  const copy = async () => {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable (permissions / insecure context) */
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-black/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm text-white/85">
          <KeyRound className="size-4 text-ember" /> API token preview
        </p>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={regenerate}
            aria-label="Generate another preview token"
            className="rounded-md p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
          >
            <RefreshCw className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={copy}
            aria-label="Copy preview token"
            className="rounded-md p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
          >
            {copied ? <Check className="size-3.5 text-emerald-300" /> : <Copy className="size-3.5" />}
          </button>
        </div>
      </div>
      <code className="mt-3 block min-h-5 truncate font-mono text-[12.5px]">
        {token ? (
          <>
            <span className="text-ember">{meta.tokenPrefix}</span>
            <span className="text-white/40">_live_</span>
            <span className="text-white/80">{body!.slice(0, 8)}</span>
            <span className="text-white/25">{"•".repeat(20)}</span>
          </>
        ) : (
          <span className="text-white/30">generating…</span>
        )}
      </code>
      <p className="mt-2 font-mono text-[10px] text-white/40">
        {meta.quota} · shown for format only, your real key is issued on approval
      </p>
    </div>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="flex items-center gap-1.5 text-xs text-rose-300 animate-in fade-in slide-in-from-top-1">
      <CircleAlert className="size-3.5" /> {message}
    </p>
  );
}

export function AccessForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const ids = {
    name: useId(),
    email: useId(),
    organization: useId(),
    useCase: useId(),
    agree: useId(),
  };
  const [values, setValues] = useState<Values>({
    name: "",
    email: "",
    organization: "",
    tier: "academic",
    useCase: "",
    products: ["Horizon imaging"],
    agree: false,
  });
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "done">("idle");
  const [requestId, setRequestId] = useState("");

  const errors = validate(values);
  const show = (f: Field) => (touched[f] ? errors[f] : undefined);
  const valid = (f: Field) => touched[f] && !errors[f];
  const set = <K extends keyof Values>(key: K, value: Values[K]) => setValues((v) => ({ ...v, [key]: value }));
  const blur = (f: Field) => () => setTouched((t) => ({ ...t, [f]: true }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "submitting") return;
    setTouched({ name: true, email: true, organization: true, useCase: true, agree: true });
    const firstInvalid = (Object.keys(ids) as Field[]).find((f) => errors[f]);
    if (firstInvalid) {
      document.getElementById(ids[firstInvalid])?.focus();
      return;
    }
    setStatus("submitting");
    const result = await submitAccessRequest({
      name: values.name.trim(),
      email: values.email.trim(),
      organization: values.organization.trim(),
      tier: values.tier,
      useCase: values.useCase.trim(),
      products: values.products,
    });
    setRequestId(result.requestId);
    setStatus("done");
  };

  if (status === "done") {
    const tier = TIERS.find((t) => t.id === values.tier)!;
    return (
      <div className="animate-in space-y-6 text-center duration-500 fade-in zoom-in-95" role="status">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-400/30">
          <Check className="size-7" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold">Request received</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Thanks, {values.name.split(" ")[0]}. We&apos;ll review your {tier.label.toLowerCase()} request and reply to{" "}
            <span className="text-foreground">{values.email}</span>.
          </p>
        </div>
        <dl className="mx-auto grid max-w-sm grid-cols-2 gap-3 text-left font-mono text-xs">
          <div className="rounded-lg border border-white/10 p-3">
            <dt className="text-muted-foreground">Reference</dt>
            <dd className="mt-1 text-foreground">{requestId}</dd>
          </div>
          <div className="rounded-lg border border-white/10 p-3">
            <dt className="text-muted-foreground">Quota on approval</dt>
            <dd className="mt-1 text-foreground">{tier.quota}</dd>
          </div>
        </dl>
        <Link href="/observatory" className="inline-block text-sm text-ember hover:text-ember/80">
          Explore the observatory while you wait →
        </Link>
      </div>
    );
  }

  const fieldClass = (f: Field) =>
    cn(
      "h-10 border-white/10 bg-black/30 px-3 dark:bg-black/30",
      valid(f) && "border-emerald-400/40",
    );

  return (
    <form ref={formRef} noValidate onSubmit={onSubmit} className="space-y-6">
      <fieldset className="space-y-3">
        <legend className="mb-3 text-sm font-medium">Access tier</legend>
        <div role="radiogroup" aria-label="Access tier" className="grid gap-2 sm:grid-cols-3">
          {TIERS.map((t) => {
            const Icon = TIER_ICONS[t.id];
            const checked = values.tier === t.id;
            return (
              <label
                key={t.id}
                className={cn(
                  "relative flex cursor-pointer flex-col gap-2 rounded-xl border p-3.5 transition-all duration-300 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ember/60",
                  checked
                    ? "border-ember/50 bg-ember/10 shadow-[0_0_30px_-12px_var(--ember)]"
                    : "border-white/10 bg-black/20 hover:border-white/25",
                )}
              >
                <input
                  type="radio"
                  name="tier"
                  value={t.id}
                  checked={checked}
                  onChange={() => set("tier", t.id)}
                  className="sr-only"
                />
                <Icon className={cn("size-5", checked ? "text-ember" : "text-white/50")} />
                <span className="text-sm leading-tight font-medium">{t.label}</span>
                <span className="text-[11px] leading-snug text-muted-foreground">{t.description}</span>
                {checked && <Check className="absolute top-3 right-3 size-4 text-ember" />}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={ids.name}>Full name</Label>
          <Input
            id={ids.name}
            autoComplete="name"
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
            onBlur={blur("name")}
            aria-invalid={!!show("name")}
            aria-describedby={show("name") ? `${ids.name}-err` : undefined}
            className={fieldClass("name")}
          />
          <FieldError id={`${ids.name}-err`} message={show("name")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={ids.email}>Work email</Label>
          <Input
            id={ids.email}
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={(e) => set("email", e.target.value)}
            onBlur={blur("email")}
            aria-invalid={!!show("email")}
            aria-describedby={show("email") ? `${ids.email}-err` : undefined}
            className={fieldClass("email")}
          />
          <FieldError id={`${ids.email}-err`} message={show("email")} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={ids.organization}>
          {values.tier === "observatory" ? "Facility" : "Institution"}
          {values.tier === "independent" && <span className="font-normal text-muted-foreground">(optional)</span>}
        </Label>
        <div className="relative">
          <Building2 className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-white/30" />
          <Input
            id={ids.organization}
            autoComplete="organization"
            value={values.organization}
            onChange={(e) => set("organization", e.target.value)}
            onBlur={blur("organization")}
            aria-invalid={!!show("organization")}
            aria-describedby={show("organization") ? `${ids.organization}-err` : undefined}
            className={cn(fieldClass("organization"), "pl-9")}
          />
        </div>
        <FieldError id={`${ids.organization}-err`} message={show("organization")} />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between">
          <Label htmlFor={ids.useCase}>What will you observe?</Label>
          <span
            className={cn(
              "font-mono text-[10px] tabular-nums",
              values.useCase.trim().length >= MIN_USE_CASE ? "text-emerald-300" : "text-muted-foreground",
            )}
          >
            {values.useCase.trim().length}/{MIN_USE_CASE}
          </span>
        </div>
        <Textarea
          id={ids.useCase}
          rows={4}
          value={values.useCase}
          onChange={(e) => set("useCase", e.target.value)}
          onBlur={blur("useCase")}
          placeholder="e.g. Monitoring Sgr A* flares alongside our 1.3 mm light curves…"
          aria-invalid={!!show("useCase")}
          aria-describedby={show("useCase") ? `${ids.useCase}-err` : undefined}
          className={cn(fieldClass("useCase"), "h-auto min-h-24 py-2")}
        />
        <FieldError id={`${ids.useCase}-err`} message={show("useCase")} />
      </div>

      <fieldset>
        <legend className="mb-2.5 text-sm font-medium">Data products of interest</legend>
        <div className="flex flex-wrap gap-2">
          {PRODUCTS.map((p) => {
            const on = values.products.includes(p);
            return (
              <button
                key={p}
                type="button"
                aria-pressed={on}
                onClick={() => set("products", on ? values.products.filter((x) => x !== p) : [...values.products, p])}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs transition-all duration-200",
                  on ? "border-ember/50 bg-ember/10 text-ember" : "border-white/10 text-white/60 hover:text-white",
                )}
              >
                {on && <Check className="mr-1 -ml-0.5 inline size-3" />}
                {p}
              </button>
            );
          })}
        </div>
      </fieldset>

      <TokenPreview tier={values.tier} />

      <div className="space-y-1.5">
        <div className="flex items-start gap-3">
          <Checkbox
            id={ids.agree}
            checked={values.agree}
            onCheckedChange={(c) => {
              set("agree", c === true);
              setTouched((t) => ({ ...t, agree: true }));
            }}
            aria-invalid={!!show("agree")}
            aria-describedby={show("agree") ? `${ids.agree}-err` : undefined}
            className="mt-0.5 data-checked:border-ember data-checked:bg-ember dark:data-checked:bg-ember"
          />
          <Label htmlFor={ids.agree} className="text-sm leading-snug font-normal text-muted-foreground">
            I agree to cite Singularity data products and follow the open data-use policy.
          </Label>
        </div>
        <FieldError id={`${ids.agree}-err`} message={show("agree")} />
      </div>

      <div className="flex flex-wrap items-center gap-4 border-t border-white/10 pt-6">
        <LiquidMetalButton label="Submit request" onClick={() => formRef.current?.requestSubmit()} />
        <p className="flex items-center gap-2 text-xs text-muted-foreground" aria-live="polite">
          {status === "submitting" ? (
            <>
              <Loader2 className="size-3.5 animate-spin text-ember" /> Sending request…
            </>
          ) : (
            "Reviewed within two working days."
          )}
        </p>
      </div>
    </form>
  );
}
