import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { HomePage } from './pages/HomePage';
import { AutomationPage } from './pages/AutomationPage';
import { DataSciencePage } from './pages/DataSciencePage';
import { CloudPage } from './pages/CloudPage';
import { DevopsPage } from './pages/DevopsPage';
import { SmartN1Dashboard } from './pages/SmartN1Dashboard';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/automacao" element={<AutomationPage />} />
          <Route path="/ciencia-de-dados" element={<DataSciencePage />} />
          <Route path="/nuvem" element={<CloudPage />} />
          <Route path="/devops" element={<DevopsPage />} />
          <Route path="/dashboard" element={<SmartN1Dashboard />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
};

export default App;

