const PDF_PAGE_WIDTH = 210;
const PDF_PAGE_HEIGHT = 297;
const PDF_MARGIN = 16;
const PDF_CONTENT_WIDTH = PDF_PAGE_WIDTH - (PDF_MARGIN * 2);
const PDF_PRIMARY_COLOR = [157, 99, 38];
const PDF_PRIMARY_DARK_COLOR = [91, 54, 35];
const PDF_SOFT_COLOR = [255, 248, 225];
const PDF_TEXT_COLOR = [55, 39, 30];
const PDF_MUTED_COLOR = [120, 87, 65];
const PDF_BORDER_COLOR = [232, 198, 132];
const PDF_SUCCESS_COLOR = [91, 54, 35];
const PDF_GOLD_COLOR = [202, 143, 48];
const PDF_DANGER_COLOR = [185, 28, 28];
const PDF_TABLE_HEADER_HEIGHT = 11;
const PDF_MAX_IMAGE_SIZE = 900;

export async function exportInternalBudgetPdf({
  fileName,
  budgetName,
  clientName,
  referenceImage,
  referenceImageName,
  items,
  totals,
  labor,
  pieceQuantity,
  adjustments,
  generatedAt
}) {
  const doc = createPdfDocument();
  const generatedDate = generatedAt || new Date();
  const referencePdfImage = await loadPdfImage(referenceImage);
  const safeItems = Array.isArray(items) ? items : [];
  const safeTotals = totals || {};

  drawInternalPdfHeader(doc, {
    budgetName,
    clientName,
    generatedDate,
    referencePdfImage,
    referenceImageName
  });

  let cursorY = drawInternalSummary(doc, safeTotals, 112);
  cursorY = drawInternalMaterialsTable(doc, safeItems, cursorY + 8);
  cursorY = ensurePageSpace(doc, cursorY, 72, "Detalhamento financeiro");
  cursorY = drawInternalFinancialDetails(doc, {
    totals: safeTotals,
    labor,
    pieceQuantity,
    adjustments,
    cursorY
  });

  drawInternalPdfFooter(doc, generatedDate);
  doc.save(fileName);
}

export async function exportClientBudgetPdf({
  fileName,
  budgetName,
  pieceQuantity,
  discountPercent,
  finalPrice,
}) {
  const doc = createPdfDocument();
  drawClientBudgetOnly(doc, {
    budgetName,
    pieceQuantity,
    discountPercent,
    finalPrice
  });
  doc.save(fileName);
}

function createPdfDocument() {
  const JsPdf = getPdfConstructor();

  if (typeof JsPdf !== "function") {
    throw new Error("jsPDF indisponível.");
  }

  return new JsPdf({
    unit: "mm",
    format: "a4",
    orientation: "portrait",
    compress: true
  });
}

function getPdfConstructor() {
  const runtimeWindow = typeof window !== "undefined" ? window : globalThis;
  return runtimeWindow.jspdf?.jsPDF || runtimeWindow.jsPDF;
}

function drawInternalPdfHeader(doc, { budgetName, clientName, generatedDate, referencePdfImage, referenceImageName }) {
  drawPdfBand(doc, "Relatório financeiro interno", "Controle de custos da Fio & Açucar", generatedDate);
  drawPdfBadge(doc, "USO INTERNO", PDF_PAGE_WIDTH - PDF_MARGIN - 42, 18, 42, PDF_DANGER_COLOR);

  doc.setTextColor(...PDF_TEXT_COLOR);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(21);
  doc.text(splitText(doc, safeText(budgetName || "Orçamento"), 124), PDF_MARGIN, 73);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(...PDF_MUTED_COLOR);
  doc.text(`Cliente: ${safeText(clientName || "Não informado")}`, PDF_MARGIN, 88, { maxWidth: 124 });
  doc.text("Este documento reúne custos, margem, desconto e preço final do pedido.", PDF_MARGIN, 96, { maxWidth: 124 });

  drawReferenceImageBox(doc, referencePdfImage, 154, 66, 38, getReferenceImageLabel(referenceImageName));
}

function drawPdfBand(doc, title, subtitle, generatedDate) {
  doc.setFillColor(...PDF_SOFT_COLOR);
  doc.rect(0, 0, PDF_PAGE_WIDTH, 58, "F");
  doc.setFillColor(...PDF_PRIMARY_COLOR);
  doc.roundedRect(PDF_MARGIN, 14, 34, 34, 7, 7, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("FA", PDF_MARGIN + 17, 35, { align: "center" });

  doc.setTextColor(...PDF_TEXT_COLOR);
  doc.setFontSize(18);
  doc.text("Fio & Açucar", 56, 24);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...PDF_MUTED_COLOR);
  doc.setFontSize(10);
  doc.text(title, 56, 31);
  doc.text(subtitle, 56, 38);
  doc.text(formatDate(generatedDate), 56, 45);
}

function drawInternalSummary(doc, totals, startY) {
  const cards = [
    { label: "Custos internos", value: formatCurrency(totals.materialCost), color: PDF_PRIMARY_COLOR },
    { label: "Mão de obra", value: formatCurrency(totals.laborCost), color: PDF_PRIMARY_COLOR },
    { label: "Custo base", value: formatCurrency(totals.totalCost), color: PDF_PRIMARY_DARK_COLOR },
    { label: "Lucro aplicado", value: formatCurrency(totals.marginCost), color: PDF_SUCCESS_COLOR },
    { label: "Valor unitário", value: formatCurrency(totals.unitPrice), color: PDF_PRIMARY_DARK_COLOR },
    { label: "Qtd. peças", value: formatQuantity(totals.pieceQuantity), color: PDF_PRIMARY_COLOR },
    { label: "Subtotal", value: formatCurrency(totals.suggestedPrice), color: PDF_PRIMARY_DARK_COLOR },
    { label: "Desconto", value: formatCurrency(totals.discountAmount), color: PDF_GOLD_COLOR },
    { label: "Valor final", value: formatCurrency(totals.finalPrice), color: PDF_SUCCESS_COLOR }
  ];
  const cardWidth = (PDF_CONTENT_WIDTH - 10) / 3;
  const cardHeight = 24;
  const rows = Math.ceil(cards.length / 3);
  let y = startY;

  cards.forEach((card, index) => {
    const row = Math.floor(index / 3);
    const column = index % 3;
    const x = PDF_MARGIN + (column * (cardWidth + 5));
    y = startY + (row * (cardHeight + 5));
    drawSummaryCard(doc, x, y, cardWidth, cardHeight, card);
  });

  return startY + (rows * cardHeight) + ((rows - 1) * 5);
}

function drawSummaryCard(doc, x, y, width, height, card) {
  doc.setDrawColor(...PDF_BORDER_COLOR);
  doc.setFillColor(...PDF_SOFT_COLOR);
  doc.roundedRect(x, y, width, height, 4, 4, "FD");
  doc.setTextColor(...PDF_MUTED_COLOR);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(card.label.toUpperCase(), x + 5, y + 8);
  doc.setTextColor(...card.color);
  doc.setFontSize(13);
  doc.text(card.value, x + 5, y + 18, { maxWidth: width - 10 });
}

function drawInternalMaterialsTable(doc, items, startY) {
  let y = ensurePageSpace(doc, startY, 34, "Insumos e materiais");

  drawSectionTitle(doc, "Insumos e materiais utilizados", y);
  y += 10;

  if (items.length === 0) {
    drawEmptyBox(doc, "Nenhum material foi adicionado ao orçamento.", y);
    return y + 24;
  }

  y = drawInternalTableHeader(doc, y);

  items.forEach((item, index) => {
    const itemNameLines = splitText(doc, safeText(item.name || "Item"), 56);
    const categoryLines = splitText(doc, safeText(item.category || "-"), 35);
    const rowHeight = Math.max(14, itemNameLines.length * 4.6 + 7, categoryLines.length * 4.6 + 7);

    if (y + rowHeight > PDF_PAGE_HEIGHT - 30) {
      doc.addPage();
      drawContinuationHeader(doc, "Insumos e materiais");
      y = drawInternalTableHeader(doc, 36);
    }

    if (index % 2 === 0) {
      doc.setFillColor(252, 250, 255);
      doc.rect(PDF_MARGIN, y, PDF_CONTENT_WIDTH, rowHeight, "F");
    }

    doc.setTextColor(...PDF_TEXT_COLOR);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.8);
    doc.text(itemNameLines, PDF_MARGIN + 4, y + 6);
    doc.setTextColor(...PDF_MUTED_COLOR);
    doc.text(categoryLines, 78, y + 6);
    doc.setTextColor(...PDF_TEXT_COLOR);
    doc.text(`${formatQuantity(item.quantity)} ${safeText(item.measureLabel || "")}`.trim(), 128, y + 6, { align: "right" });
    doc.text(formatCurrency(item.unitCost), 160, y + 6, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.text(formatCurrency(item.subtotal), 193, y + 6, { align: "right" });

    const specification = safeText(item.specification);
    if (specification) {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...PDF_MUTED_COLOR);
      doc.setFontSize(7.8);
      doc.text(splitText(doc, specification, 56), PDF_MARGIN + 4, y + rowHeight - 4);
    }

    y += rowHeight;
  });

  return y;
}

function drawInternalTableHeader(doc, y) {
  doc.setFillColor(...PDF_PRIMARY_DARK_COLOR);
  doc.roundedRect(PDF_MARGIN, y, PDF_CONTENT_WIDTH, PDF_TABLE_HEADER_HEIGHT, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Item", PDF_MARGIN + 4, y + 7.2);
  doc.text("Categoria", 78, y + 7.2);
  doc.text("Uso", 128, y + 7.2, { align: "right" });
  doc.text("Custo un.", 160, y + 7.2, { align: "right" });
  doc.text("Subtotal", 193, y + 7.2, { align: "right" });
  return y + PDF_TABLE_HEADER_HEIGHT;
}

function drawInternalFinancialDetails(doc, { totals, labor, pieceQuantity, adjustments, cursorY }) {
  const safeLabor = labor || {};
  const safeAdjustments = adjustments || {};
  const safePieceQuantity = normalizePdfNumber(pieceQuantity || totals.pieceQuantity) > 0
    ? normalizePdfNumber(pieceQuantity || totals.pieceQuantity)
    : 1;
  const boxHeight = 64;

  drawSectionTitle(doc, "Fechamento financeiro", cursorY);
  cursorY += 10;

  doc.setDrawColor(...PDF_BORDER_COLOR);
  doc.setFillColor(...PDF_SOFT_COLOR);
  doc.roundedRect(PDF_MARGIN, cursorY, PDF_CONTENT_WIDTH, boxHeight, 5, 5, "FD");
  doc.setTextColor(...PDF_TEXT_COLOR);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.2);

  const lines = [
    `Custos internos: ${formatCurrency(totals.materialCost)}`,
    `Mão de obra: ${formatCurrency(safeLabor.rate)} = ${formatCurrency(safeLabor.total)}`,
    `Margem de lucro: ${formatAdjustment(safeAdjustments.profitMarginType, safeAdjustments.profitMarginValue)} = ${formatCurrency(safeAdjustments.profitMarginAmount)}`,
    `Quantidade de peças: ${formatQuantity(safePieceQuantity)}`,
    `Desconto: ${formatAdjustment(safeAdjustments.discountType, safeAdjustments.discountValue)} = -${formatCurrency(safeAdjustments.discountAmount)}`,
    `Fórmula: (custos + mão de obra + lucro) x peças - desconto = ${formatCurrency(totals.finalPrice)}`
  ];

  lines.forEach((line, index) => {
    doc.text(line, PDF_MARGIN + 6, cursorY + 10 + (index * 8), { maxWidth: PDF_CONTENT_WIDTH - 12 });
  });

  return cursorY + boxHeight;
}

function drawClientBudgetOnly(doc, { budgetName, pieceQuantity, discountPercent, finalPrice }) {
  const rows = [
    { label: "Nome do Orçamento", value: safeText(budgetName || "Orçamento") },
    { label: "Quantidade de Peças", value: formatQuantity(pieceQuantity || 1) },
    { label: "Desconto (%)", value: `${formatQuantity(discountPercent)}%` },
    { label: "Valor Final", value: formatCurrency(finalPrice) }
  ];
  const startY = 48;
  const rowHeight = 28;
  const boxHeight = rows.length * rowHeight;

  doc.setFillColor(...PDF_SOFT_COLOR);
  doc.rect(0, 0, PDF_PAGE_WIDTH, PDF_PAGE_HEIGHT, "F");
  doc.setDrawColor(...PDF_BORDER_COLOR);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(PDF_MARGIN, startY, PDF_CONTENT_WIDTH, boxHeight, 8, 8, "FD");

  rows.forEach((row, index) => {
    const y = startY + (index * rowHeight);

    if (index > 0) {
      doc.setDrawColor(...PDF_BORDER_COLOR);
      doc.line(PDF_MARGIN + 8, y, PDF_PAGE_WIDTH - PDF_MARGIN - 8, y);
    }

    doc.setTextColor(...PDF_MUTED_COLOR);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(row.label, PDF_MARGIN + 10, y + 11);

    const valueColor = index === rows.length - 1 ? PDF_PRIMARY_DARK_COLOR : PDF_TEXT_COLOR;
    doc.setTextColor(...valueColor);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(index === rows.length - 1 ? 18 : 12);
    doc.text(splitText(doc, row.value, PDF_CONTENT_WIDTH - 72), PDF_PAGE_WIDTH - PDF_MARGIN - 10, y + 15, { align: "right" });
  });
}

function drawInternalPdfFooter(doc, generatedDate) {
  drawPdfFooter(doc, [
    "Documento interno: não enviar ao cliente final.",
    `Gerado em ${formatDate(generatedDate)} para controle financeiro do pedido.`
  ]);
}

function drawPdfFooter(doc, lines) {
  doc.setDrawColor(...PDF_BORDER_COLOR);
  doc.line(PDF_MARGIN, PDF_PAGE_HEIGHT - 31, PDF_PAGE_WIDTH - PDF_MARGIN, PDF_PAGE_HEIGHT - 31);
  doc.setTextColor(...PDF_MUTED_COLOR);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.4);
  lines.forEach((line, index) => {
    doc.text(line, PDF_MARGIN, PDF_PAGE_HEIGHT - 24 + (index * 6));
  });
}

function getReferenceImageLabel(referenceImageName) {
  return safeText(referenceImageName) ? "Arte anexada" : "Arte";
}

function drawReferenceImageBox(doc, image, x, y, size, label) {
  doc.setDrawColor(...PDF_BORDER_COLOR);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x, y, size, size, 4, 4, "FD");

  if (image) {
    const fittedSize = fitImage(image.width, image.height, size - 7, size - 12);
    const imageX = x + ((size - fittedSize.width) / 2);
    const imageY = y + 4;

    try {
      doc.addImage(image.dataUrl, image.format, imageX, imageY, fittedSize.width, fittedSize.height, undefined, "FAST");
    } catch {
      drawReferencePlaceholder(doc, x, y, size, label);
      return;
    }
  } else {
    drawReferencePlaceholder(doc, x, y, size, label);
    return;
  }

  doc.setTextColor(...PDF_MUTED_COLOR);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.4);
  doc.text(label, x + (size / 2), y + size - 3, { align: "center" });
}

function drawReferencePlaceholder(doc, x, y, size, label) {
  doc.setTextColor(...PDF_MUTED_COLOR);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(label, x + (size / 2), y + (size / 2), { align: "center" });
}

function drawSectionTitle(doc, title, y) {
  doc.setTextColor(...PDF_TEXT_COLOR);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(title, PDF_MARGIN, y);
}

function drawEmptyBox(doc, message, y) {
  doc.setDrawColor(...PDF_BORDER_COLOR);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(PDF_MARGIN, y, PDF_CONTENT_WIDTH, 18, 4, 4, "FD");
  doc.setTextColor(...PDF_MUTED_COLOR);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(message, PDF_MARGIN + 5, y + 11);
}

function drawPdfBadge(doc, text, x, y, width, color) {
  doc.setFillColor(...color);
  doc.roundedRect(x, y, width, 10, 4, 4, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.4);
  doc.text(text, x + (width / 2), y + 6.8, { align: "center" });
}

function drawContinuationHeader(doc, title) {
  doc.setTextColor(...PDF_PRIMARY_DARK_COLOR);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(`Fio & Açucar · ${title}`, PDF_MARGIN, 22);
  doc.setDrawColor(...PDF_BORDER_COLOR);
  doc.line(PDF_MARGIN, 28, PDF_PAGE_WIDTH - PDF_MARGIN, 28);
}

function ensurePageSpace(doc, currentY, requiredHeight, continuationTitle) {
  if (currentY + requiredHeight <= PDF_PAGE_HEIGHT - 34) {
    return currentY;
  }

  doc.addPage();
  drawContinuationHeader(doc, continuationTitle);
  return 38;
}

async function loadPdfImage(imageDataUrl) {
  if (!isImageDataUrl(imageDataUrl)) {
    return null;
  }

  if (typeof Image !== "function") {
    return {
      dataUrl: imageDataUrl,
      format: getImageFormat(imageDataUrl),
      width: 1,
      height: 1
    };
  }

  return new Promise((resolve) => {
    const image = new Image();
    image.addEventListener("load", () => {
      resolve(createCanvasImageData(image, imageDataUrl));
    }, { once: true });
    image.addEventListener("error", () => resolve(null), { once: true });
    image.src = imageDataUrl;
  });
}

function createCanvasImageData(image, fallbackDataUrl) {
  const width = image.naturalWidth || image.width || 1;
  const height = image.naturalHeight || image.height || 1;

  if (typeof document === "undefined") {
    return {
      dataUrl: fallbackDataUrl,
      format: getImageFormat(fallbackDataUrl),
      width,
      height
    };
  }

  try {
    const scale = Math.min(1, PDF_MAX_IMAGE_SIZE / width, PDF_MAX_IMAGE_SIZE / height);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Canvas indisponível.");
    }

    context.fillStyle = "#FFFFFF";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    return {
      dataUrl: canvas.toDataURL("image/jpeg", 0.88),
      format: "JPEG",
      width: canvas.width,
      height: canvas.height
    };
  } catch {
    return {
      dataUrl: fallbackDataUrl,
      format: getImageFormat(fallbackDataUrl),
      width,
      height
    };
  }
}

function fitImage(imageWidth, imageHeight, maxWidth, maxHeight) {
  const safeWidth = Math.max(1, normalizePdfNumber(imageWidth));
  const safeHeight = Math.max(1, normalizePdfNumber(imageHeight));
  const ratio = Math.min(maxWidth / safeWidth, maxHeight / safeHeight);

  return {
    width: safeWidth * ratio,
    height: safeHeight * ratio
  };
}

function splitText(doc, value, maxWidth) {
  const text = safeText(value);
  return doc.splitTextToSize ? doc.splitTextToSize(text, maxWidth) : [text];
}

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(normalizePdfNumber(value));
}

function formatQuantity(value) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(normalizePdfNumber(value));
}

function formatAdjustment(type, value) {
  if (type === "fixed") {
    return formatCurrency(value);
  }

  return `${formatQuantity(value)}%`;
}

function formatDate(date) {
  return new Intl.DateTimeFormat("pt-BR").format(date);
}

function safeText(value) {
  return String(value || "").trim();
}

function normalizePdfNumber(value) {
  const normalizedValue = Number(value);
  return Number.isFinite(normalizedValue) ? normalizedValue : 0;
}

function isImageDataUrl(value) {
  return /^data:image\/(png|jpeg|jpg|webp);base64,/i.test(String(value || ""));
}

function getImageFormat(imageDataUrl) {
  if (/^data:image\/png/i.test(imageDataUrl)) {
    return "PNG";
  }

  if (/^data:image\/webp/i.test(imageDataUrl)) {
    return "WEBP";
  }

  return "JPEG";
}
