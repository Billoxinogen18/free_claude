import React, { useState, useEffect } from 'react';
import './index.css'; // We'll use index.css for global styles

function App() {
  const [puter, setPuter] = useState(null);
  
  // Example 1: Basic Text Generation
  const [basicPrompt, setBasicPrompt] = useState("Explain quantum computing in simple terms");
  const [basicModel, setBasicModel] = useState('claude-sonnet-4');
  const [basicResponse, setBasicResponse] = useState('');
  const [isBasicLoading, setIsBasicLoading] = useState(false);

  // Example 2: Streaming Responses
  const [streamPrompt, setStreamPrompt] = useState("Write a detailed essay on the impact of artificial intelligence on society");
  const [streamModel, setStreamModel] = useState('claude-opus-4');
  const [streamedResponse, setStreamedResponse] = useState('');
  const [isStreamingLoading, setIsStreamingLoading] = useState(false);

  // Example 3: Model Comparison (Simplified)
  const [poemPrompt, setPoemPrompt] = useState("Writen a short poem about coding");
  const [sonnetPoem, setSonnetPoem] = useState('');
  const [opusPoem, setOpusPoem] = useState('');
  const [isPoemLoading, setIsPoemLoading] = useState(false);


  useEffect(() => {
    // Ensure Puter.js is loaded
    if (window.puter) {
      setPuter(window.puter);
    } else {
      const intervalId = setInterval(() => {
        if (window.puter) {
          setPuter(window.puter);
          clearInterval(intervalId);
        }
      }, 100);
      return () => clearInterval(intervalId);
    }
  }, []);

  const handleBasicGeneration = async () => {
    if (!puter || !basicPrompt) return;
    setIsBasicLoading(true);
    setBasicResponse('');
    try {
      const response = await puter.ai.chat(basicPrompt, { model: basicModel });
      setBasicResponse(response.message.content[0].text);
    } catch (error) {
      console.error("Error in basic generation:", error);
      setBasicResponse(`Error: ${error.message}`);
    } finally {
      setIsBasicLoading(false);
    }
  };

  const handleStreamingResponse = async () => {
    if (!puter || !streamPrompt) return;
    setIsStreamingLoading(true);
    setStreamedResponse('');
    try {
      const responseStream = await puter.ai.chat(
        streamPrompt,
        { model: streamModel, stream: true }
      );

      for await (const part of responseStream) {
        setStreamedResponse(prev => prev + (part?.text || ''));
      }
    } catch (error) {
      console.error("Error in streaming response:", error);
      setStreamedResponse(prev => prev + `\nError: ${error.message}`);
    } finally {
      setIsStreamingLoading(false);
    }
  };

  const handlePoemGeneration = async () => {
    if (!puter || !poemPrompt) return;
    setIsPoemLoading(true);
    setSonnetPoem('');
    setOpusPoem('');
    try {
      // Sonnet
      const sonnetRes = await puter.ai.chat(poemPrompt, { model: 'claude-sonnet-4' });
      setSonnetPoem(sonnetRes.message.content[0].text);

      // Opus
      const opusRes = await puter.ai.chat(poemPrompt, { model: 'claude-opus-4' });
      setOpusPoem(opusRes.message.content[0].text);

    } catch (error) {
      console.error("Error generating poems:", error);
      setSonnetPoem(`Error: ${error.message}`);
      setOpusPoem(`Error: ${error.message}`);
    } finally {
      setIsPoemLoading(false);
    }
  };


  if (!puter) {
    return <div className="neumorphic-card loading-indicator">Loading Puter.js and AI capabilities...</div>;
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Neumorphic Claude AI Demo with Puter.js</h1>
      </header>

      {/* Example 1: Basic Text Generation */}
      <section className="neumorphic-card">
        <h2>1. Basic Text Generation</h2>
        <textarea
          className="neumorphic-textarea"
          value={basicPrompt}
          onChange={(e) => setBasicPrompt(e.target.value)}
          placeholder="Enter your prompt here"
          rows="3"
        />
        <div className="controls">
          <div className="neumorphic-select-container">
            <select
              className="neumorphic-select"
              value={basicModel}
              onChange={(e) => setBasicModel(e.target.value)}
              disabled={isBasicLoading}
            >
              <option value="claude-sonnet-4">Claude Sonnet 4</option>
              <option value="claude-opus-4">Claude Opus 4</option>
            </select>
          </div>
          <button
            className="neumorphic-button"
            onClick={handleBasicGeneration}
            disabled={isBasicLoading || !basicPrompt.trim()}
          >
            {isBasicLoading ? 'Generating...' : 'Generate Text'}
          </button>
        </div>
        {basicResponse && (
          <div className="output-area">
            <h3>Response:</h3>
            {basicResponse}
          </div>
        )}
      </section>

      {/* Example 2: Streaming Responses */}
      <section className="neumorphic-card">
        <h2>2. Streaming Responses</h2>
        <textarea
          className="neumorphic-textarea"
          value={streamPrompt}
          onChange={(e) => setStreamPrompt(e.target.value)}
          placeholder="Enter a prompt for a longer response"
          rows="3"
        />
         <div className="controls">
            <div className="neumorphic-select-container">
                <select
                className="neumorphic-select"
                value={streamModel}
                onChange={(e) => setStreamModel(e.target.value)}
                disabled={isStreamingLoading}
                >
                <option value="claude-sonnet-4">Claude Sonnet 4</option>
                <option value="claude-opus-4">Claude Opus 4</option>
                </select>
            </div>
            <button
                className="neumorphic-button"
                onClick={handleStreamingResponse}
                disabled={isStreamingLoading || !streamPrompt.trim()}
            >
                {isStreamingLoading ? 'Streaming...' : 'Stream Response'}
            </button>
        </div>
        {(streamedResponse || isStreamingLoading) && (
          <div className="output-area">
            <h3>Streamed Response:</h3>
            {streamedResponse}
            {isStreamingLoading && !streamedResponse && <span className="loading-indicator">Initializing stream...</span>}
          </div>
        )}
      </section>

      {/* Example 3: Model Comparison */}
      <section className="neumorphic-card">
        <h2>3. Model Comparison: Poem Generation</h2>
        <textarea
          className="neumorphic-textarea"
          value={poemPrompt}
          onChange={(e) => setPoemPrompt(e.target.value)}
          placeholder="Enter prompt for a poem (e.g., 'a short poem about coding')"
          rows="2"
        />
        <div className="controls">
            <button
                className="neumorphic-button"
                onClick={handlePoemGeneration}
                disabled={isPoemLoading || !poemPrompt.trim()}
            >
                {isPoemLoading ? 'Generating Poems...' : 'Generate with Both Models'}
            </button>
        </div>
        {isPoemLoading && (!sonnetPoem && !opusPoem) && <p className="loading-indicator">Loading poems...</p>}
        {sonnetPoem && (
          <div className="output-area">
            <h3>Poem by Claude Sonnet 4:</h3>
            {sonnetPoem}
          </div>
        )}
        {opusPoem && (
          <div className="output-area" style={{marginTop: '15px'}}>
            <h3>Poem by Claude Opus 4:</h3>
            {opusPoem}
          </div>
        )}
      </section>

      <footer className="neumorphic-card" style={{textAlign: 'center', fontSize: '0.9em', marginTop: '30px'}}>
        <p>Powered by <a href="https://puter.com" target="_blank" rel="noopener noreferrer" style={{color: 'var(--primary-color)'}}>Puter.js</a> and Claude AI.</p>
        <p>Neumorphic design example.</p>
      </footer>
    </div>
  );
}

export default App;
