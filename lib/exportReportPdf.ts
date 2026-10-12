// Client-side PDF export for the audit report. Each report tab is rendered one at a
// time by AuditTool, so we walk the tabs, capture the report pane and append it to a PDF.

const PAGE_BG = '#020617'
const A4_WIDTH_MM = 210
const A4_HEIGHT_MM = 297
const SETTLE_MS = 200

// Injected into the live page for the duration of the export so every element is in its
// final (post-animation) state when its computed styles are read.
const FREEZE_CSS = `
  .report-content, .report-content * {
    animation: none !important;
    transition: none !important;
  }
`

// Applied only inside html2canvas's cloned document, never to the live page.
const CLONE_CSS = `
  .report-content, .report-content * {
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

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))
// requestAnimationFrame is paused in background tabs, so never wait on it alone.
// Size-dependent properties are left to re-flow so text is never clipped by a stale fixed box.
const SKIPPED_PROPS = new Set(['width', 'height', 'inline-size', 'block-size', 'perspective-origin', 'transform-origin'])

/**
 * html2canvas re-lays-out a copy of the page in an iframe, where responsive (md:/lg:) rules
 * can resolve differently from the live page and squash the report into a narrow column.
 * Copying the live computed styles onto the clone makes it match what the user sees.
 */
function inlineComputedStyles(liveRoot: HTMLElement, clonedRoot: HTMLElement, liveWidth: number) {
  const live = [liveRoot, ...Array.from(liveRoot.querySelectorAll<HTMLElement>('*'))]
  const cloned = [clonedRoot, ...Array.from(clonedRoot.querySelectorAll<HTMLElement>('*'))]
  const count = Math.min(live.length, cloned.length)
  for (let i = 0; i < count; i++) {
    const computed = window.getComputedStyle(live[i])
    let cssText = ''
    for (let j = 0; j < computed.length; j++) {
      const prop = computed.item(j)
      if (!SKIPPED_PROPS.has(prop)) cssText += `${prop}:${computed.getPropertyValue(prop)};`
    }
    cloned[i].style.cssText = cssText
  }
  clonedRoot.style.setProperty('flex', 'none', 'important')
  clonedRoot.style.setProperty('width', `${liveWidth}px`, 'important')
}

const nextFrame = () => Promise.race([new Promise<void>((resolve) => requestAnimationFrame(() => resolve())), wait(50)])

export async function exportReportPdf({ getNode, goToPage, pageIds, fileName }: ExportReportPdfOptions): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')])

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true })
  const scale = window.innerWidth < 768 ? 1.5 : 2
  let isFirstSlice = true

  const freezeStyle = document.createElement('style')
  freezeStyle.textContent = FREEZE_CSS
  document.head.appendChild(freezeStyle)

  try {
    for (const pageId of pageIds) {
      goToPage(pageId)
      await nextFrame()
      await nextFrame()
      await document.fonts.ready
      await wait(SETTLE_MS)

      const node = getNode()
      if (!node) throw new Error('Report content is not available for export.')
      const liveWidth = Math.round(node.getBoundingClientRect().width)

      const canvas = await html2canvas(node, {
        scale,
        backgroundColor: PAGE_BG,
        useCORS: true,
        logging: false,
        windowWidth: window.innerWidth,
        onclone: (clonedDoc) => {
          const clonedRoot = clonedDoc.querySelector<HTMLElement>('.report-content')
          if (clonedRoot) inlineComputedStyles(node, clonedRoot, liveWidth)
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
  } finally {
    freezeStyle.remove()
  }

  pdf.save(fileName)
}
