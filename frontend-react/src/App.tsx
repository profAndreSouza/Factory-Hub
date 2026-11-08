import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { HomePage } from './pages/HomePage';
import { AutomationPage } from './pages/AutomationPage';
import { DataSciencePage } from './pages/DataSciencePage';
import { CloudPage } from './pages/CloudPage';
import { DevopsPage } from './pages/DevopsPage';
import { SmartN1Dashboard } from './pages/SmartN1Dashboard';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100 font-sans selection:bg-sky-500 selection:text-white">
        <Navbar />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto p-6 md:p-8">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/automacao" element={<AutomationPage />} />
              <Route path="/ciencia-de-dados" element={<DataSciencePage />} />
              <Route path="/nuvem" element={<CloudPage />} />
              <Route path="/devops" element={<DevopsPage />} />
              <Route path="/fabrica" element={<SmartN1Dashboard />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
};

export default App;

