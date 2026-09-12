import { useMemo, useState } from 'react'

/**
 * ProductVisual — product imagery with honest fallbacks.
 * Priority: real product photo (downloaded from Amazon Reviews 2023 metadata,
 * embedded as base64 for the offline single-file build) → category-based SVG
 * silhouette. Never random stock photos, never broken images.
 */

/* base64-embedded product photos (src/assets/products) for file:// offline use */
const embeddedPhotos = import.meta.glob('../assets/products/*.jpg', {
  eager: true,
  query: '?inline',
  import: 'default',
}) as Record<string, string>

/** real product photo shipped with the app; caller passes the product id */
export function productImageUrl(productId: string): string {
  const embedded = embeddedPhotos[`../assets/products/${productId}.jpg`]
  if (embedded) return embedded
  /* dev server keeps serving from /public */
  return `/products/${encodeURIComponent(productId)}.jpg`
}

function categoryKind(category: string, title: string): 'bottle' | 'beauty' | 'brush' | 'package' {
  const t = `${category} ${title}`.toLowerCase()
  if (/bottle|tumbler|flask|spray|pump|dispenser/.test(t)) return 'bottle'
  if (/brush|comb|bristle/.test(t)) return 'brush'
  if (/beauty|cosmetic|cream|serum|oil|shampoo|makeup|nail|hair/.test(t)) return 'beauty'
  return 'package'
}

const BottleSilhouette = (
  <svg viewBox="0 0 120 180" className="h-full w-full" aria-hidden>
    <defs>
      <linearGradient id="pv-bottle" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#4F7CFF" stopOpacity="0.16" />
        <stop offset="100%" stopColor="#7C5CFC" stopOpacity="0.07" />
      </linearGradient>
    </defs>
    {/* pump head */}
    <rect x="46" y="10" width="28" height="10" rx="3" fill="#4F7CFF" opacity="0.55" />
    <rect x="66" y="12" width="18" height="5" rx="2.5" fill="#7C5CFC" opacity="0.6" />
    {/* neck */}
    <rect x="50" y="20" width="20" height="12" fill="#4F7CFF" opacity="0.28" />
    {/* body */}
    <rect x="34" y="32" width="52" height="130" rx="16" fill="url(#pv-bottle)" stroke="#4F7CFF" strokeOpacity="0.45" strokeWidth="1.5" />
    {/* label line */}
    <rect x="42" y="72" width="36" height="26" rx="5" fill="#FFFFFF" opacity="0.75" />
    <rect x="47" y="80" width="26" height="3" rx="1.5" fill="#4F7CFF" opacity="0.4" />
    <rect x="47" y="87" width="18" height="3" rx="1.5" fill="#7C5CFC" opacity="0.35" />
    {/* liquid level */}
    <rect x="34" y="118" width="52" height="44" rx="16" fill="#19B5D1" opacity="0.08" />
  </svg>
)

const BeautySilhouette = (
  <svg viewBox="0 0 120 180" className="h-full w-full" aria-hidden>
    <defs>
      <linearGradient id="pv-beauty" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#EF6A9A" stopOpacity="0.15" />
        <stop offset="100%" stopColor="#7C5CFC" stopOpacity="0.07" />
      </linearGradient>
    </defs>
    {/* cap */}
    <rect x="38" y="26" width="44" height="22" rx="7" fill="#EF6A9A" opacity="0.4" />
    {/* jar */}
    <rect x="28" y="50" width="64" height="104" rx="18" fill="url(#pv-beauty)" stroke="#EF6A9A" strokeOpacity="0.4" strokeWidth="1.5" />
    <rect x="28" y="118" width="64" height="36" rx="18" fill="#EF6A9A" opacity="0.08" />
    {/* label */}
    <rect x="38" y="76" width="44" height="30" rx="6" fill="#FFFFFF" opacity="0.8" />
    <rect x="44" y="85" width="32" height="3.5" rx="1.75" fill="#EF6A9A" opacity="0.45" />
    <rect x="44" y="93" width="22" height="3.5" rx="1.75" fill="#7C5CFC" opacity="0.35" />
  </svg>
)

const BrushSilhouette = (
  <svg viewBox="0 0 120 180" className="h-full w-full" aria-hidden>
    <defs>
      <linearGradient id="pv-brush" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#FF9F43" stopOpacity="0.14" />
        <stop offset="100%" stopColor="#EF6A9A" stopOpacity="0.07" />
      </linearGradient>
    </defs>
    {/* head */}
    <rect x="24" y="24" width="72" height="52" rx="16" fill="url(#pv-brush)" stroke="#FF9F43" strokeOpacity="0.45" strokeWidth="1.5" />
    {/* bristles */}
    {Array.from({ length: 7 }).map((_, i) => (
      <line key={i} x1={34 + i * 9} y1="20" x2={34 + i * 9} y2="30" stroke="#FF9F43" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
    ))}
    {/* handle */}
    <rect x="52" y="76" width="16" height="78" rx="8" fill="#FF9F43" opacity="0.18" stroke="#FF9F43" strokeOpacity="0.3" strokeWidth="1.2" />
  </svg>
)

const PackageSilhouette = (
  <svg viewBox="0 0 120 180" className="h-full w-full" aria-hidden>
    <defs>
      <linearGradient id="pv-pkg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#19B5D1" stopOpacity="0.14" />
        <stop offset="100%" stopColor="#24B47E" stopOpacity="0.07" />
      </linearGradient>
    </defs>
    <rect x="26" y="38" width="68" height="116" rx="12" fill="url(#pv-pkg)" stroke="#19B5D1" strokeOpacity="0.4" strokeWidth="1.5" />
    <rect x="26" y="70" width="68" height="8" fill="#19B5D1" opacity="0.15" />
    <rect x="40" y="96" width="40" height="24" rx="5" fill="#FFFFFF" opacity="0.75" />
    <rect x="46" y="104" width="28" height="3" rx="1.5" fill="#19B5D1" opacity="0.4" />
    <rect x="46" y="111" width="18" height="3" rx="1.5" fill="#24B47E" opacity="0.4" />
  </svg>
)

export function ProductVisual({
  category,
  title,
  imageUrl,
  float = true,
  className = 'h-36',
  label,
}: {
  category: string
  title: string
  imageUrl?: string | null
  float?: boolean
  className?: string
  label?: string
}) {
  const kind = useMemo(() => categoryKind(category, title), [category, title])
  const silhouette =
    kind === 'bottle' ? BottleSilhouette : kind === 'beauty' ? BeautySilhouette : kind === 'brush' ? BrushSilhouette : PackageSilhouette
  /* fall back to the category silhouette when the photo fails to load */
  const [imgFailed, setImgFailed] = useState(false)

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden rounded-2xl border border-line bg-base2 ${className}`}
      style={{ background: 'radial-gradient(120% 100% at 50% 0%, #FFFFFF 0%, #F0F4FB 55%, #E9EEF7 100%)' }}
    >
      {/* subtle backdrop rings */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full border border-line/70" />
      <div className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full border border-line/60" />
      <div className={`flex h-[86%] items-center justify-center ${float ? 'product-float' : ''}`}>
        {imageUrl && !imgFailed ? (
          <img
            src={imageUrl}
            alt={title}
            className="max-h-full max-w-full object-contain drop-shadow-[0_10px_24px_rgba(20,32,60,0.14)]"
            loading="lazy"
            onError={() => setImgFailed(true)}
          />
        ) : (
          silhouette
        )}
      </div>
      {label && (
        <span className="absolute bottom-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-line bg-card/90 px-2.5 py-0.5 text-[10px] font-medium text-muted backdrop-blur">
          {label}
        </span>
      )}
    </div>
  )
}
