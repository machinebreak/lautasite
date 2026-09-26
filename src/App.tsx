import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { BioApp } from '@/BioApp'
import { MinimalProjects } from '@/pages/MinimalProjects'
import { MinimalExperience } from '@/pages/MinimalExperience'
import { MinimalContact } from '@/pages/MinimalContact'
import { MinimalWriting } from '@/pages/MinimalWriting'
import { MinimalPhotos } from '@/pages/MinimalPhotos'
import { Studio } from '@/pages/Studio'
import { PostPage } from '@/pages/PostPage'

const SpacePage = lazy(() => import('./SpacePage'))

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/space"
          element={
            <Suspense fallback={null}>
              <SpacePage />
            </Suspense>
          }
        />
        <Route path="/projects" element={<BioApp page={<MinimalProjects />} />} />
        <Route path="/experience" element={<BioApp page={<MinimalExperience />} />} />
        <Route path="/contact" element={<BioApp page={<MinimalContact />} />} />
        <Route path="/writing" element={<BioApp page={<MinimalWriting />} />} />
        <Route path="/writing/:slug" element={<BioApp page={<PostPage />} />} />
        <Route path="/photos" element={<BioApp page={<MinimalPhotos />} />} />
        <Route path="/studio" element={<BioApp page={<Studio />} />} />
        <Route path="*" element={<BioApp />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
