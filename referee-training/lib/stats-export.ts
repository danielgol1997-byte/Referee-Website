/**
 * Client-side export of the stats dataset to CSV, Excel (.xlsx), or PDF.
 * Everything renders in the browser from data already on the page — no
 * server round trip — and formats/colours scores consistently with the UI
 * (green ≥9, cyan ≥8, amber ≥7, red below).
 */

import type { StatCategory, StatReferee } from "@/lib/stats-mock";
import { getRefereeOverall } from "@/lib/stats-mock";

export type ExportFormat = "csv" | "excel" | "pdf";

const TEXT_COLUMNS = ["Referee", "Country", "Rank", "Conference"];

/** RGB for score bands, matching components/stats/score-utils.ts. */
function scoreRgb(score: number): [number, number, number] {
  if (score >= 9) return [34, 197, 94]; // green
  if (score >= 8) return [6, 182, 212]; // cyan
  if (score >= 7) return [245, 158, 11]; // amber
  return [239, 68, 68]; // red
}

function scoreArgb(score: number): string {
  const [r, g, b] = scoreRgb(score);
  return `FF${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

function buildRows(referees: StatReferee[], categories: StatCategory[]) {
  const headers = [...TEXT_COLUMNS, ...categories.map((c) => c.short), "Overall"];
  const rows = referees.map((r) => [
    r.name,
    r.country,
    r.level,
    r.conference ?? "—",
    ...categories.map((c) => Number((r.scores[c.slug] ?? 0).toFixed(2))),
    Number(getRefereeOverall(r).toFixed(2)),
  ]);
  return { headers, rows, scoreColStart: TEXT_COLUMNS.length };
}

function downloadBlob(data: Blob, filename: string) {
  const url = URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function timestamp(): string {
  return new Date().toISOString().slice(0, 10);
}

function csvEscape(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function exportToCsv(
  referees: StatReferee[],
  categories: StatCategory[],
  scopeLabel: string
) {
  const { headers, rows } = buildRows(referees, categories);
  const lines = [
    `Referee Statistics Export — ${scopeLabel}`,
    `Generated ${new Date().toLocaleString()}`,
    "",
    headers.join(","),
    ...rows.map((row) => row.map(csvEscape).join(",")),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, `referee-stats-${timestamp()}.csv`);
}

export async function exportToExcel(
  referees: StatReferee[],
  categories: StatCategory[],
  scopeLabel: string
) {
  const ExcelJS = (await import("exceljs")).default;
  const { headers, rows, scoreColStart } = buildRows(referees, categories);

  const wb = new ExcelJS.Workbook();
  wb.creator = "Referee Training Platform";
  wb.created = new Date();
  const sheet = wb.addWorksheet("Statistics", { views: [{ state: "frozen", ySplit: 4 }] });

  const colCount = headers.length;
  sheet.mergeCells(1, 1, 1, colCount);
  const title = sheet.getCell(1, 1);
  title.value = "Referee Statistics Report";
  title.font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
  title.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(1).height = 30;

  sheet.mergeCells(2, 1, 2, colCount);
  const subtitle = sheet.getCell(2, 1);
  subtitle.value = `${scopeLabel}  ·  Generated ${new Date().toLocaleString()}`;
  subtitle.font = { italic: true, size: 10, color: { argb: "FFD7EEF5" } };
  subtitle.alignment = { horizontal: "center" };
  sheet.getRow(2).height = 18;

  for (const rowIdx of [1, 2]) {
    sheet.getRow(rowIdx).eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0E7490" } };
    });
  }

  const headerRow = sheet.getRow(4);
  headerRow.values = headers;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF164E63" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = { bottom: { style: "thin", color: { argb: "FF0891B2" } } };
  });
  headerRow.height = 20;

  rows.forEach((row, i) => {
    const excelRow = sheet.addRow(row);
    const stripe = i % 2 === 0 ? "FF0B1220" : "FF111C2E";
    excelRow.eachCell((cell, colNumber) => {
      cell.alignment = { horizontal: colNumber <= TEXT_COLUMNS.length ? "left" : "center" };
      cell.font = { color: { argb: "FFE5E7EB" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: stripe } };
      if (colNumber > scoreColStart) {
        const val = Number(cell.value);
        if (!Number.isNaN(val)) {
          cell.font = { bold: true, color: { argb: scoreArgb(val) } };
        }
      }
    });
  });

  sheet.columns.forEach((col, i) => {
    col.width = i < TEXT_COLUMNS.length ? 18 : 10;
  });

  const buffer = await wb.xlsx.writeBuffer();
  downloadBlob(
    new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `referee-stats-${timestamp()}.xlsx`
  );
}

export async function exportToPdf(
  referees: StatReferee[],
  categories: StatCategory[],
  scopeLabel: string
) {
  const { default: jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const { headers, rows, scoreColStart } = buildRows(referees, categories);

  const doc = new jsPDF({ orientation: "landscape", unit: "pt" });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(8, 20, 30);
  doc.rect(0, 0, pageWidth, 54, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Referee Statistics Report", 24, 26);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(180, 220, 230);
  doc.text(`${scopeLabel}  ·  Generated ${new Date().toLocaleString()}`, 24, 42);

  autoTable(doc, {
    startY: 66,
    head: [headers],
    body: rows,
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 5, halign: "center" },
    headStyles: {
      fillColor: [8, 145, 178],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "center",
    },
    columnStyles: {
      0: { halign: "left", fontStyle: "bold" },
      1: { halign: "left" },
    },
    alternateRowStyles: { fillColor: [240, 248, 250] },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index >= scoreColStart) {
        const val = Number(data.cell.raw);
        if (!Number.isNaN(val)) {
          data.cell.styles.textColor = scoreRgb(val);
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
  });

  doc.save(`referee-stats-${timestamp()}.pdf`);
}

export async function runExport(
  format: ExportFormat,
  referees: StatReferee[],
  categories: StatCategory[],
  scopeLabel: string
) {
  if (format === "csv") return exportToCsv(referees, categories, scopeLabel);
  if (format === "excel") return exportToExcel(referees, categories, scopeLabel);
  return exportToPdf(referees, categories, scopeLabel);
}
