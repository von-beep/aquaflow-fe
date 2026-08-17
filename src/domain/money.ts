export function formatMoney(amount: number, currency = '₱'): string {
  return (
    currency +
    (Number(amount) || 0).toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  )
}
