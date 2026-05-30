export const PRODUCT_TYPE_TITLE = {
  debit_card: 'Дебетовая карта',
  credit_card: 'Кредитная карта',
  deposit: 'Вклад',
  savings_account: 'Накопительный счёт',
  brokerage_account: 'Брокерский счёт',
  iis: 'ИИС',
  investment_piggy_bank: 'Инвесткопилка',
  metal_account: 'Металлический счёт',
  loan: 'Кредит',
}

export function getProductTypeTitle(productType) {
  return PRODUCT_TYPE_TITLE[productType] || productType || '—'
}
