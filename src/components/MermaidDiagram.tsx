/**
 * MermaidDiagram.tsx — Renders Mermaid diagram definitions as interactive SVGs.
 *
 * Ported from desktop/frontend/src/components/MermaidDiagram.tsx.
 * Uses mermaid (lazy-loaded) for rendering and svg-pan-zoom for pan/zoom.
 */
import { memo, type RefObject, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CopyButton } from "./CopyButton";

interface Props {
  definition: string;
}

type DiagramState =
  | { status: "loading" }
  | { status: "rendered"; svg: string }
  | { status: "error"; message: string };

type DiagramTab = "preview" | "code";
type MermaidThemeName = "dark" | "light";
type MermaidApi = typeof import("mermaid")["default"];
type MermaidRenderAdapter = (
  svgId: string,
  definition: string,
  theme: MermaidThemeName,
  signal: AbortSignal,
) => Promise<string>;

type PanZoomInstance = {
  destroy(): void;
  resize(): unknown;
  fit(): unknown;
  center(): unknown;
  zoomIn(): unknown;
  zoomOut(): unknown;
  reset(): unknown;
};

type PanZoomFactory = (svg: SVGSVGElement, options?: Record<string, unknown>) => PanZoomInstance;

const MAX_TEXT_SIZE = 100000;
const SAFE_LINK_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);
const XLINK_NS = "http://www.w3.org/1999/xlink";

let mermaidApi: MermaidApi | null = null;
let initPromise: Promise<MermaidApi> | null = null;
let renderQueue: Promise<void> = Promise.resolve();
let panZoomFactory: PanZoomFactory | null = null;
let panZoomPromise: Promise<PanZoomFactory | null> | null = null;
let renderAdapterForTest: MermaidRenderAdapter | null = null;
let panZoomFactoryForTest: PanZoomFactory | null | undefined;

// ── Theme ──

function mermaidThemeVariables(theme: MermaidThemeName): Record<string, string | number | boolean> {
  if (theme === "dark") {
    return {
      darkMode: true,
      background: "#111319",
      fontSize: "13px",
      fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      primaryColor: "#1f2937",
      primaryTextColor: "#f4f5f7",
      primaryBorderColor: "#374151",
      mainBkg: "#1f2937",
      nodeBkg: "#1f2937",
      nodeBorder: "#374151",
      nodeTextColor: "#f4f5f7",
      lineColor: "#6b7280",
      textColor: "#d1d5db",
      defaultLinkColor: "#6b7280",
      edgeLabelBackground: "#111319",
      clusterBkg: "#0f172a",
      clusterBorder: "#374151",
      actorBkg: "#1f2937",
      actorBorder: "#374151",
      actorTextColor: "#f4f5f7",
      signalColor: "#d1d5db",
      signalTextColor: "#f4f5f7",
      labelBoxBkgColor: "#1f2937",
      labelBoxBorderColor: "#374151",
      labelTextColor: "#f4f5f7",
      noteBkgColor: "#0f172a",
      noteBorderColor: "#374151",
      noteTextColor: "#e5e7eb",
      classText: "#f4f5f7",
      classBorder: "#374151",
      classBkg: "#1f2937",
    };
  }
  return {
    darkMode: false,
    background: "#ffffff",
    fontSize: "13px",
    fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    primaryColor: "#f8fafc",
    primaryTextColor: "#0f172a",
    primaryBorderColor: "#cbd5e1",
    mainBkg: "#f8fafc",
    nodeBkg: "#f8fafc",
    nodeBorder: "#cbd5e1",
    nodeTextColor: "#0f172a",
    lineColor: "#94a3b8",
    textColor: "#475569",
    defaultLinkColor: "#94a3b8",
    edgeLabelBackground: "#ffffff",
    clusterBkg: "#f1f5f9",
    clusterBorder: "#e2e8f0",
    actorBkg: "#f8fafc",
    actorBorder: "#cbd5e1",
    actorTextColor: "#0f172a",
    signalColor: "#475569",
    signalTextColor: "#0f172a",
    labelBoxBkgColor: "#f8fafc",
    labelBoxBorderColor: "#cbd5e1",
    labelTextColor: "#0f172a",
    noteBkgColor: "#f1f5f9",
    noteBorderColor: "#e2e8f0",
    noteTextColor: "#334155",
    classText: "#0f172a",
    classBorder: "#cbd5e1",
    classBkg: "#f8fafc",
  };
}

function mermaidConfigForTheme(theme: MermaidThemeName) {
  return {
    startOnLoad: false,
    theme: "base" as const,
    securityLevel: "antiscript" as const,
    maxTextSize: MAX_TEXT_SIZE,
    fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    flowchart: { htmlLabels: false },
    themeVariables: mermaidThemeVariables(theme),
  };
}

async function ensureMermaid(theme: MermaidThemeName): Promise<MermaidApi> {
  if (mermaidApi) {
    mermaidApi.initialize(mermaidConfigForTheme(theme));
    return mermaidApi;
  }
  if (!initPromise) {
    initPromise = import("mermaid").then((mod) => {
      mermaidApi = mod.default;
      mermaidApi.initialize(mermaidConfigForTheme(theme));
      return mermaidApi;
    }).catch((err) => {
      initPromise = null;
      mermaidApi = null;
      throw err;
    });
  }
  const api = await initPromise;
  api.initialize(mermaidConfigForTheme(theme));
  return api;
}

function queuedRender(
  svgId: string,
  definition: string,
  theme: MermaidThemeName,
  signal: AbortSignal,
): Promise<string> {
  const promise = renderQueue.then(async () => {
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    const api = await ensureMermaid(theme);
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    const { svg } = await api.render(svgId, definition);
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    return svg;
  });
  renderQueue = promise.then(() => {}, () => {});
  return promise;
}

async function renderMermaid(
  svgId: string,
  definition: string,
  theme: MermaidThemeName,
  signal: AbortSignal,
): Promise<string> {
  if (renderAdapterForTest) return renderAdapterForTest(svgId, definition, theme, signal);
  return queuedRender(svgId, definition, theme, signal);
}

async function ensurePanZoomFactory(): Promise<PanZoomFactory | null> {
  if (panZoomFactoryForTest !== undefined) return panZoomFactoryForTest;
  if (panZoomFactory) return panZoomFactory;
  if (!panZoomPromise) {
    panZoomPromise = import("svg-pan-zoom").then((mod) => {
      const factory = (("default" in mod ? mod.default : mod) as unknown) as PanZoomFactory;
      panZoomFactory = factory;
      return factory;
    }).catch(() => null);
  }
  return panZoomPromise;
}

// ── Security ──

function isSafeMermaidHref(href: string | null | undefined): boolean {
  const value = href?.trim();
  if (!value) return false;
  if (value.startsWith("#")) return true;
  try {
    return SAFE_LINK_PROTOCOLS.has(new URL(value).protocol);
  } catch {
    return false;
  }
}

function isOpenableMermaidHref(href: string | null | undefined): boolean {
  return Boolean(href?.trim() && !href.trim().startsWith("#") && isSafeMermaidHref(href));
}

function getMermaidAnchorHref(anchor: Element): string | null {
  return anchor.getAttribute("href")
    ?? anchor.getAttribute("xlink:href")
    ?? anchor.getAttributeNS(XLINK_NS, "href");
}

function sanitizeMermaidSvg(svg: string): string {
  if (typeof DOMParser === "undefined" || typeof XMLSerializer === "undefined") return svg;
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  const svgEl = doc.documentElement;
  if (svgEl.localName.toLowerCase() !== "svg") return svg;

  const elements = [svgEl, ...Array.from(svgEl.querySelectorAll("*"))];
  const toRemove: Element[] = [];

  for (const element of elements) {
    const name = element.localName.toLowerCase();
    if (name === "script" || name === "iframe" || name === "object" || name === "embed") {
      toRemove.push(element);
      continue;
    }
    for (const attr of Array.from(element.attributes)) {
      if (/^on/i.test(attr.name)) {
        element.removeAttribute(attr.name);
        continue;
      }
      if (attr.localName.toLowerCase() === "href" && !isSafeMermaidHref(attr.value)) {
        element.removeAttribute(attr.name);
      }
    }
  }

  for (const element of toRemove) element.parentNode?.removeChild(element);
  return new XMLSerializer().serializeToString(svgEl);
}

function resolveMermaidTheme(): MermaidThemeName {
  if (typeof document === "undefined") return "dark";
  const forced = document.documentElement.getAttribute("data-theme");
  if (forced === "light" || forced === "dark") return forced;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function useMermaidTheme(): MermaidThemeName {
  const [theme, setTheme] = useState<MermaidThemeName>(resolveMermaidTheme);

  useEffect(() => {
    const html = document.documentElement;
    const updateTheme = () => setTheme(resolveMermaidTheme());
    const observer = new MutationObserver(updateTheme);
    observer.observe(html, { attributeFilter: ["data-theme", "data-theme-mode"] });

    const mq = window.matchMedia("(prefers-color-scheme: light)");
    mq.addEventListener("change", updateTheme);
    return () => {
      observer.disconnect();
      mq.removeEventListener("change", updateTheme);
    };
  }, []);

  return theme;
}

function destroyPanZoom(instance: PanZoomInstance | null): void {
  if (!instance) return;
  try { instance.destroy(); } catch { /* best-effort */ }
}

// ── SVG icons ──

const IconPlay = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>;
const IconCode = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>;
const IconZoomIn = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>;
const IconZoomOut = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>;
const IconReset = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>;
const IconFullscreen = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>;
const IconMinimize = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>;
const IconAlert = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;

// ── Component ──

const MermaidDiagram = memo(function MermaidDiagram({ definition }: Props) {
  const [state, setState] = useState<DiagramState>({ status: "loading" });
  const [tab, setTab] = useState<DiagramTab>("preview");
  const [fullscreen, setFullscreen] = useState(false);
  const [portalTarget, setPortalTarget] = useState<Element | null>(null);
  const theme = useMermaidTheme();
  const instanceId = useId().replace(/[^a-zA-Z0-9_-]/g, "-");
  const svgId = `mermaid-${instanceId}`;
  const previewRef = useRef<HTMLDivElement>(null);
  const panZoomRef = useRef<PanZoomInstance | null>(null);
  const mountedRef = useRef(true);
  const source = useMemo(() => definition.replace(/\n$/, ""), [definition]);

  useEffect(() => {
    mountedRef.current = true;
    const controller = new AbortController();
    setState({ status: "loading" });

    (async () => {
      try {
        const trimmed = source.trim();
        if (!trimmed) {
          setState({ status: "error", message: "Empty diagram definition" });
          return;
        }
        const rendered = await renderMermaid(svgId, trimmed, theme, controller.signal);
        if (controller.signal.aborted || !mountedRef.current) return;
        setState({ status: "rendered", svg: sanitizeMermaidSvg(rendered) });
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (controller.signal.aborted || !mountedRef.current) return;
        const message = err instanceof Error ? err.message : String(err);
        setState({ status: "error", message });
      }
    })();

    return () => {
      controller.abort();
      mountedRef.current = false;
    };
  }, [source, svgId, theme]);

  useLayoutEffect(() => {
    if (tab !== "preview" || state.status !== "rendered") return;
    const container = previewRef.current;
    if (!container) return;

    let cancelled = false;
    let raf = 0;
    let instance: PanZoomInstance | null = null;

    void ensurePanZoomFactory().then((factory) => {
      if (cancelled || !factory) return;
      raf = window.requestAnimationFrame(() => {
        const svg = container.querySelector("svg") as SVGSVGElement | null;
        if (cancelled || !svg) return;
        svg.removeAttribute("width");
        svg.removeAttribute("height");
        svg.style.width = "100%";
        svg.style.height = "100%";
        svg.style.maxWidth = "none";

        destroyPanZoom(panZoomRef.current);
        try {
          instance = factory(svg, {
            zoomEnabled: true,
            panEnabled: true,
            controlIconsEnabled: false,
            dblClickZoomEnabled: true,
            fit: true,
            center: true,
            minZoom: 0.3,
            maxZoom: 8,
            zoomScaleSensitivity: 0.3,
          });
          panZoomRef.current = instance;
          window.requestAnimationFrame(() => {
            if (panZoomRef.current !== instance) return;
            instance?.resize();
            instance?.fit();
            instance?.center();
          });
        } catch {
          instance = null;
          panZoomRef.current = null;
        }
      });
    });

    return () => {
      cancelled = true;
      if (raf) window.cancelAnimationFrame(raf);
      if (panZoomRef.current === instance) panZoomRef.current = null;
      destroyPanZoom(instance);
    };
  }, [state, tab, fullscreen]);

  useEffect(() => {
    if (!fullscreen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setFullscreen(false);
        setPortalTarget(null);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [fullscreen]);

  useEffect(() => {
    if (!fullscreen || !panZoomRef.current) return;
    panZoomRef.current.resize();
    panZoomRef.current.fit();
    panZoomRef.current.center();
  }, [fullscreen]);

  const toggleFullscreen = useCallback(() => {
    setFullscreen((current) => {
      const next = !current;
      setPortalTarget(next ? document.body : null);
      return next;
    });
  }, []);

  const zoomIn = useCallback(() => panZoomRef.current?.zoomIn(), []);
  const zoomOut = useCallback(() => panZoomRef.current?.zoomOut(), []);
  const resetZoom = useCallback(() => {
    const instance = panZoomRef.current;
    if (!instance) return;
    instance.reset();
    instance.fit();
    instance.center();
  }, []);

  const body = (
    <MermaidBody
      state={state}
      source={source}
      tab={tab}
      previewRef={previewRef}
    />
  );

  const content = (
    <div className={[
      "mermaid-diagram",
      state.status === "error" ? "mermaid-diagram--error" : "",
      fullscreen ? "mermaid-diagram--fullscreen" : "",
    ].filter(Boolean).join(" ")}>
      <MermaidToolbar
        tab={tab}
        source={source}
        fullscreen={fullscreen}
        onTabChange={setTab}
        onFullscreenToggle={toggleFullscreen}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onResetZoom={resetZoom}
      />
      {body}
    </div>
  );

  if (fullscreen && portalTarget) {
    return (
      <>
        <div className="mermaid-diagram mermaid-diagram--placeholder" aria-hidden="true" />
        {createPortal(content, portalTarget)}
      </>
    );
  }

  return content;
});

// ── Sub-components ──

function MermaidToolbar({
  tab,
  source,
  fullscreen,
  onTabChange,
  onFullscreenToggle,
  onZoomIn,
  onZoomOut,
  onResetZoom,
}: {
  tab: DiagramTab;
  source: string;
  fullscreen: boolean;
  onTabChange: (tab: DiagramTab) => void;
  onFullscreenToggle: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
}) {
  return (
    <div className="mermaid-diagram__toolbar">
      <div className="mermaid-diagram__title" aria-hidden="true">Mermaid</div>
      <div className="mermaid-diagram__actions">
        <button type="button" className={`mermaid-diagram__icon-btn${tab === "preview" ? " mermaid-diagram__icon-btn--active" : ""}`} onClick={() => onTabChange("preview")} aria-label="Preview diagram" title="Preview diagram">{IconPlay}</button>
        <button type="button" className={`mermaid-diagram__icon-btn${tab === "code" ? " mermaid-diagram__icon-btn--active" : ""}`} onClick={() => onTabChange("code")} aria-label="Show diagram source" title="Show diagram source">{IconCode}</button>
        <button type="button" className="mermaid-diagram__icon-btn mermaid-diagram__zoom-action" onClick={onZoomOut} aria-label="Zoom out" title="Zoom out">{IconZoomOut}</button>
        <button type="button" className="mermaid-diagram__icon-btn mermaid-diagram__zoom-action" onClick={onZoomIn} aria-label="Zoom in" title="Zoom in">{IconZoomIn}</button>
        <button type="button" className="mermaid-diagram__icon-btn mermaid-diagram__zoom-action" onClick={onResetZoom} aria-label="Reset zoom" title="Reset zoom">{IconReset}</button>
        <CopyButton text={source} className="mermaid-diagram__copy-btn" />
        <button type="button" className="mermaid-diagram__icon-btn" onClick={onFullscreenToggle} aria-label={fullscreen ? "Exit fullscreen" : "Open fullscreen"} title={fullscreen ? "Exit fullscreen" : "Open fullscreen"}>{fullscreen ? IconMinimize : IconFullscreen}</button>
      </div>
    </div>
  );
}

function MermaidBody({
  state,
  source,
  tab,
  previewRef,
}: {
  state: DiagramState;
  source: string;
  tab: DiagramTab;
  previewRef: RefObject<HTMLDivElement | null>;
}) {
  if (tab === "code") {
    return (
      <pre className="code hljs mermaid-diagram__code" data-lang="mermaid">
        <code>{source}</code>
      </pre>
    );
  }

  if (state.status === "loading") {
    return (
      <div className="mermaid-diagram__loading">
        <span className="mermaid-diagram__spinner" />
        <span>Rendering diagram...</span>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="mermaid-diagram__error">
        <div className="mermaid-diagram__error-bar">
          {IconAlert}
          <span>Diagram syntax error</span>
        </div>
        <pre className="code hljs mermaid-diagram__error-source" data-lang="mermaid">
          <code>{source}</code>
        </pre>
        <details className="mermaid-diagram__error-details">
          <summary>Error details</summary>
          <pre className="mermaid-diagram__error-detail-text">{state.message}</pre>
        </details>
      </div>
    );
  }

  return <SvgPreview refEl={previewRef} svg={state.svg} />;
}

function SvgPreview({ refEl, svg }: { refEl: RefObject<HTMLDivElement | null>; svg: string }) {
  const openAnchor = useCallback((event: React.MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const anchor = target.closest("a");
    const href = anchor ? getMermaidAnchorHref(anchor) : null;
    if (!href) return;
    event.preventDefault();
    if (isOpenableMermaidHref(href)) window.open(href, "_blank", "noopener,noreferrer");
  }, []);

  const preventMiddleButton = useCallback((event: React.MouseEvent) => {
    if (event.button !== 1) return;
    if (event.target instanceof Element && event.target.closest("a")) event.preventDefault();
  }, []);

  return (
    <div className="mermaid-diagram__preview-wrap">
      <div
        className="mermaid-diagram__preview"
        ref={refEl as React.Ref<HTMLDivElement>}
        dangerouslySetInnerHTML={{ __html: svg }}
        onClick={openAnchor}
        onAuxClick={openAnchor}
        onMouseDown={preventMiddleButton}
      />
    </div>
  );
}

export default MermaidDiagram;
