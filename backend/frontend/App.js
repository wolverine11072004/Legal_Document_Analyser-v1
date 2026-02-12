import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
    setError(null);
  };

  const handleUpload = async (event) => {
    event.preventDefault();
    
    if (!file) {
      setError('Please select a PDF file first');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('http://localhost:8000/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setResult(response.data);
      setFile(null);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error uploading file. Make sure the backend is running.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Legal Document AI Analysis</h1>
        <p>Upload PDF documents for intelligent legal analysis</p>
      </header>

      <main className="App-main">
        <div className="upload-section">
          <form onSubmit={handleUpload}>
            <div className="file-input-wrapper">
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                disabled={loading}
              />
              <label>{file ? file.name : 'Choose PDF file...'}</label>
            </div>

            <button 
              type="submit" 
              disabled={loading || !file}
              className="upload-btn"
            >
              {loading ? 'Analyzing...' : 'Upload & Analyze'}
            </button>
          </form>

          {error && (
            <div className="error-message">
              <p>❌ {error}</p>
            </div>
          )}
        </div>

        {result && (
          <div className="result-section">
            <h2>Analysis Results</h2>
            
            <div className="result-card">
              <h3>Document: {result.filename}</h3>
              
              <div className="result-item">
                <h4>Summary</h4>
                <p>{result.summary}</p>
              </div>

              <div className="result-item">
                <h4>Risk Level</h4>
                <div className={`risk-badge risk-${result.risk_level.toLowerCase()}`}>
                  {result.risk_level}
                </div>
              </div>

              <div className="result-item">
                <h4>Named Entities Detected</h4>
                {result.entities && result.entities.length > 0 ? (
                  <ul className="entities-list">
                    {result.entities.map((entity, index) => (
                      <li key={index}>
                        <span className="entity-text">{entity.text}</span>
                        <span className="entity-label">{entity.label}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No entities detected</p>
                )}
              </div>

              <button 
                onClick={() => setResult(null)}
                className="clear-btn"
              >
                Analyze Another Document
              </button>
            </div>
          </div>
        )}

        {!result && !error && (
          <div className="info-section">
            <h3>How it works:</h3>
            <ol>
              <li>Upload a PDF document</li>
              <li>AI generates an intelligent summary</li>
              <li>Extract named entities (people, organizations, locations)</li>
              <li>Calculate risk level based on legal keywords</li>
              <li>View detailed analysis results</li>
            </ol>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
