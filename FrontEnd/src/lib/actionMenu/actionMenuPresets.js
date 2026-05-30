import iconBag from '../../assets/icons/modal_menu/icon_bag.svg'
import iconShare from '../../assets/icons/modal_menu/icon_share.svg'
import iconDoublePaper from '../../assets/icons/modal_menu/icon_double_papper.svg'
import iconMakeGoal from '../../assets/icons/modal_menu/icon_make_goal.svg'
import iconGraphArrow from '../../assets/icons/modal_menu/icon_grath_arrow.svg'

/**
 * @typedef {Object} ActionMenuItem
 * @property {string} id
 * @property {string} label
 * @property {string} [icon]
 * @property {string} actionKey — ключ в ACTION_MENU_HANDLERS
 * @property {boolean} [separatorBefore]
 * @property {boolean} [destructive]
 * @property {boolean} [secondary]
 * @property {boolean} [disabled]
 */

/** Переиспользуемые пункты — подписи и иконки из Figma frame 1033:8 / 817:1524. */
export const ACTION_MENU_ITEM = {
  newExpense: {
    id: 'new-expense',
    label: 'Новая трата',
    icon: iconBag,
    actionKey: 'newExpense',
  },
  newIncome: {
    id: 'new-income',
    label: 'Новое поступление',
    icon: iconGraphArrow,
    actionKey: 'newIncome',
  },
  uploadStatement: {
    id: 'upload-statement',
    label: 'Загрузить выписку',
    icon: iconDoublePaper,
    actionKey: 'uploadStatement',
  },
  createGoal: {
    id: 'create-goal',
    label: 'Создать цель',
    icon: iconMakeGoal,
    actionKey: 'createGoal',
    separatorBefore: true,
  },
  paymentTemplate: {
    id: 'payment-template',
    label: 'Шаблон платежа',
    icon: iconShare,
    actionKey: 'paymentTemplate',
  },
}

/** Полный набор Home по макету Figma (сверху вниз). */
const HOME_MENU_ITEMS = [
  ACTION_MENU_ITEM.newExpense,
  ACTION_MENU_ITEM.newIncome,
  ACTION_MENU_ITEM.uploadStatement,
  ACTION_MENU_ITEM.createGoal,
  ACTION_MENU_ITEM.paymentTemplate,
]

/**
 * @type {Record<string, ActionMenuItem[]>}
 */
export const ACTION_MENU_PRESETS = {
  home: HOME_MENU_ITEMS,

  /** Заглушки под будущие экраны — пока тот же набор, что на Home */
  transactions: HOME_MENU_ITEMS,
  transactionsSub: HOME_MENU_ITEMS,

  settings: [
    { ...ACTION_MENU_ITEM.createGoal, separatorBefore: false },
    ACTION_MENU_ITEM.uploadStatement,
    ACTION_MENU_ITEM.paymentTemplate,
  ],

  accounts: [
    ACTION_MENU_ITEM.newExpense,
    ACTION_MENU_ITEM.uploadStatement,
    { ...ACTION_MENU_ITEM.createGoal, separatorBefore: false },
  ],

  default: HOME_MENU_ITEMS,
}
