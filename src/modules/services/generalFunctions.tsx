export const formatTND = (
  amount: number | string
): string => {
  const value = Number(amount);

  if (isNaN(value)) return "0,000 TND";

  return (
    value.toLocaleString("fr-FR", {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }) + " TND"
  );
};