// src/App.jsx
import React, { useState, useEffect, useRef } from 'react';
import './index.css';

const generateId = () => '_' + Math.random().toString(36).substr(2, 9);

const modelGroups = [
  {
    label: "Claude",
    models: [
      { value: 'claude-sonnet-4', label: 'Claude Sonnet 4' },
      { value: 'claude-opus-4', label: 'Claude Opus 4' },
    ]
  },
  {
    label: "OpenAI", // From "Free, Unlimited OpenAI API" Puter.js Docs
    models: [
      { value: 'gpt-4o', label: 'GPT-4o' },
      { value: 'gpt-4.1', label: 'GPT-4.1' },
      { value: 'o1-mini', label: 'OpenAI o1-mini' },
      { value: 'o3-mini', label: 'OpenAI o3-mini' },
      { value: 'gpt-4.5-preview', label: 'GPT-4.5 Preview' },
      { value: 'o1', label: 'OpenAI o1' },
      { value: 'o4-mini', label: 'OpenAI o4-mini' }
    ]
  },
  {
    label: "Grok", // From "Free, Unlimited Grok API" Puter.js Docs
    models: [
      { value: 'x-ai/grok-3-beta', label: 'Grok 3 Beta' },
    ]
  },
  {
    label: "Gemini", // From "Free Gemini API" Puter.js Docs
    models: [
      { value: 'google/gemini-2.5-pro-exp-03-25:free', label: 'Gemini 2.5 Pro' },
      { value: 'google/gemini-2.0-flash-lite-001', label: 'Gemini 2.0 Flash Lite' },
      { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
      { value: 'google/gemini-pro', label: 'Gemini Pro'},
      { value: 'google/gemini-flash-1.5-8b', label: 'Gemini Flash 1.5 8B'}
    ]
  }
];

function App() {
  const [puter, setPuter] = useState(null);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState(modelGroups[0].models[0].value);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false); 
  const [isAiThinking, setIsAiThinking] = useState(false); 
  const [isDarkMode, setIsDarkMode] = useState(false);
  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem('cool-chat-theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme) {
      setIsDarkMode(savedTheme === 'dark');
    } else {
      setIsDarkMode(prefersDark);
    }
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
      document.body.classList.remove('light-mode');
      localStorage.setItem('cool-chat-theme', 'dark');
    } else {
      document.body.classList.add('light-mode');
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
  }, [messages, isAiThinking]);

  const toggleTheme = () => {
    setIsDarkMode(prevMode => !prevMode);
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault(); 
    if (!puter || !currentPrompt.trim() || isLoading || isAiThinking) return;

    const userMessage = { id: generateId(), text: currentPrompt, sender: 'user', timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    const promptForAi = currentPrompt;
    setCurrentPrompt('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'; 
    }
    setIsLoading(true);
    setIsAiThinking(true);

    const aiMessageId = generateId();
    setMessages(prev => [...prev, { id: aiMessageId, text: '', sender: 'ai', streaming: true, modelUsed: selectedModel, timestamp: new Date() }]);
    
    try {
      const responseStream = await puter.ai.chat(
        promptForAi,
        { model: selectedModel, stream: true }
      );
      setIsAiThinking(false); 

      let fullResponse = '';
      for await (const part of responseStream) {
        const chunk = part?.text || '';
        fullResponse += chunk;
        setMessages(prev =>
          prev.map(msg =>
            msg.id === aiMessageId ? { ...msg, text: fullResponse, streaming: true } : msg
          )
        );
      }
      setMessages(prev =>
        prev.map(msg =>
          msg.id === aiMessageId ? { ...msg, streaming: false } : msg
        )
      );

    } catch (error) {
      console.error(`Error with model ${selectedModel}:`, error);
      setIsAiThinking(false);
      setMessages(prev =>
        prev.map(msg =>
          msg.id === aiMessageId ? { ...msg, text: `Oops! Model ${selectedModel} had an issue. ${error.message}`, streaming: false, error: true } : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCopyText = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      // Optional: Show a temporary "Copied!" message
    }).catch(err => console.error("Failed to copy text: ", err));
  };

  const autoResizeTextarea = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = (textareaRef.current.scrollHeight) + 'px';
    }
  };

  if (!puter && !isLoading && !isAiThinking) {
    return (
      <div className="initial-loading-container">
        <div className="spinner"></div>
        <p>Initializing Cool Chat...</p>
      </div>
    );
  }

  return (
    <div className="app-container cool-chat-theme">
      <header className="app-header">
        <div className="header-title-area">
            <h1>Cool Chat</h1>
        </div>
        <div className="header-controls-area">
            <div className="model-selector-wrapper"> {/* Wrapper for better layout control if needed */}
                <div className="model-selector-container glassmorphic-element">
                <select
                    className="neumorphic-select" /* Style the select appearance */
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    disabled={isLoading || isAiThinking}
                    aria-label="Select AI Model"
                >
                    {modelGroups.map(group => (
                    <optgroup label={group.label} key={group.label}>
                        {group.models.map(model => (
                        <option value={model.value} key={model.value}>
                            {model.label}
                        </option>
                        ))}
                    </optgroup>
                    ))}
                </select>
                </div>
            </div>
            <button onClick={toggleTheme} className="theme-toggle-button neumorphic-element" aria-label="Toggle theme">
                {isDarkMode ? '☀️' : '🌙'}
            </button>
        </div>
      </header>

      <main className="chat-area">
        <div className="message-list">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`message-wrapper ${msg.sender === 'user' ? 'user-wrapper' : 'ai-wrapper'}`}
            >
              <div
                className={`message-bubble ${msg.sender === 'user' ? 'user-message' : 'ai-message'} ${msg.error ? 'error-message' : ''}`}
              >
                <p>{msg.text}
                  {msg.streaming && !msg.text && !isAiThinking && <span className="thinking-dots"><span>.</span><span>.</span><span>.</span></span>}
                  {msg.streaming && msg.text && <span className="streaming-cursor"></span>}
                </p>
                {msg.sender === 'ai' && !msg.streaming && !msg.error && msg.text && (
                  <button className="copy-button neumorphic-element" onClick={() => handleCopyText(msg.text)} aria-label="Copy message">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                  </button>
                )}
              </div>
            </div>
          ))}
          {isAiThinking && (
            <div className="message-wrapper ai-wrapper">
              <div className="message-bubble ai-message thinking-message">
                <div className="pulsing-loader">
                  <div></div><div></div><div></div>
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </main>

      <footer className="chat-input-area glassmorphic-element">
        <form onSubmit={handleSendMessage} className="input-form">
          <textarea
            ref={textareaRef}
            className="chat-input" // This will be styled for glassmorphic container
            value={currentPrompt}
            onChange={(e) => {
                setCurrentPrompt(e.target.value);
                autoResizeTextarea();
            }}
            placeholder="Message Cool Chat..."
            rows="1"
            disabled={isLoading || isAiThinking}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !isLoading && !isAiThinking) {
                e.preventDefault(); 
                handleSendMessage(); 
              }
            }}
            onFocus={autoResizeTextarea}
          />
          <button
            type="submit"
            className="send-button neumorphic-element"
            disabled={isLoading || isAiThinking || !currentPrompt.trim()}
            aria-label="Send message"
          >
            {isLoading || isAiThinking ? ( // Show typing indicator if loading OR AI is thinking
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