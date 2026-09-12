/**
 * echarts-gl lazy loader + WebGL capability detection.
 * GL is only imported when a 3D view is actually requested
 * (Product MRI / Pain Galaxy / Evolution), keeping first paint light.
 */
import type * as EChartsCore from 'echarts/core'

let glPromise: Promise<boolean> | null = null

/** Dynamically imports echarts-gl (registers scatter3D/bar3D/... globally). */
export function ensureGL(): Promise<boolean> {
  if (!glPromise) {
    /* echarts-gl ships no type declarations — runtime-only registration */
    // @ts-ignore missing declaration file for 'echarts-gl'
    glPromise = import('echarts-gl')
      .then(() => true)
      .catch((err) => {
        console.warn('[r2p] echarts-gl unavailable, falling back to 2D', err)
        return false
      })
  }
  return glPromise
}

let webglCache: boolean | null = null

/**
 * One-time WebGL capability probe.
 * Tries webgl2 → webgl → experimental-webgl, and verifies the context can
 * actually talk to the driver — some locked-down environments (RDP, VMs,
 * blocklisted GPUs) hand out a context object that fails on first use.
 */
export function webglAvailable(): boolean {
  if (webglCache !== null) return webglCache
  try {
    const canvas = document.createElement('canvas')
    const gl =
      (canvas.getContext('webgl2') as WebGLRenderingContext | null) ??
      (canvas.getContext('webgl') as WebGLRenderingContext | null) ??
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null)
    webglCache = !!gl && !!gl.getParameter(gl.VERSION)
  } catch {
    webglCache = false
  }
  return webglCache
}

/** true when the user asked the OS to reduce motion (no 3D spin/auto-rotate) */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export type { EChartsCore }
