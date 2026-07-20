import type { PreviewMeasurement } from "../../src/one-slide-or-three/index.ts";

export async function measureSlide(title: string, copy: string): Promise<PreviewMeasurement> {
  const host = document.createElement("div");
  host.className = "measurement-host";
  const box = document.createElement("div");
  box.className = "measurement-slide";
  const titleEl = document.createElement("h2");
  titleEl.textContent = title;
  const bodyEl = document.createElement("p");
  bodyEl.textContent = copy;
  box.append(titleEl, bodyEl);
  host.appendChild(box);
  document.body.appendChild(host);
  try {
    await Promise.race([
      document.fonts?.ready ?? Promise.resolve(),
      new Promise<void>((resolve) => window.setTimeout(resolve, 500)),
    ]);
    const ratio = Math.max(box.scrollHeight / box.clientHeight, box.scrollWidth / box.clientWidth);
    const fit = ratio > 1.01 ? "overflows" : ratio > 0.9 ? "fits_tightly" : "fits";
    return {
      fit,
      typePressure: ratio > 1.18 ? "below_selected_minimum" : "comfortable",
      titleLines: lineCount(titleEl),
      bodyLines: lineCount(bodyEl),
      scrollWidth: box.scrollWidth,
      clientWidth: box.clientWidth,
      scrollHeight: box.scrollHeight,
      clientHeight: box.clientHeight,
    };
  } finally {
    host.remove();
  }
}

function lineCount(element: HTMLElement): number {
  if (!element.textContent?.trim()) return 0;
  const style = getComputedStyle(element);
  const lineHeight = Number.parseFloat(style.lineHeight) || Number.parseFloat(style.fontSize) * 1.2;
  return Math.max(1, Math.round(element.scrollHeight / lineHeight));
}
