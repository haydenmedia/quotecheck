"use client";

export function ReportPrintActions() {
  return (
    <div className="report-actions" aria-label="Report sharing actions">
      <button className="print-button" type="button" onClick={() => window.print()}>
        Print or save as PDF
      </button>
      <p>Uses your browser’s print dialog. No report data is sent to a PDF service.</p>
    </div>
  );
}
