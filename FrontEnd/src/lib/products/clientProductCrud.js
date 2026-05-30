/**
 * TEMP / TODO: client-side CRUD для продуктов до интеграции с backend.
 * Заменить вызовы в saveProduct / deleteProduct (lib/api/products.js)
 * на реальные HTTP-запросы, когда появятся PUT/PATCH и DELETE эндпоинты.
 */
import { useAccountsStore } from '../../stores/useAccountsStore.js'

export function applyProductUpdate(payload) {
  useAccountsStore.getState().updateProduct(payload)
}

export function applyProductDelete(id) {
  useAccountsStore.getState().removeProduct(id)
}
