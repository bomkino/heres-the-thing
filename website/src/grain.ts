export function initialiseGrain(): void {
  const canvas = document.querySelector<HTMLCanvasElement>("#grain-canvas");
  const context = canvas?.getContext("2d", { alpha: true });
  if (!canvas || !context) return;
  const width = 132;
  const height = 88;
  canvas.width = width;
  canvas.height = height;
  const image = context.createImageData(width, height);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let timer = 0;
  const paint = () => {
    const pixels = image.data;
    for (let index = 0; index < pixels.length; index += 4) {
      const value = Math.random() * 255;
      pixels[index] = value;
      pixels[index + 1] = value;
      pixels[index + 2] = value;
      pixels[index + 3] = 30;
    }
    context.putImageData(image, 0, 0);
  };
  const schedule = () => {
    window.clearInterval(timer);
    paint();
    if (!reduced.matches) timer = window.setInterval(() => { if (!document.hidden) paint(); }, 118);
  };
  reduced.addEventListener("change", schedule);
  schedule();
}
