const PRODUCT_CATEGORY = {
  cards: 'cards',
  credits: 'credits',
  savings: 'savings',
  investments: 'investments',
}

export const PRODUCT_TYPE_TO_CATEGORY_ID = {
  debit_card: PRODUCT_CATEGORY.cards,
  credit_card: PRODUCT_CATEGORY.credits,
  loan: PRODUCT_CATEGORY.credits,
  deposit: PRODUCT_CATEGORY.savings,
  savings_account: PRODUCT_CATEGORY.savings,
  brokerage_account: PRODUCT_CATEGORY.investments,
  iis: PRODUCT_CATEGORY.investments,
  investment_piggy_bank: PRODUCT_CATEGORY.investments,
  metal_account: PRODUCT_CATEGORY.investments,
}

export const CATEGORY_LABEL_BY_ID = {
  [PRODUCT_CATEGORY.cards]: 'Карты',
  [PRODUCT_CATEGORY.credits]: 'Кредиты',
  [PRODUCT_CATEGORY.savings]: 'Накопления',
  [PRODUCT_CATEGORY.investments]: 'Инвестиции',
}

