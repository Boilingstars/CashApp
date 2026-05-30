import iconSber from '../../assets/icons/icon_sber.svg'
import iconVtb from '../../assets/icons/icon_vtb.svg'
import iconAlfabank from '../../assets/icons/icon_alfabank.svg'
import iconTbank from '../../assets/icons/icon_tbank.svg'
import iconGazprombank from '../../assets/icons/icon_gazprombank.svg'
import iconRosselhoz from '../../assets/icons/icon_rosselhoz.svg'
import iconSovcombank from '../../assets/icons/icon_sovcombank.svg'
import iconPsb from '../../assets/icons/icon_psb.svg'
import iconYandex from '../../assets/icons/icon_yandex.svg'
import iconOzon from '../../assets/icons/icon_ozon.svg'
import iconWildberries from '../../assets/icons/icon_wildberries.svg'

const normalizeBankName = (bankName) =>
  (bankName || '').trim().toLowerCase().replace(/\s+/g, ' ')

/** bank_name из БД → SVG (ключ = имя файла без icon_ и .svg) */
export const BANK_ICON_BY_NAME = {
  сбербанк: iconSber,
  втб: iconVtb,
  'альфа-банк': iconAlfabank,
  'т-банк': iconTbank,
  тинькофф: iconTbank,
  газпромбанк: iconGazprombank,
  россельхозбанк: iconRosselhoz,
  совкомбанк: iconSovcombank,
  псб: iconPsb,
  яндекс: iconYandex,
  ozon: iconOzon,
  wildberries: iconWildberries,
}

/** Иконки с цветной заливкой на весь SVG — показываем на весь слот без белой подложки */
const BANK_ICON_FULL_BLEED = new Set(['т-банк', 'тинькофф', 'ozon', 'яндекс', 'wildberries'])

export function getBankIcon(bankName) {
  return BANK_ICON_BY_NAME[normalizeBankName(bankName)] ?? null
}

export function isBankIconFullBleed(bankName) {
  return BANK_ICON_FULL_BLEED.has(normalizeBankName(bankName))
}
