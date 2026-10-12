import type { AuditInputs } from '@/lib/schemas/auditInputs'
import type { AuditResult } from '@/types'
import type { DocumentProps } from '@react-pdf/renderer'
import type { ReactElement } from 'react'

export interface ExportReportPdfOptions {
  result: AuditResult
  inputs: AuditInputs
  fileName: string
}

/**
 * Generates the report PDF in the browser from the report data and triggers a download.
 * The PDF library and template are loaded on demand so they never weigh on the initial bundle.
 */
export async function exportReportPdf({ result, inputs, fileName }: ExportReportPdfOptions): Promise<void> {
  const [{ pdf }, { default: ReportPdfDocument, registerReportPdfFonts }, React] = await Promise.all([
    import('@react-pdf/renderer'),
    import('@/components/pdf/ReportPdfDocument'),
    import('react'),
  ])

  registerReportPdfFonts(`${window.location.origin}/fonts`)

  // pdf() is typed to accept a <Document> element; our component renders one at its root.
  const element = React.createElement(ReportPdfDocument, { result, inputs, generatedAt: new Date() }) as unknown as ReactElement<DocumentProps>
  const blob = await pdf(element).toBlob()

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
