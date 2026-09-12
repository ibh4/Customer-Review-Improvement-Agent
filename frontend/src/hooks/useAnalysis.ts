import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { useProduct } from '../context/ProductContext'
import type { Analysis } from '../types'

/**
 * Loads analysis for the currently selected product and reloads
 * whenever the global product switcher changes.
 */
export function useAnalysis() {
  const { currentProductId } = useProduct()
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadTick, setReloadTick] = useState(0)

  useEffect(() => {
    if (!currentProductId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    setAnalysis(null)
    api
      .analysis(currentProductId)
      .then((data) => {
        if (cancelled) return
        setAnalysis(data)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : String(err))
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [currentProductId, reloadTick])

  return {
    analysis,
    loading,
    error,
    reload: () => setReloadTick((t) => t + 1),
  }
}
