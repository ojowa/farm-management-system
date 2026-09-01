import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export function exportToCSV(data: Record<string, any>[], filename: string) {
  if (!data.length) return;

  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map((row) =>
      headers
        .map((h) => {
          const val = row[h] ?? '';
          const escaped = String(val).replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(',')
    ),
  ];

  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${filename}.csv`);
}

export function exportToJSON(data: Record<string, any>[], filename: string) {
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  downloadBlob(blob, `${filename}.json`);
}

export interface PDFReportConfig {
  title: string;
  widgets: { title: string; type: string; dataSource: string }[];
}

export function exportToPDF(config: PDFReportConfig) {
  const doc = new jsPDF();

  doc.setFontSize(20);
  doc.text(config.title, 14, 22);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);

  doc.setDrawColor(200);
  doc.line(14, 34, 196, 34);

  let y = 42;

  if (config.widgets.length === 0) {
    doc.setFontSize(12);
    doc.setTextColor(60);
    doc.text('No widgets configured', 14, y);
  } else {
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('Report Summary', 14, y);
    y += 10;

    autoTable(doc, {
      startY: y,
      head: [['Widget', 'Type', 'Data Source']],
      body: config.widgets.map((w) => [
        w.title,
        w.type.charAt(0).toUpperCase() + w.type.slice(1),
        w.dataSource.charAt(0).toUpperCase() + w.dataSource.slice(1),
      ]),
      theme: 'striped',
      headStyles: { fillColor: [34, 139, 34] },
    });
  }

  doc.save(`${config.title.replace(/\s+/g, '-').toLowerCase()}.pdf`);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
