import { useEffect, useRef } from "react";
import Plotly from "plotly.js-dist-min";

const BASE_LAYOUT = {
  paper_bgcolor: "rgba(0,0,0,0)",
  plot_bgcolor: "#0d1322",
  font: { color: "#bcc9cd", family: "JetBrains Mono, monospace" },
  margin: { l: 48, r: 20, t: 40, b: 44 },
  autosize: true,
};

export default function Plot({ data, layout = {}, config = {}, style = {}, height = 380 }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mergedLayout = { ...BASE_LAYOUT, height: height ?? undefined, ...layout };
    let target = el;
    // plotly.js-react pattern: reuse the same node so updates don't leak DOM
    Plotly.react(target, data, mergedLayout, { responsive: true, displayModeBar: false, ...config });
    return () => {
      if (target) Plotly.purge(target);
    };
  }, [data, layout, height, config]);

  return <div ref={ref} style={{ width: "100%", height: height ?? 380, ...style }} />;
}