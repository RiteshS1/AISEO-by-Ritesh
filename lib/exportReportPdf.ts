// Client-side PDF export for the audit report. Each report tab is rendered one at a
// time by AuditTool, so we walk the tabs, capture the report pane and append it to a PDF.

const PAGE_BG = '#020617'
const A4_WIDTH_MM = 210
const A4_HEIGHT_MM = 297
const ANIMATION_SETTLE_MS = 1200

// Applied only inside html2canvas's cloned document, never to the live page.
const CLONE_CSS = `
  .report-content, .report-content * {
    animation: none !important;
    transition: none !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
  }
  .report-content { max-height: none !important; overflow: visible !important; }
  .report-content [class*="blur-[80px]"] { display: none !important; }
  .report-content .gradient-text {
    background: none !important;
    -webkit-background-clip: border-box !important;
    background-clip: border-box !important;
    -webkit-text-fill-color: currentColor !important;
    color: #d9ff00 !important;
  }
`

export interface ExportReportPdfOptions {
  /** Returns the scrollable report pane (the element with the `report-content` class). */
  getNode: () => HTMLElement | null
  /** Switches the report to the given tab. */
  goToPage: (pageId: string) => void
  pageIds: readonly string[]
  fileName: string
}

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export async function exportReportPdf({ getNode, goToPage, pageIds, fileName }: ExportReportPdfOptions): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')])

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true })
  const scale = window.innerWidth < 768 ? 1.5 : 2
  let isFirstSlice = true

  for (const pageId of pageIds) {
    goToPage(pageId)
    await nextFrame()
    await nextFrame()
    await document.fonts.ready
    await wait(ANIMATION_SETTLE_MS)

    const node = getNode()
    if (!node) throw new Error('Report content is not available for export.')

    const canvas = await html2canvas(node, {
      scale,
      backgroundColor: PAGE_BG,
      useCORS: true,
      logging: false,
      windowWidth: 1280,
      onclone: (clonedDoc) => {
        const style = clonedDoc.createElement('style')
        style.textContent = CLONE_CSS
        clonedDoc.head.appendChild(style)
      },
    })

    // Slice the tall capture into A4-proportioned pages; every tab starts on a new page.
    const sliceHeightPx = Math.floor((canvas.width * A4_HEIGHT_MM) / A4_WIDTH_MM)
    for (let offsetY = 0; offsetY < canvas.height; offsetY += sliceHeightPx) {
      const sliceHeight = Math.min(sliceHeightPx, canvas.height - offsetY)
      const slice = document.createElement('canvas')
      slice.width = canvas.width
      slice.height = sliceHeight
      const ctx = slice.getContext('2d')
      if (!ctx) throw new Error('Could not create a canvas context for export.')
      ctx.drawImage(canvas, 0, offsetY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight)

      if (!isFirstSlice) pdf.addPage()
      isFirstSlice = false
      pdf.setFillColor(PAGE_BG)
      pdf.rect(0, 0, A4_WIDTH_MM, A4_HEIGHT_MM, 'F')
      pdf.addImage(slice.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, A4_WIDTH_MM, (sliceHeight * A4_WIDTH_MM) / canvas.width)
    }
  }

  pdf.save(fileName)
}
