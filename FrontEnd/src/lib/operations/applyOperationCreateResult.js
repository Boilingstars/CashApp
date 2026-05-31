import { mapApiOperationToClient } from './mapApiOperationToClient.js'
import { mapApiProductToClient } from '../products/mapApiProductToClient.js'
import { useAccountsStore } from '../../stores/useAccountsStore.js'
import { useTransactionsStore } from '../../stores/useTransactionsStore.js'

/**
 * После POST /operations/create/: операция в список, баланс счёта — из ответа API.
 */
export function applyOperationCreateResult(apiOperation, { patchClient } = {}) {
  let clientTx = mapApiOperationToClient(apiOperation)
  if (patchClient && typeof patchClient === 'object') {
    clientTx = { ...clientTx, ...patchClient }
  }

  useTransactionsStore.getState().prependOperation(clientTx)

  const apiAccount = apiOperation?.account
  if (apiAccount?.id != null) {
    useAccountsStore.getState().updateProduct(mapApiProductToClient(apiAccount))
  }

  return clientTx
}
