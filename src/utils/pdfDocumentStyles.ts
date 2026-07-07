export const PDF_DOCUMENT_BASE_CSS = `
  @page {
    size: A4;
    margin: 10mm 11mm 9mm 11mm;
  }

  :root {
    --brand: #d71920;
    --ink: #2f3337;
    --value: #3f454b;
    --muted: #5f666d;
    --quiet: #7a828a;
    --line: #cfd4da;
    --light-line: #d7dce1;
    --soft: #f3f5f7;
    --soft-2: #fafbfc;
    --ok: #177245;
    --ok-soft: #edf8f1;
    --fail: #b42318;
    --fail-soft: #fff1f0;
    --alert: #9a5b00;
    --alert-soft: #fff7e8;
  }

  * {
    box-sizing: border-box;
  }

  html,
  body {
    margin: 0;
    padding: 0;
    background: #ffffff;
    color: var(--ink);
    font-family: Inter, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    font-size: 10.8px;
    line-height: 1.24;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    text-rendering: geometricPrecision;
  }

  .document {
    width: 1123px;
    min-height: 1588px;
    padding: 38px 56px 34px;
    background: #ffffff;
  }

  .document-header,
  .os-header,
  .header {
    display: grid;
    grid-template-columns: 240px 1fr;
    gap: 22px;
    align-items: start;
    padding-bottom: 11px;
    border-bottom: 1px solid var(--line);
  }

  .logo {
    width: 190px;
    max-width: 190px;
    max-height: 58px;
    display: block;
    object-fit: contain;
  }

  .document-title,
  .header-title {
    text-align: right;
  }

  .document-title h1,
  .header-title h1 {
    margin: 0 0 5px;
    color: var(--ink);
    font-size: 19px;
    line-height: 1.05;
    font-weight: 750;
    letter-spacing: -0.2px;
  }

  .document-meta,
  .header-title p,
  .header-title .meta {
    margin: 0;
    color: var(--muted);
    font-size: 10.5px;
    line-height: 1.25;
  }

  .document-code {
    margin-top: 2px;
    color: var(--muted);
    font-size: 11.2px;
    font-weight: 700;
    line-height: 1.2;
  }

  .section {
    margin-top: 11px;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .section-title {
    margin: 0 0 7px;
    padding-bottom: 4px;
    border-bottom: 1px solid var(--light-line);
    color: var(--ink);
    font-size: 14px;
    line-height: 1;
    font-weight: 750;
    letter-spacing: -0.1px;
  }

  .section-title strong {
    display: block;
    color: inherit;
    font: inherit;
    letter-spacing: inherit;
  }

  .info-grid {
    display: grid;
    gap: 5px 14px;
    padding-left: 8px;
  }

  .info-grid-2 {
    grid-template-columns: 1fr 1fr;
  }

  .info-grid-3 {
    grid-template-columns: 1fr 1fr 1fr;
  }

  .field {
    display: flex;
    gap: 5px;
    align-items: baseline;
    min-width: 0;
  }

  .field-address {
    grid-column: span 2;
  }

  .field-label,
  .field span,
  .service-line span {
    color: var(--ink);
    font-weight: 700;
    white-space: nowrap;
  }

  .field-value,
  .field strong {
    color: var(--value);
    font-weight: 500;
    overflow-wrap: anywhere;
  }

  .field-address .field-value,
  .field-address strong {
    overflow-wrap: anywhere;
  }

  .soft-box,
  .service-box,
  .card-soft {
    border: 1px solid var(--light-line);
    border-radius: 6px;
    background: var(--soft-2);
    padding: 7px 8px;
  }

  .data-table,
  .technical-table,
  .simple-table,
  .items-table {
    width: 100%;
    border-collapse: collapse;
    border: 1px solid var(--line);
    font-size: 9.8px;
    margin-top: 7px;
    page-break-inside: auto;
  }

  .data-table thead,
  .technical-table thead,
  .simple-table thead,
  .items-table thead,
  thead {
    display: table-header-group;
  }

  .data-table tr,
  .technical-table tr,
  .simple-table tr,
  .items-table tr,
  tr {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .data-table th,
  .technical-table th,
  .simple-table th,
  .items-table th {
    padding: 4.5px 6px;
    border: 1px solid var(--line);
    background: var(--soft);
    color: var(--ink);
    font-weight: 750;
    text-align: center;
    vertical-align: middle;
  }

  .data-table td,
  .technical-table td,
  .simple-table td,
  .items-table td {
    padding: 4px 6px;
    border: 1px solid var(--light-line);
    color: var(--value);
    text-align: center;
    vertical-align: middle;
  }

  .data-table tbody tr:nth-child(even) td,
  .technical-table tbody tr:nth-child(even) td,
  .simple-table tbody tr:nth-child(even) td,
  .items-table tbody tr:nth-child(even) td {
    background: #fbfcfd;
  }

  .data-table .text-left,
  .technical-table .text-left,
  .simple-table .text-left,
  .items-table .text-left {
    text-align: left;
  }

  .data-table .nowrap,
  .technical-table .nowrap,
  .simple-table .nowrap,
  .items-table .nowrap {
    white-space: nowrap;
  }

  .signature-area {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 24px;
    align-items: start;
    margin-top: 22px;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .signature-block {
    min-height: 62px;
    text-align: center;
    color: var(--ink);
  }

  .signature-image {
    display: block;
    width: 105px;
    height: 40px;
    max-width: 100%;
    object-fit: contain;
    margin: 0 auto 3px;
  }

  .signature-image-placeholder {
    height: 40px;
    margin-bottom: 3px;
  }

  .signature-line {
    border-top: 1px solid #7c838a;
    height: 1px;
    margin-bottom: 5px;
  }

  .signature-name {
    font-size: 9.7px;
    font-weight: 700;
    color: var(--ink);
    line-height: 1.15;
  }

  .signature-role {
    font-size: 9px;
    color: var(--muted);
    line-height: 1.15;
  }

  .signature-register {
    font-size: 8.8px;
    color: var(--muted);
    line-height: 1.15;
  }

  .document-footer {
    margin-top: 12px;
    padding-top: 5px;
    border-top: 1px solid var(--light-line);
    display: flex;
    justify-content: space-between;
    gap: 8px;
    font-size: 6.9px;
    line-height: 1.15;
    color: var(--muted);
  }

  .footer-info {
    flex: 1;
    text-align: center;
  }

  .footer-page {
    min-width: 54px;
    text-align: right;
    white-space: nowrap;
  }

  .section,
  .soft-box,
  .summary-block,
  .signature-area {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  @media print {
    .document {
      width: auto;
      min-height: auto;
      padding: 0;
    }
  }
`;
