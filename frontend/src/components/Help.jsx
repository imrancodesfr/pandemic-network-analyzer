import { useCallback, useEffect, useRef, useState } from "react";
import { GLOSSARY } from "../lib/glossary.js";

// Shared tooltip behaviour: opens on hover/focus, toggles on click (touch),
// closes on Escape or outside click. Also decides whether the popup should
// open above or below the trigger and how to align it, so it never runs off
// the top of the viewport or off the side of the screen.
function useTip() {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ down: false, align: "center" });
  const wrapRef = useRef(null);

  const evaluate = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vw = window.innerWidth || 1200;
    const down = r.top < 170;
    let align = "center";
    if (r.left < 170) align = "left";
    else if (vw - r.right < 170) align = "right";
    setPos({ down, align });
  }, []);

  const show = useCallback(() => {
    evaluate();
    setOpen(true);
  }, [evaluate]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onResize = () => evaluate();
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [open, evaluate]);

  const popClass = `tip-pop ${pos.down ? "down" : "up"} align-${pos.align}`;
  return { open, setOpen, show, wrapRef, popClass };
}

function TipBody({ entry, title, className }) {
  const head = title || entry?.term;
  return (
    <span className={className} role="tooltip">
      {head && <b className="tip-head">{head}</b>}
      {entry?.def && <span className="tip-def">{entry.def}</span>}
      {entry?.read && <span className="tip-read">{entry.read}</span>}
    </span>
  );
}

// Just the ⓘ icon — placed next to a label or metric.
export function Info({ id, title, children }) {
  const entry = GLOSSARY[id];
  const { open, setOpen, show, wrapRef, popClass } = useTip();
  const label = title || entry?.term || id || "explanation";
  if (!entry && !children) return null;
  return (
    <span className="tip" ref={wrapRef}>
      <button
        type="button"
        className="tip-btn"
        aria-label={`Explain: ${label}`}
        aria-expanded={open}
        onMouseEnter={show}
        onMouseLeave={() => setOpen(false)}
        onFocus={show}
        onBlur={() => setOpen(false)}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          if (open) setOpen(false);
          else show();
        }}
      >
        i
      </button>
      {open && (children
        ? <span className={popClass} role="tooltip">{children}</span>
        : <TipBody entry={entry} title={title} className={popClass} />)}
    </span>
  );
}

// A word/term with a dotted underline that explains itself on hover/click.
export function Term({ id, title, children }) {
  const entry = GLOSSARY[id];
  const { open, setOpen, show, wrapRef, popClass } = useTip();
  const label = title || entry?.term || id;
  return (
    <span className={`term${open ? " open" : ""}`} ref={wrapRef}>
      <button
        type="button"
        className="term-link"
        aria-expanded={open}
        onMouseEnter={show}
        onMouseLeave={() => setOpen(false)}
        onFocus={show}
        onBlur={() => setOpen(false)}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          if (open) setOpen(false);
          else show();
        }}
      >
        {children || label}
      </button>
      {open && <TipBody entry={entry} title={title} className={popClass} />}
    </span>
  );
}

// A collapsible "how to read this" explainer panel.
export function HelpBox({ title = "What am I looking at?", children, open = false }) {
  return (
    <details className="helpbox" open={open}>
      <summary>{title}</summary>
      <div className="helpbox-body">{children}</div>
    </details>
  );
}
