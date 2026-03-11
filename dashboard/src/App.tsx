import { DashboardProvider } from './context/DashboardContext';
import { Header } from './components/Header';
import { CompliancePanel } from './components/CompliancePanel';
import { RunHistory } from './components/RunHistory';
import { RunDetail } from './components/RunDetail';
import './App.css';

export default function App() {
  return (
    <DashboardProvider>
      <div className="app">
        <Header />
        <div className="panels">
          <CompliancePanel />
          <RunHistory />
          <RunDetail />
        </div>
      </div>
    </DashboardProvider>
  );
}
