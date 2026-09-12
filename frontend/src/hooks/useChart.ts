import { useEffect, useRef } from 'react'
import * as echarts from 'echarts/core'
import {
  BarChart,
  LineChart,
  PieChart,
  RadarChart,
  SankeyChart,
  ScatterChart,
} from 'echarts/charts'
import {
  GraphicComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  VisualMapComponent,
  DataZoomComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsOption } from 'echarts'

echarts.use([
  BarChart,
  LineChart,
  PieChart,
  RadarChart,
  SankeyChart,
  ScatterChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  VisualMapComponent,
  GraphicComponent,
  DataZoomComponent,
  CanvasRenderer,
])

export type { EChartsOption }
export type EChartsInstance = echarts.ECharts

export interface ChartClickInfo {
  name: string
  dataIndex: number
  data: unknown
  seriesType?: string
  componentType?: string
  /**
   * sankey / graph nodes deliver the node object here
   */
  eventData?: Record<string, unknown>
}

/**
 * Hand-rolled ECharts binding with lazy init:
 * the chart container is usually conditionally rendered (after data loads),
 * so the instance is created on the first non-null option, kept in a ref,
 * auto-resized via ResizeObserver and disposed on unmount.
 *
 * Returns [containerRef, chartRef] — chartRef lets pages call
 * setOption/dispatchAction (e.g. toggling grid3D autoRotate).
 */
export function useChart(
  option: EChartsOption | null,
  onClick?: (info: ChartClickInfo) => void,
  /** change to force a full dispose + re-init (e.g. 3D camera reset) */
  resetKey: unknown = null,
  /** runtime init/setOption failures (e.g. WebGL context dead) — lets pages fall back to 2D */
  onError?: (err: unknown) => void
) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)
  const observerRef = useRef<ResizeObserver | null>(null)
  const onClickRef = useRef(onClick)
  onClickRef.current = onClick
  const onErrorRef = useRef(onError)
  onErrorRef.current = onError

  /* dispose on unmount */
  useEffect(
    () => () => {
      observerRef.current?.disconnect()
      observerRef.current = null
      chartRef.current?.dispose()
      chartRef.current = null
    },
    []
  )

  /* force re-init when resetKey changes */
  useEffect(() => {
    if (resetKey === null) return
    observerRef.current?.disconnect()
    observerRef.current = null
    chartRef.current?.dispose()
    chartRef.current = null
    /* the option effect below runs after this and re-creates the chart */
  }, [resetKey])

  /* lazy init + setOption whenever the option changes */
  useEffect(() => {
    if (!option) return
    const el = containerRef.current
    if (!el) return

    /* stale instance whose container was swapped (e.g. product switch
       re-rendered the page branch): drop it and re-init on the new el */
    if (chartRef.current && chartRef.current.getDom()?.isConnected === false) {
      observerRef.current?.disconnect()
      observerRef.current = null
      chartRef.current.dispose()
      chartRef.current = null
    }

    if (!chartRef.current) {
      let chart: echarts.ECharts
      try {
        chart = echarts.init(el)
      } catch (err) {
        console.warn('[r2p] chart init failed', err)
        onErrorRef.current?.(err)
        return
      }
      chartRef.current = chart
      chart.on('click', (params: Record<string, unknown>) => {
        onClickRef.current?.({
          name: String(params.name ?? ''),
          dataIndex: Number(params.dataIndex ?? -1),
          data: params.data,
          seriesType: params.seriesType as string | undefined,
          componentType: params.componentType as string | undefined,
          eventData: params,
        })
      })
      const observer = new ResizeObserver(() => chart.resize())
      observer.observe(el)
      observerRef.current = observer
    }

    try {
      chartRef.current.setOption(option, true)
    } catch (err) {
      /* e.g. scatter3D on a GPU whose context died mid-session */
      console.warn('[r2p] chart setOption failed', err)
      observerRef.current?.disconnect()
      observerRef.current = null
      chartRef.current.dispose()
      chartRef.current = null
      onErrorRef.current?.(err)
    }
  }, [option, resetKey])

  return [containerRef, chartRef] as const
}
