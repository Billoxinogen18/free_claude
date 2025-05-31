// src/App.jsx
import React, { useState, useEffect, useRef } from 'react';
import './index.css'; // Styles will be significantly updated

const generateId = () => '_' + Math.random().toString(36).substr(2, 9);

function App() {
  const [puter, setPuter] = useState(null);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [chatModel, setChatModel] = useState('claude-sonnet-4');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false); // State for dark mode
  const chatEndRef = useRef(null);

  // Load theme preference from local storage or default to system preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('cool-chat-theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme) {
      setIsDarkMode(savedTheme === 'dark');
    } else {
      setIsDarkMode(prefersDark);
    }
  }, []);

  // Apply theme to body and save preference
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('cool-chat-theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('cool-chat-theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
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

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const toggleTheme = () => {
    setIsDarkMode(prevMode => !prevMode);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!puter || !currentPrompt.trim() || isLoading) return;

    const userMessage = { id: generateId(), text: currentPrompt, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    const promptForClaude = currentPrompt; // Capture prompt before clearing
    setCurrentPrompt('');
    setIsLoading(true);

    const aiMessageId = generateId();
    setMessages(prev => [...prev, { id: aiMessageId, text: '', sender: 'ai', streaming: true }]);

    try {
      const responseStream = await puter.ai.chat(
        promptForClaude,
        { model: chatModel, stream: true }
      );

      let fullResponse = '';
      for await (const part of responseStream) {
        const chunk = part?.text || '';
        fullResponse += chunk;
        setMessages(prev =>
          prev.map(msg =>
            msg.id === aiMessageId ? { ...msg, text: fullResponse } : msg
          )
        );
      }
      setMessages(prev =>
        prev.map(msg =>
          msg.id === aiMessageId ? { ...msg, streaming: false } : msg
        )
      );

    } catch (error) {
      console.error("Error in chat response:", error);
      setMessages(prev =>
        prev.map(msg =>
          msg.id === aiMessageId ? { ...msg, text: `Error: ${error.message}`, streaming: false, error: true } : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!puter && !isLoading) {
    return (
      <div className="initial-loading-container"> {/* Removed neumorphic-card, style directly */}
        <div className="spinner"></div>
        <p>Initializing Cool Chat...</p>
      </div>
    );
  }

  return (
    <div className="app-container cool-chat-theme"> {/* Ensure this class is on the main container */}
      <button onClick={toggleTheme} className="theme-toggle-button" aria-label="Toggle theme">
        {isDarkMode ? '☀️' : '🌙'}
      </button>
      
      <header className="app-header"> {/* Removed neumorphic, class .app-header styles it */}
        <h1>Cool Chat</h1>
        <div className="model-selector-container glassmorphic-element"> {/* Applied glassmorphic */}
          <select
            className="neumorphic-select" // This class is mostly for text and internal structure now
            value={chatModel}
            onChange={(e) => setChatModel(e.target.value)}
            disabled={isLoading}
          >
            <option value="claude-sonnet-4">Claude Sonnet 4</option>
            <option value="claude-opus-4">Claude Opus 4</option>
          </select>
        </div>
      </header>

      <main className="chat-area">
        <div className="message-list">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`message-bubble ${msg.sender === 'user' ? 'user-message' : 'ai-message'} ${msg.error ? 'error-message' : ''}`}
            >
              <p>{msg.text}{msg.streaming && <span className="streaming-cursor"></span>}</p>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
      </main>

      <footer className="chat-input-area"> {/* chat-input-area will be styled as glassmorphic */}
        <form onSubmit={handleSendMessage} className="input-form">
          <textarea
            className="chat-input" // Removed neumorphic-textarea, styled by .chat-input
            value={currentPrompt}
            onChange={(e) => setCurrentPrompt(e.target.value)}
            placeholder="Message Cool Chat..."
            rows="1" // Start with 1 row, CSS will handle min/max height and growth
            disabled={isLoading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
                handleSendMessage(e);
              }
            }}
            style={{height: 'auto', overflowY: 'hidden'}} // For auto-resizing
            onInput={(e) => { // Auto-resize textarea
              e.target.style.height = 'auto';
              e.target.style.height = (e.target.scrollHeight) + 'px';
            }}
          />
          <button
            type="submit"
            className="send-button neumorphic-element" // Applied neumorphic
            disabled={isLoading || !currentPrompt.trim()}
          >
            {isLoading ? (
              <div className="typing-indicator">
                <span></span><span></span><span></span>
              </div>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24px" height="24px"><path d="M3.40039 20.5996L20.9996 12.9996L3.40039 5.39961L3.40039 10.9996L14.4004 12.9996L3.40039 14.9996L3.40039 20.5996Z"/></svg>
            )}
          </button>
        </form>
      </footer>
    </div>
  );
}

export default App;