import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppShell } from './components/shell/AppShell'
import { OverviewPage }    from './pages/OverviewPage'
import { EscrowsPage }     from './pages/EscrowsPage'
import { EscrowDetailPage } from './pages/EscrowDetailPage'
import { CreatePage }      from './pages/CreatePage'
import { ActivityPage }    from './pages/ActivityPage'
import { DocsPage }        from './pages/DocsPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<OverviewPage />} />
          <Route path="escrows" element={<EscrowsPage />} />
          <Route path="escrows/:id" element={<EscrowDetailPage />} />
          <Route path="create" element={<CreatePage />} />
          <Route path="activity" element={<ActivityPage />} />
          <Route path="docs" element={<DocsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
