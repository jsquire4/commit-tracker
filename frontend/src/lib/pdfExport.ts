/**
 * PDF Export utility for the Briefing page.
 *
 * Uses html2pdf.js to capture a DOM element as a PDF document.
 * Configured for A4 portrait with Compass branding.
 */
import html2pdf from 'html2pdf.js';

/** Format today's date as YYYY-MM-DD for filenames. */
function datestamp(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Export a DOM element to PDF.
 *
 * @param element - The DOM element to capture (typically the main briefing column).
 * @param filename - Output filename. Defaults to "compass-briefing-{date}.pdf".
 */
export async function exportBriefingToPdf(
  element: HTMLElement,
  filename?: string,
): Promise<void> {
  const outputName = filename ?? `compass-briefing-${datestamp()}.pdf`;

  // Create a wrapper with branding header
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'background: #fff; padding: 0;';

  // Branding header
  const header = document.createElement('div');
  header.style.cssText =
    'padding: 0 0 12px 0; margin-bottom: 16px; border-bottom: 2px solid #036A6A; display: flex; align-items: baseline; gap: 12px;';
  const title = document.createElement('span');
  title.textContent = 'Compass Briefing';
  title.style.cssText =
    'font-family: "Newsreader", Georgia, serif; font-size: 20px; color: #036A6A; font-weight: 500;';
  const dateEl = document.createElement('span');
  dateEl.textContent = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  dateEl.style.cssText =
    'font-family: "Inter", system-ui, sans-serif; font-size: 12px; color: #5A605E;';
  header.appendChild(title);
  header.appendChild(dateEl);
  wrapper.appendChild(header);

  // Clone the content so we don't mutate the live DOM
  const clone = element.cloneNode(true) as HTMLElement;
  // Remove any animations that might affect rendering
  clone.style.animation = 'none';
  clone.querySelectorAll('*').forEach((el) => {
    (el as HTMLElement).style.animation = 'none';
  });
  wrapper.appendChild(clone);

  await html2pdf()
    .set({
      margin: [15, 15, 15, 15] as [number, number, number, number], // 15mm margins on all sides
      filename: outputName,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#F9F9F7',
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    .from(wrapper)
    .save();
}
