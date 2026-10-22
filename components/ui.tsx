"use client";
import { type ReactNode, useRef, useEffect, useId } from "react";
import { ArrowUpRight, Check, Lightbulb, X, Sparkles } from "lucide-react";
import type { Feedback } from "@/lib/model";
export function Badge({
  children,
  tone = "mint",
}: {
  children: ReactNode;
  tone?: "mint" | "blue" | "amber" | "gray";
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Lightbulb size={23} />
      </span>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
export function PageTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
export function Panel({
  title,
  subtitle,
  children,
  action,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      {title && (
        <div className="panel-heading">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  const id = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current
      ?.querySelector<HTMLElement>("button,input,textarea,select,a[href]")
      ?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close.current();
      }
      if (event.key === "Tab") {
        const nodes = Array.from(
          ref.current?.querySelectorAll<HTMLElement>(
            "button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),a[href]",
          ) || [],
        ).filter((e) => e.getClientRects().length);
        const first = nodes[0],
          last = nodes.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", keydown);
      previous?.focus();
    };
  }, []);
  return (
    <div className="modal-shade" onClick={onClose}>
      <section
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        className="modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-heading">
          <h2 id={id}>{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label="关闭">
            <X size={21} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
export function FeedbackCard({ feedback }: { feedback: Feedback }) {
  return (
    <div className="feedback">
      <div className="row">
        <Sparkles size={18} />
        <strong>这一次，我们先把基础练稳</strong>
        <Badge tone={feedback.source === "ai" ? "blue" : "gray"}>
          {feedback.source === "ai" ? "AI 教师" : "离线规则教学"}
        </Badge>
      </div>
      <h3>{feedback.summary}</h3>
      {feedback.strengths.map((s, i) => (
        <p className="feedback-line" key={i}>
          <Check size={16} />
          {s}
        </p>
      ))}
      {feedback.issues.map((s, i) => (
        <div className="issue" key={i}>
          <b>{i + 1}</b>
          <span>{s}</span>
        </div>
      ))}
      <p className="muted">{feedback.explanation}</p>
      <blockquote>{feedback.example}</blockquote>
      <p>
        <ArrowUpRight size={15} className="inline-icon" /> {feedback.next}
      </p>
    </div>
  );
}
export function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="notice" role="status">
      <Lightbulb size={17} />
      <span>{children}</span>
    </div>
  );
}
export function DownloadButton({
  data,
  filename,
  children,
}: {
  data: unknown;
  filename: string;
  children: ReactNode;
}) {
  return (
    <button
      className="button secondary"
      onClick={() =>
        download(
          new Blob([JSON.stringify(data, null, 2)], {
            type: "application/json",
          }),
          filename,
        )
      }
    >
      {children}
    </button>
  );
}
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export const clock = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
