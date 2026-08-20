"use client";

import { toPng } from "html-to-image";

/**
 * Capture the recharts chart nearest to the clicked Save button as a PNG
 * data URL, so the playground can show the actual chart visual — not just
 * the title/summary words.
 */
export async function captureChartImage(
  button: HTMLElement,
): Promise<string | undefined> {
  try {
    const svg = findChartSvg(button);
    if (!svg) return undefined;
    const dataUrl = await toPng(svg as unknown as HTMLElement, {
      backgroundColor: "#ffffff",
      pixelRatio: 2,
      cacheBust: true,
    });
    return dataUrl;
  } catch {
    return undefined;
  }
}

function findChartSvg(el: HTMLElement): SVGSVGElement | null {
  let node: HTMLElement | null = el;
  while (node && node !== document.body) {
    const svg = node.querySelector<SVGSVGElement>("svg.recharts-surface");
    if (svg) return svg;
    node = node.parentElement;
  }
  return null;
}
