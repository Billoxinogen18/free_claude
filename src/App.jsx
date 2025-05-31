// src/App.jsx
import React, { useState, useEffect, useRef } from 'react';
import './index.css';

const generateId = () => '_' + Math.random().toString(36).substr(2, 9);

// Corrected model groups - based on your originally provided Puter.js docs & recent additions
const modelGroups = [
  {
    label: "Claude",
    models: [
      { value: 'claude-sonnet-4', label: 'Claude Sonnet 4' },
      { value: 'claude-opus-4', label: 'Claude Opus 4' },
      { value: 'claude-3-5-sonnet', label: 'Claude 3.5 Sonnet' },
    ]
  },
  {
    label: "OpenAI",
    models: [
      { value: 'gpt-4o', label: 'GPT-4o' },
      { value: 'gpt-4o-mini', label: 'GPT-4o Mini'},
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
      { value: 'x-ai/grok-3-beta', label: 'Grok 3 Beta' }, // Using documented name
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
  const headerRef = useRef(null);
  const footerRef = useRef(null);


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
    if (chatEndRef.current && !showScrollToBottom) {
        chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isAiThinking, showScrollToBottom]);

  useEffect(() => {
    const updateCssVariables = () => {
      if (headerRef.current) {
        const headerHeight = headerRef.current.offsetHeight;
        document.documentElement.style.setProperty('--header-height', `${headerHeight}px`);
      }
      if (footerRef.current) {
        const footerHeight = footerRef.current.offsetHeight;
        document.documentElement.style.setProperty('--footer-height', `${footerHeight}px`);
      }
    };

    updateCssVariables(); // Initial call

    const resizeObserver = new ResizeObserver(updateCssVariables);
    const currentHeaderRef = headerRef.current;
    const currentFooterRef = footerRef.current;

    if(currentHeaderRef) resizeObserver.observe(currentHeaderRef);
    if(currentFooterRef) resizeObserver.observe(currentFooterRef);

    return () => {
        if(currentHeaderRef) resizeObserver.unobserve(currentHeaderRef);
        if(currentFooterRef) resizeObserver.unobserve(currentFooterRef);
    }
  }, [isDarkMode, headerRef, footerRef]); // Dependencies that might affect height

  const handleChatScroll = () => {
    if (chatAreaRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatAreaRef.current;
      const threshold = clientHeight / 2; 
      setShowScrollToBottom(scrollHeight - scrollTop - clientHeight > threshold);
    }
  };

  useEffect(() => {
    const chatAreaCurrent = chatAreaRef.current;
    chatAreaCurrent?.addEventListener('scroll', handleChatScroll);
    return () => chatAreaCurrent?.removeEventListener('scroll', handleChatScroll);
  }, []);

  const toggleTheme = () => setIsDarkMode(prev => !prev);

  // Your updated handleSendMessage (streaming)
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
      const responseStream = await puter.ai.chat(promptForAi, { 
        model: selectedModel, 
        stream: true 
      });
      
      setIsAiThinking(false); 

      let fullResponse = '';
      let buffer = '';
      const RENDER_INTERVAL = 30; 
      let lastRenderTime = 0;

      for await (const part of responseStream) {
        const textContent = part?.text || part?.content || ''; // From your snippet
        buffer += textContent;
        
        const currentTime = Date.now();
        if (buffer && (currentTime - lastRenderTime > RENDER_INTERVAL || textContent.includes('\n'))) {
          fullResponse += buffer;
          buffer = '';
          setMessages(prev => prev.map(msg => 
            msg.id === aiMessageId 
              ? { ...msg, text: fullResponse, streaming: true } 
              : msg
          ));
          lastRenderTime = currentTime;
        }
      }
      
      if (buffer) {
        fullResponse += buffer;
        setMessages(prev => prev.map(msg => 
          msg.id === aiMessageId 
            ? { ...msg, text: fullResponse, streaming: true } 
            : msg
        ));
      }
      
      setMessages(prev => prev.map(msg => 
        msg.id === aiMessageId 
          ? { ...msg, streaming: false } 
          : msg
      ));

    } catch (error) {
      console.error(`Error with model ${selectedModel}:`, error); // Log the actual error object
      setIsAiThinking(false);
      
      let errorMessage = `Error with ${selectedModel}: `;
      if (error && error.message) { // Check if error and error.message exist
        errorMessage += error.message;
      } else if (typeof error === 'string') {
        errorMessage += error;
      } else {
        errorMessage += 'Unknown error occurred. Check console for details.';
      }
      
      if (error && (String(error.message).includes('undefined') || String(error.message).includes('not found') || String(error.message).includes('400'))) {
        errorMessage += ' This model might be unavailable, misconfigured, or the request was malformed. Try a different model like gpt-4o-mini or claude-3.5-sonnet.';
      }
      
      setMessages(prev => prev.map(msg => 
        msg.id === aiMessageId 
          ? { ...msg, text: errorMessage, streaming: false, error: true } 
          : msg
      ));
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCopyText = (text) => {
    navigator.clipboard.writeText(text).catch(err => console.error("Failed to copy text: ", err));
  };

  const autoResizeTextarea = () => {
    if (textareaRef.current) {
      const maxHeight = 150; 
      textareaRef.current.style.height = 'auto'; 
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
      textareaRef.current.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
    }
  };
  
  useEffect(autoResizeTextarea, [currentPrompt]);

  const clearChat = () => setMessages([]);
  
  const scrollToBottom = () => {
     chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
     setShowScrollToBottom(false); 
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
      <header className="app-header" ref={headerRef}>
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

      <main className="chat-area" ref={chatAreaRef}>
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
        {showScrollToBottom && (
          <button 
            onClick={scrollToBottom} 
            className={`scroll-to-bottom-button neumorphic-element ${showScrollToBottom ? 'visible' : ''}`} 
            aria-label="Scroll to bottom"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 17.27L18.18 11.09L16.77 9.68L12 14.45L7.23 9.68L5.82 11.09L12 17.27ZM12 4C11.74 4 11.5 4.1 11.32 4.23L3.5 9.87C3.18 10.09 3 10.47 3 10.87V11C3 11.55 3.45 12 4 12H20C20.55 12 21 11.55 21 11V10.87C21 10.47 20.82 10.09 20.5 9.87L12.68 4.23C12.5 4.1 12.26 4 12 4Z"/></svg>
          </button>
        )}
      </main>

      <footer className="chat-input-area glassmorphic-element" ref={footerRef}>
        <form onSubmit={handleSendMessage} className="input-form">
          <textarea
            ref={textareaRef} 
            className="chat-input" 
            value={currentPrompt}
            onChange={(e) => setCurrentPrompt(e.target.value) } // autoResizeTextarea is called by useEffect on currentPrompt change
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