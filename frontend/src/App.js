import React, { useEffect, useState } from 'react';
import './App.css';

function App() {
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Fetch from backend
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setMessage(data.message))
      .catch((err) => console.error(err));
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>WhatsApp Clone</h1>
        <p>Built with MERN Stack</p>
        <p>Backend Status: {message || 'Loading...'}</p>
      </header>
    </div>
  );
}

export default App;
