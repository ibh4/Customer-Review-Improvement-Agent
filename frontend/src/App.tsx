import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ProductProvider } from './context/ProductContext'
import { UiProvider } from './context/UiContext'
import { I18nProvider } from './i18n'
import { About } from './pages/About'
import { Evolution } from './pages/Evolution'
import { EvidenceExplorer } from './pages/EvidenceExplorer'
import { Galaxy } from './pages/Galaxy'
import { Launch } from './pages/Launch'
import { ProductMRI } from './pages/ProductMRI'

export default function App() {
  return (
    <I18nProvider>
      <ProductProvider>
        <UiProvider>
          <Layout>
            <Routes>
              <Route path="/" element={<ProductMRI />} />
              <Route path="/about" element={<About />} />
              <Route path="/galaxy" element={<Galaxy />} />
              <Route path="/evidence" element={<EvidenceExplorer />} />
              <Route path="/evolution" element={<Evolution />} />
              <Route path="/launch" element={<Launch />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </UiProvider>
      </ProductProvider>
    </I18nProvider>
  )
}
