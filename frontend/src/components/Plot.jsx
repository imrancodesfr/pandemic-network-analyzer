import { useEffect, useRef } from "react";
import Plotly from "plotly.js-dist-min";

const AXIS = { gridcolor: "#eef1f7", linecolor: "#dde3f0", zerolinecolor: "#dde3f0", tickfont: { color: "#7d8aa3" } };

const BASE_LAYOUT = {
  paper_bgcolor: "rgba(0,0,0,0)",
  plot_bgcolor: "#ffffff",
  font: { color: "#42506b", family: "Inter, -apple-system, 'Segoe UI', Roboto, sans-serif" },
  xaxis: AXIS,
  yaxis: AXIS,
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