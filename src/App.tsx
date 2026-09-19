import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { HomePage } from './pages/HomePage';
import { RegisterPage } from './pages/RegisterPage';
import { TicketPage } from './pages/TicketPage';
import { VotePage } from './pages/VotePage';
import { JudgePage } from './pages/JudgePage';
import { AdminPage } from './pages/AdminPage';
import { PlaceholderPage } from './pages/PlaceholderPage';

export const App: React.FC = () => {
  return (
    <Router>
      <div className="min-h-screen bg-[#08080C] text-[#F4F4F6] flex flex-col justify-between selection:bg-amber-400 selection:text-black">
        <Navbar />
        <div className="grow">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/ticket" element={<TicketPage />} />
            <Route path="/vote" element={<VotePage />} />
            <Route path="/judge" element={<JudgePage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/stage" element={<PlaceholderPage />} />
            <Route path="*" element={<PlaceholderPage />} />
          </Routes>
        </div>
        <Footer />
      </div>
    </Router>
  );
};

export default App;
