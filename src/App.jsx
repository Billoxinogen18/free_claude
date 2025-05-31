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
    label: "OpenAI",
    models: [
      { value: 'gpt-4o', label: 'GPT-4o' },
      { value: 'gpt-4.1', label: 'GPT-4.1' },
      { value: 'gpt-4.5-preview', label: 'GPT-4.5 Preview' },
      { value: 'o1', label: 'OpenAI o1' },
      { value: 'o1-mini', label: 'OpenAI o1-mini' },
      { value: 'o3-mini', label: 'OpenAI o3-mini' },
      { value: 'o4-mini', label: 'OpenAI o4-mini' }
    ]
  },
  {
    label: "Grok",
    models: [
      { value: 'x-ai/grok-3-beta', label: 'Grok 3 Beta' },
    ]
  },
  {
    label: "Gemini",
    models: [
      { value: 'google/gemini-2.5-pro-exp-03-25:free', label: 'Gemini 2.5 Pro' },
      { value: 'google/gemini-pro', label: 'Gemini Pro'},
      { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
      { value: 'google/gemini-flash-1.5-8b', label: 'Gemini Flash 1.5 8B'},
      { value: 'google/gemini-2.0-flash-lite-001', label: 'Gemini 2.0 Flash Lite' },
    ]
  }
];

const SimpleMarkdown = ({ text }) => {
  if (!text) return null;
  const html = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>');
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
};

function App() {
  const [puter, setPuter] = useState(null);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState(modelGroups[0].models[0].value);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false); 
  const [isAiThinking, setIsAiThinking] = useState(false); 
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);
  const chatAreaRef = useRef(null);
  const headerRef = useRef(null); // Ref for the header

  useEffect(() => {
    const savedTheme = localStorage.getItem('cool-chat-theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme) setIsDarkMode(savedTheme === 'dark');
    else setIsDarkMode(prefersDark);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('dark-mode', isDarkMode);
    document.body.classList.toggle('light-mode', !isDarkMode);
    localStorage.setItem('cool-chat-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  useEffect(() => {
    if (window.puter) setPuter(window.puter);
    else {
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
    if (chatEndRef.current && !showScrollToBottom) { // Only auto-scroll if user hasn't scrolled up
        chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isAiThinking, showScrollToBottom]); // Add showScrollToBottom to dependencies

  useEffect(() => {
    // Update --header-height CSS variable when headerRef is available or dark mode changes
    if (headerRef.current) {
      const headerHeight = headerRef.current.offsetHeight;
      document.documentElement.style.setProperty('--header-height', `${headerHeight}px`);
    }
    // Add a ResizeObserver to update header height on window resize if header content can wrap
    const resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
            if (entry.target === headerRef.current) {
                 const headerHeight = entry.contentRect.height;
                 document.documentElement.style.setProperty('--header-height', `${headerHeight}px`);
            }
        }
    });
    if(headerRef.current) {
        resizeObserver.observe(headerRef.current);
    }
    return () => {
        if(headerRef.current) {
            resizeObserver.unobserve(headerRef.current);
        }
    }

  }, [isDarkMode, headerRef.current]); // Rerun when dark mode changes or headerRef itself changes

  const handleChatScroll = () => {
    if (chatAreaRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatAreaRef.current;
      const threshold = clientHeight / 2; // Show button if scrolled up more than half a viewport
      setShowScrollToBottom(scrollHeight - scrollTop - clientHeight > threshold);
    }
  };

  useEffect(() => {
    const chatAreaCurrent = chatAreaRef.current;
    chatAreaCurrent?.addEventListener('scroll', handleChatScroll);
    return () => chatAreaCurrent?.removeEventListener('scroll', handleChatScroll);
  }, []);

  const toggleTheme = () => setIsDarkMode(prev => !prev);

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault(); 
    if (!puter || !currentPrompt.trim() || isLoading || isAiThinking) return;

    const userMessage = { id: generateId(), text: currentPrompt, sender: 'user', timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    const promptForAi = currentPrompt;
    setCurrentPrompt('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto'; 
    
    setIsLoading(true);
    setIsAiThinking(true);

    const aiMessageId = generateId();
    setMessages(prev => [...prev, { id: aiMessageId, text: '', sender: 'ai', streaming: true, modelUsed: selectedModel, timestamp: new Date() }]);
    
    try {
      const responseStream = await puter.ai.chat(promptForAi, { model: selectedModel, stream: true });
      setIsAiThinking(false); 

      let fullResponse = '';
      let buffer = '';
      const RENDER_INTERVAL = 30; 
      let lastRenderTime = 0;

      for await (const part of responseStream) {
        buffer += part?.text || '';
        const currentTime = Date.now();
        // Render if buffer has content and interval passed, or if it's a newline (for faster paragraph breaks)
        if (buffer && (currentTime - lastRenderTime > RENDER_INTERVAL || (part?.text || '').includes('\n'))) {
          fullResponse += buffer;
          buffer = '';
          setMessages(prev => prev.map(msg => msg.id === aiMessageId ? { ...msg, text: fullResponse, streaming: true } : msg));
          lastRenderTime = currentTime;
        }
      }
      if (buffer) { // Append any remaining buffer content
        fullResponse += buffer;
        setMessages(prev => prev.map(msg => msg.id === aiMessageId ? { ...msg, text: fullResponse, streaming: true } : msg));
      }
      
      setMessages(prev => prev.map(msg => msg.id === aiMessageId ? { ...msg, streaming: false } : msg));

    } catch (error) {
      console.error(`Error with model ${selectedModel}:`, error);
      setIsAiThinking(false);
      setMessages(prev => prev.map(msg => msg.id === aiMessageId ? { ...msg, text: `Error with ${selectedModel}: ${error.message}`, streaming: false, error: true } : msg));
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCopyText = (text) => {
    navigator.clipboard.writeText(text).catch(err => console.error("Failed to copy text: ", err));
  };

  const autoResizeTextarea = () => {
    if (textareaRef.current) {
      const maxHeight = 150; // Max height in pixels, should match CSS
      textareaRef.current.style.height = 'auto'; // Temporarily shrink to get scrollHeight
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
      textareaRef.current.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
    }
  };
  
  useEffect(autoResizeTextarea, [currentPrompt]); // Auto-resize when prompt changes

  const clearChat = () => setMessages([]);
  
  const scrollToBottom = () => {
     chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
     setShowScrollToBottom(false); // Hide button after clicking
  };

  if (!puter && !isLoading && !isAiThinking) {
    return (
      <div className="initial-loading-container">
        <div className="spinner"></div><p>Initializing Cool Chat...</p>
      </div>
    );
  }

  return (
    <div className="app-container cool-chat-theme">
      <header className="app-header" ref={headerRef}> {/* Added ref={headerRef} here */}
        <div className="header-title-area"><h1>Cool Chat</h1></div>
        <div className="header-controls-area">
          <div className="model-selector-wrapper">
            <div className="model-selector-container glassmorphic-element">
              <select 
                className="neumorphic-select" 
                value={selectedModel} 
                onChange={(e) => setSelectedModel(e.target.value)} 
                disabled={isLoading || isAiThinking} 
                aria-label="Select AI Model"
              >
                {modelGroups.map(group => (
                  <optgroup label={group.label} key={group.label}>
                    {group.models.map(model => (
                      <option value={model.value} key={model.value}>{model.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>
          <button onClick={toggleTheme} className="theme-toggle-button neumorphic-element" aria-label="Toggle theme">
            {isDarkMode ? '☀️' : '🌙'}
          </button>
          <button 
            onClick={clearChat} 
            className="clear-chat-button neumorphic-element" 
            aria-label="Clear chat" 
            disabled={messages.length === 0 || isLoading || isAiThinking}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
          </button>
        </div>
      </header>

      <main className="chat-area" ref={chatAreaRef}> {/* Added ref={chatAreaRef} here */}
        <div className="message-list">
          {messages.map(msg => (
            <div key={msg.id} className={`message-wrapper ${msg.sender === 'user' ? 'user-wrapper' : 'ai-wrapper'}`}>
              <div className={`message-bubble ${msg.sender === 'user' ? 'user-message' : 'ai-message'} ${msg.error ? 'error-message' : ''}`}>
                <div className="message-content">
                  <SimpleMarkdown text={msg.text} />
                  {msg.streaming && !msg.text && !isAiThinking && <span className="thinking-dots"><span>.</span><span>.</span><span>.</span></span>}
                  {msg.streaming && msg.text && <span className="streaming-cursor"></span>}
                </div>
                {msg.sender === 'ai' && !msg.streaming && !msg.error && msg.text && (
                  <button className="copy-button neumorphic-element" onClick={() => handleCopyText(msg.text)} aria-label="Copy message">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                  </button>
                )}
                 <span className="message-timestamp">{new Date(msg.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
              </div>
            </div>
          ))}
          {isAiThinking && (
            <div className="message-wrapper ai-wrapper">
              <div className="message-bubble ai-message thinking-message">
                <div className="aurora-loader"><div></div><div></div><div></div><div></div></div>
                <span>AI is thinking...</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
        {showScrollToBottom && ( // Scroll to bottom button JSX
          <button 
            onClick={scrollToBottom} 
            className={`scroll-to-bottom-button neumorphic-element ${showScrollToBottom ? 'visible' : ''}`} 
            aria-label="Scroll to bottom"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
          </button>
        )}
      </main>

      <footer className="chat-input-area glassmorphic-element">
        <form onSubmit={handleSendMessage} className="input-form">
          <textarea
            ref={textareaRef} 
            className="chat-input" 
            value={currentPrompt}
            onChange={(e) => { setCurrentPrompt(e.target.value); /* autoResizeTextarea() called in useEffect */; }}
            placeholder="Message Cool Chat..." 
            rows="1" 
            disabled={isLoading || isAiThinking}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !isLoading && !isAiThinking) { e.preventDefault(); handleSendMessage(); }}}
          />
          <button 
            type="submit" 
            className="send-button neumorphic-element" 
            disabled={isLoading || isAiThinking || !currentPrompt.trim()} 
            aria-label="Send message"
          >
            {isLoading || isAiThinking ? (<div className="typing-indicator"><span></span><span></span><span></span></div>) : (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24px" height="24px" fill="currentColor"><path d="M3.40039 20.5996L20.9996 12.9996L3.40039 5.39961L3.40039 10.9996L14.4004 12.9996L3.40039 14.9996L3.40039 20.5996Z"/></svg>)}
          </button>
        </form>
      </footer>
    </div>
  );
}

export default App;