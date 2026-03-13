import './App.css';
import { DashboardProvider } from './context/DashboardContext';
import { Header } from './components/Header';
import { TargetBar } from './components/TargetBar';
import { StageSpine } from './components/StageSpine';
import { EventFeed } from './components/EventFeed';
import { RunHistory } from './components/RunHistory';
import { CostBreakdown } from './components/CostBreakdown';

function App() {
  return (
    <DashboardProvider>
      <div className="app">
        <Header />
        <TargetBar />
        <div className="main">
          <div className="sidebar">
            <RunHistory />
            <CostBreakdown />
          </div>
          <div className="content">
            <StageSpine />
            <EventFeed />
          </div>
        </div>
      </div>
    </DashboardProvider>
  );
}

export default App;
