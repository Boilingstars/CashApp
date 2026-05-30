/** API bank_name slug → имя для UI и bankIconMap */
const API_BANK_SLUG_TO_NAME = {
  sber: 'Сбербанк',
  vtb: 'ВТБ',
  alfa: 'Альфа-Банк',
  t_bank: 'Т-Банк',
  tinkoff: 'Т-Банк',
  gazprombank: 'Газпромбанк',
  rosselhoz: 'Россельхозбанк',
  sovcombank: 'Совкомбанк',
  psb: 'ПСБ',
  yandex: 'Яндекс',
  ozon: 'Ozon',
  wildberries: 'Wildberries',
}

const toStoredAmount = (rawAmount, productType) => {
  const n = Math.abs(Number(rawAmount) || 0)
  if (productType === 'credit_card' || productType === 'loan') return -n
  return n
}

const toAccountNumber = (serialNumber) => {
  if (serialNumber == null || serialNumber === '') return ''
  const digits = String(serialNumber).replace(/\D/g, '')
  if (!digits) return ''
  return digits.slice(-4)
}

export function resolveBankDisplayName(bankName) {
  const key = (bankName || '').trim().toLowerCase()
  return API_BANK_SLUG_TO_NAME[key] || bankName || ''
}

/** API product → модель, которую читают Home / Accounts / ProductEdit */
export function mapApiProductToClient(apiProduct) {
  const productType = apiProduct?.product_type || 'debit_card'

  return {
    id: String(apiProduct.id),
    product_type: productType,
    bank_name: resolveBankDisplayName(apiProduct.bank_name),
    currency_code: apiProduct.currency_code || 'RUB',
    amount: toStoredAmount(apiProduct.amount, productType),
    custom_name: apiProduct.custom_name || '',
    account_number: toAccountNumber(apiProduct.serial_number),
    serial_number: apiProduct.serial_number ?? null,
    updated_at: new Date().toISOString(),
  }
}

export function mapApiProductsToClient(items) {
  if (!Array.isArray(items)) return []
  return items.map(mapApiProductToClient)
}
