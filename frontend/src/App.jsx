import React, { useState } from 'react';
import ConfigurationView from './components/ConfigurationView';
import BookingView from './components/BookingView';
import { Segmented } from 'antd';
import './App.css';

function App() {
  const [view, setView] = useState('book'); // 'book' or 'config'

  return (
    <div className="App">
      <header className="App-header">
        <h1>Appointment Scheduler</h1>
        <Segmented
          options={[
            { label: 'Book Appointment', value: 'book' },
            { label: 'Configure', value: 'config' },
          ]}
          value={view}
          onChange={setView}
        />
      </header>
      <main>
        {view === 'book' ? <BookingView /> : <ConfigurationView />}
      </main>
    </div>
  );
}

export default App;
