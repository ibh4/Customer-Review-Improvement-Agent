import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api } from '../api/client'
import type { ProductSummary } from '../types'

const STORAGE_KEY = 'r2p.currentProductId'

interface ProductContextValue {
  products: ProductSummary[]
  currentProduct: ProductSummary | null
  currentProductId: string | null
  loading: boolean
  error: string | null
  setProduct: (id: string) => void
  reload: () => void
}

const ProductContext = createContext<ProductContextValue | null>(null)

function pickInitialProduct(products: ProductSummary[]): ProductSummary | null {
  if (products.length === 0) return null
  const saved = window.localStorage.getItem(STORAGE_KEY)
  if (saved) {
    const found = products.find((p) => p.product_id === saved)
    if (found) return found
  }
  return products.find((p) => p.is_demo_hero) ?? products[0]
}

export function ProductProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<ProductSummary[]>([])
  const [currentProductId, setCurrentProductId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadTick, setReloadTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    let retryTimer = 0
    let attempts = 0
    setLoading(true)
    setError(null)

    const load = () => {
      api
        .products()
        .then((list) => {
          if (cancelled) return
          if (list.length === 0 && attempts < 10) {
            /* backend cold start can briefly serve an empty list — retry */
            attempts += 1
            retryTimer = window.setTimeout(load, 1200)
            return
          }
          setProducts(list)
          setCurrentProductId((prev) => {
            if (prev && list.some((p) => p.product_id === prev)) return prev
            const initial = pickInitialProduct(list)
            return initial ? initial.product_id : null
          })
          setLoading(false)
        })
        .catch((err: unknown) => {
          if (cancelled) return
          setError(err instanceof Error ? err.message : String(err))
          setLoading(false)
        })
    }
    load()

    return () => {
      cancelled = true
      window.clearTimeout(retryTimer)
    }
  }, [reloadTick])

  const setProduct = useCallback((id: string) => {
    setCurrentProductId(id)
    window.localStorage.setItem(STORAGE_KEY, id)
  }, [])

  const reload = useCallback(() => setReloadTick((t) => t + 1), [])

  const value = useMemo<ProductContextValue>(() => {
    const currentProduct = products.find((p) => p.product_id === currentProductId) ?? null
    return {
      products,
      currentProduct,
      currentProductId,
      loading,
      error,
      setProduct,
      reload,
    }
  }, [products, currentProductId, loading, error, setProduct, reload])

  return <ProductContext.Provider value={value}>{children}</ProductContext.Provider>
}

export function useProduct(): ProductContextValue {
  const ctx = useContext(ProductContext)
  if (!ctx) throw new Error('useProduct must be used within ProductProvider')
  return ctx
}
