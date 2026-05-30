/** Заглушки обработчиков — заменить при подключении бизнес-логики. */
export const ACTION_MENU_HANDLERS = {
  newExpense: () => {},
  newIncome: () => {},
  uploadStatement: () => {},
  createGoal: () => {},
  paymentTemplate: () => {},
}

export function runActionMenuHandler(actionKey) {
  const handler = ACTION_MENU_HANDLERS[actionKey]
  if (typeof handler === 'function') {
    handler()
  }
}
