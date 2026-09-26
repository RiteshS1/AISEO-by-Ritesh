'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { ReportListItem } from '@/lib/supabaseServer';
import ReportStatusTracker from './ReportStatusTracker';

const ACTIVE_STATUSES = new Set(['pending_approval', 'generating']);

export default function ReportList({ initialReports }: { initialReports: ReportListItem[] }) {
  const [reports, setReports] = useState(initialReports);
  const shouldPoll = reports.some((report) => report.report_status && ACTIVE_STATUSES.has(report.report_status));

  useEffect(() => {
    if (!shouldPoll) return;
    const refreshReports = async () => {
      const response = await fetch('/api/me', { cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json() as { reports?: ReportListItem[] };
      if (data.reports) setReports(data.reports);
    };
    const interval = window.setInterval(refreshReports, 9000);
    return () => window.clearInterval(interval);
  }, [shouldPoll]);

  return (
    <div>
      <h2 className="text-lg font-black uppercase tracking-tighter text-white mb-4">Past reports</h2>
      {reports.length === 0 ? (
        <div className="p-8 bg-slate-900/40 border border-white/10 rounded-[7px] text-center">
          <p className="text-slate-500 text-[11px] font-bold uppercase tracking-widest">No reports yet. Run your first audit above.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {reports.map((report) => {
            const statusLabel =
              report.report_status === 'published' ? 'Report ready' :
              report.report_status === 'rejected' ? 'Rejected by admin' :
              report.report_status === 'generating' ? 'AI engine analyzing' :
              report.report_status === 'in_review' ? 'Quality verification' :
              report.report_status === 'pending_approval' ? 'Awaiting admin review' : 'Draft';
            const statusClass = report.report_status === 'published'
              ? 'text-lime-400'
              : report.report_status === 'rejected' ? 'text-red-400' : 'text-amber-400';
            return (
              <li key={report.report_id}>
                <Link
                  href={report.report_status === 'published' ? `/report/${report.report_id}` : '/dashboard'}
                  className="block p-4 bg-slate-900/40 border border-white/10 rounded-[7px] hover:border-lime-400/30 transition-all"
                >
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-white font-bold uppercase tracking-tight">{report.brandName ?? 'Report'}</span>
                    <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{new Date(report.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className={`text-[10px] font-bold uppercase tracking-widest ${statusClass}`}>{statusLabel}</p>
                  <div className="mt-3"><ReportStatusTracker status={report.report_status ?? 'draft'} /></div>
                  {report.overallScore != null && <p className="text-slate-500 text-[10px] mt-1">Score: {report.overallScore}</p>}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
