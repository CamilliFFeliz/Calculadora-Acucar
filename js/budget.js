export function calculateBudgetTotals(budget, context) {
  const safeItems = Array.isArray(budget.items) ? budget.items : [];
  const materialCost = safeItems.reduce((total, cartItem) => {
    const inventoryItem = context.findInventoryItem(cartItem.inventoryItemId);
    return inventoryItem ? total + context.calculateLineSubtotal(inventoryItem, cartItem.quantityUsed) : total;
  }, 0);
  const laborCost = context.normalizeNumber(budget.hourlyRate);
  const totalCost = materialCost + laborCost;
  const marginType = budget.profitMarginType === "fixed" ? "fixed" : "percent";
  const marginValue = context.normalizeNumber(budget.profitMarginValue ?? budget.profitMarginPercent);
  const marginCost = marginType === "fixed"
    ? marginValue
    : totalCost * (context.normalizePercent(marginValue) / 100);
  const unitPrice = totalCost + marginCost;
  const pieceQuantity = Math.max(Math.round(context.normalizeNumber(
    budget.pieceQuantity ?? budget.quantidadePecas ?? budget.sessionDuration ?? budget.quantity
  )), 1);
  const discountValue = context.normalizeNumber(budget.discountValue ?? budget.discountPercent);
  const discountPercent = context.normalizePercent(discountValue);
  const suggestedPrice = unitPrice * pieceQuantity;
  const discountAmount = suggestedPrice * (discountPercent / 100);
  const finalPrice = Math.max(suggestedPrice - discountAmount, 0);

  return {
    materialCost: context.roundMoneyValue(materialCost),
    laborCost: context.roundMoneyValue(laborCost),
    totalCost: context.roundMoneyValue(totalCost),
    marginCost: context.roundMoneyValue(marginCost),
    unitPrice: context.roundMoneyValue(unitPrice),
    pieceQuantity,
    discountPercent: context.roundMoneyValue(discountPercent),
    suggestedPrice: context.roundMoneyValue(suggestedPrice),
    discountAmount: context.roundMoneyValue(discountAmount),
    finalPrice: context.roundMoneyValue(finalPrice)
  };
}
