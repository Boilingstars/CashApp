import { useState } from 'react'

import { getCategories } from '../../lib/api/categories.js'
import { getOperations } from '../../lib/api/operations.js'
import { getProductsRaw } from '../../lib/api/products.js'
import { getServices } from '../../lib/api/services.js'
import {
  inspectApiResponse,
  inspectCategoriesShape,
  inspectProductsShape,
  inspectServicesShape,
} from '../../lib/api/inspectApiResponse.js'

import styles from './Profile.module.css'

const formatJson = (value) => {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

const DEBUG_ENDPOINTS = [
  {
    key: 'products',
    title: 'GET /api/products/',
    fetch: getProductsRaw,
    inspect: inspectProductsShape,
  },
  {
    key: 'services',
    title: 'GET /api/services/',
    fetch: getServices,
    inspect: inspectServicesShape,
  },
  {
    key: 'categories',
    title: 'GET /api/categories/',
    fetch: getCategories,
    inspect: inspectCategoriesShape,
  },
  {
    key: 'operations',
    title: 'GET /api/operations/',
    fetch: getOperations,
    inspect: inspectApiResponse,
  },
]

function ApiDebugSection({ title, isLoading, result, onFetch }) {
  return (
    <section className={styles.debugSection} aria-label={`Разведка ${title}`}>
      <h2 className={styles.debugTitle}>{title}</h2>
      <p className={styles.debugHint}>
        Auth bootstrap через AppShell. Данные не пишутся в store.
      </p>

      <button
        type="button"
        className={styles.fetchButton}
        disabled={isLoading}
        onClick={onFetch}
      >
        {isLoading ? 'Запрос…' : `Запросить ${title}`}
      </button>

      {result ? (
        <>
          <p
            className={[
              styles.statusLine,
              result.ok ? styles.statusOk : styles.statusError,
            ]
              .filter(Boolean)
              .join(' ')}
          >
            Status: {result.status ?? '—'}
            {!result.ok && result.message ? ` · ${result.message}` : ''}
          </p>

          <h3 className={styles.blockTitle}>Raw response / error body</h3>
          <pre className={styles.pre}>{formatJson(result.raw)}</pre>

          {result.shape ? (
            <>
              <h3 className={styles.blockTitle}>Shape summary</h3>
              <pre className={styles.pre}>{formatJson(result.shape)}</pre>
            </>
          ) : null}
        </>
      ) : null}
    </section>
  )
}

export function Profile() {
  const [loadingKey, setLoadingKey] = useState(null)
  const [results, setResults] = useState({})

  const handleFetch = (endpoint) => async () => {
    setLoadingKey(endpoint.key)
    setResults((prev) => ({ ...prev, [endpoint.key]: null }))

    try {
      const response = await endpoint.fetch()
      setResults((prev) => ({
        ...prev,
        [endpoint.key]: {
          ok: true,
          status: response.status,
          raw: response.data,
          shape: endpoint.inspect(response.data),
        },
      }))
    } catch (err) {
      setResults((prev) => ({
        ...prev,
        [endpoint.key]: {
          ok: false,
          status: err.response?.status ?? null,
          message: err.message,
          raw: err.response?.data ?? null,
          shape: err.response?.data ? endpoint.inspect(err.response.data) : null,
        },
      }))
    } finally {
      setLoadingKey(null)
    }
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Профиль</h1>
      <p className={styles.note}>
        Временная разведка API — не влияет на stores и transactions UI.
      </p>

      {DEBUG_ENDPOINTS.map((endpoint) => (
        <ApiDebugSection
          key={endpoint.key}
          title={endpoint.title}
          isLoading={loadingKey === endpoint.key}
          result={results[endpoint.key]}
          onFetch={handleFetch(endpoint)}
        />
      ))}
    </div>
  )
}
