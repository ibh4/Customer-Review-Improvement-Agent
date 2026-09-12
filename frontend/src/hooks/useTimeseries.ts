import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { useProduct } from '../context/ProductContext'
import type { TimeseriesPoint } from '../types'

/**
 * Loads the monthly review aggregation for the current product
 * (Review Dynamics / Evidence timelines). Reloads on product switch.
 */
export function useTimeseries() {
  const { currentProductId } = useProduct()
  const [data, setData] = useState<TimeseriesPoint[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadTick, setReloadTick] = useState(0)

  useEffect(() => {
    if (!currentProductId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    setData(null)
    api
      .timeseries(currentProductId)
      .then((list) => {
        if (cancelled) return
        setData(list)
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

  return { data, loading, error, reload: () => setReloadTick((t) => t + 1) }
}
