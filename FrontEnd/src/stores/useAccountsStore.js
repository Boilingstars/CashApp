import { create } from 'zustand'

import {
  CATEGORY_LABEL_BY_ID,
  PRODUCT_TYPE_TO_CATEGORY_ID,
} from '../lib/constants/productTypeMap.js'
import { bankProducts } from '../lib/mocks/bankProducts.js'
import { mapApiProductsToClient } from '../lib/products/mapApiProductToClient.js'

const ALL_CATEGORY_ID = 'all'

const buildCategorySetFromProducts = (products) => {
  const ids = new Set()
  for (const p of products) {
    const categoryId = PRODUCT_TYPE_TO_CATEGORY_ID[p.product_type]
    if (categoryId) ids.add(categoryId)
  }
  return ids
}

export const useAccountsStore = create((set, get) => ({
  products: bankProducts,
  selectedCategoryId: ALL_CATEGORY_ID,
  productsLoading: false,
  productsLoaded: false,
  productsError: null,

  fetchProducts: async () => {
    const { productsLoaded, productsLoading } = get()
    if (productsLoaded || productsLoading) return

    set({ productsLoading: true, productsError: null })

    try {
      const { getProducts } = await import('../lib/api/products.js')
      const rawProducts = await getProducts()
      const products = mapApiProductsToClient(rawProducts)

      set({
        products: products.length > 0 ? products : bankProducts,
        productsLoading: false,
        productsLoaded: true,
        productsError: null,
      })
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Failed to fetch products'

      set({
        productsLoading: false,
        productsLoaded: true,
        productsError: message,
      })
    }
  },

  setSelectedCategory: (id) => {
    set({ selectedCategoryId: id || ALL_CATEGORY_ID })
  },

  getAvailableCategories: () => {
    const { products } = get()
    const ids = buildCategorySetFromProducts(products)

    const categories = [{ id: ALL_CATEGORY_ID, label: 'Все' }]
    for (const id of ids) {
      categories.push({ id, label: CATEGORY_LABEL_BY_ID[id] || id })
    }
    return categories
  },

  getProductsByActiveCategory: () => {
    const { products, selectedCategoryId } = get()
    if (selectedCategoryId === ALL_CATEGORY_ID) return products
    return products.filter(
      (p) => PRODUCT_TYPE_TO_CATEGORY_ID[p.product_type] === selectedCategoryId,
    )
  },

  getActiveCategoryBalance: () => {
    const items = get().getProductsByActiveCategory()
    return items.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
  },

  updateProduct: (payload) => {
    if (!payload?.id) return
    set((state) => ({
      products: state.products.map((p) =>
        p.id === payload.id
          ? {
              ...p,
              ...payload,
              updated_at: payload.updated_at || new Date().toISOString(),
            }
          : p,
      ),
    }))
  },

  removeProduct: (id) => {
    if (!id) return
    set((state) => ({
      products: state.products.filter((p) => p.id !== id),
    }))
  },
}))

