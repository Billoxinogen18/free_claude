// src/App.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import './index.css'; // Ensure this is imported

const generateId = () => '_' + Math.random().toString(36).substr(2, 9);

// Updated model groups based on prompt.md (AI/chat.md)
const modelGroups = [
  {
    label: "OpenAI",
    models: [
      { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Default)' },
      { value: 'gpt-4o', label: 'GPT-4o' },
      { value: 'o1', label: 'OpenAI o1' },
      { value: 'o1-mini', label: 'OpenAI o1-mini' },
      { value: 'o1-pro', label: 'OpenAI o1-pro' },
      { value: 'o3', label: 'OpenAI o3' },
      { value: 'o3-mini', label: 'OpenAI o3-mini' },
      { value: 'o4-mini', label: 'OpenAI o4-mini' },
      { value: 'gpt-4.1', label: 'GPT-4.1' },
      { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
      { value: 'gpt-4.1-nano', label: 'GPT-4.1 Nano' },
      { value: 'gpt-4.5-preview', label: 'GPT-4.5 Preview' },
    ]
  },
  {
    label: "Anthropic",
    models: [
      { value: 'claude-sonnet-4', label: 'Claude Sonnet 4' },
      { value: 'claude-opus-4', label: 'Claude Opus 4' },
      { value: 'claude-3-7-sonnet', label: 'Claude 3.7 Sonnet' },
      { value: 'claude-3-5-sonnet', label: 'Claude 3.5 Sonnet' },
    ]
  },
  {
    label: "DeepSeek",
    models: [
      { value: 'deepseek-chat', label: 'DeepSeek Chat' },
      { value: 'deepseek-reasoner', label: 'DeepSeek Reasoner' },
    ]
  },
  {
    label: "Google",
    models: [
      { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
      { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
      { value: 'google/gemma-2-27b-it', label: 'Gemma 2 27B IT (Groq)' },
    ]
  },
  {
    label: "Meta",
    models: [
      { value: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo', label: 'Llama 3.1 8B Turbo' },
      { value: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo', label: 'Llama 3.1 70B Turbo' },
      { value: 'meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo', label: 'Llama 3.1 405B Turbo' },
    ]
  },
  {
    label: "Mistral",
    models: [
      { value: 'mistral-large-latest', label: 'Mistral Large' },
      { value: 'pixtral-large-latest', label: 'Pixtral Large' },
      { value: 'codestral-latest', label: 'Codestral' },
    ]
  },
  {
    label: "xAI",
    models: [
      { value: 'grok-beta', label: 'Grok Beta' },
    ]
  }
];


const SimpleMarkdown = ({ text }) => {
  if (!text) return null;
  const html = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/```([\s\S]*?)```/g, (match, code) => {
        const language = code.startsWith('\n') ? '' : code.split('\n')[0]; // very basic lang detection
        const actualCode = language ? code.substring(language.length +1) : code;
        return `<pre><code class="language-${language.trim() || 'plaintext'}">${actualCode.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`;
    })
    .replace(/\n/g, '<br />');
  return <span className="message-content-html" dangerouslySetInnerHTML={{ __html: html }} />;
};

function App() {
  const [puter, setPuter] = useState(null);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [imageInputUrl, setImageInputUrl] = useState('');
  const [selectedModel, setSelectedModel] = useState(modelGroups[0].models[0].value);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showToolsPanel, setShowToolsPanel] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [userSpace, setUserSpace] = useState(null);
  const [kvKey, setKvKey] = useState('');
  const [kvValue, setKvValue] = useState('');
  const [kvResult, setKvResult] = useState('');


  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);
  const chatAreaRef = useRef(null);
  const headerRef = useRef(null);
  const footerRef = useRef(null);
  const recognitionRef = useRef(null);

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
    const initPuter = async () => {
      if (window.puter) {
        setPuter(window.puter);
        if (await window.puter.auth.isSignedIn()) {
          const user = await window.puter.auth.getUser();
          setCurrentUser(user);
          fetchUserSpace(window.puter);
        }
      } else {
        const intervalId = setInterval(async () => {
          if (window.puter) {
            setPuter(window.puter);
            clearInterval(intervalId);
            if (await window.puter.auth.isSignedIn()) {
              const user = await window.puter.auth.getUser();
              setCurrentUser(user);
              fetchUserSpace(window.puter);
            }
          }
        }, 100);
        return () => clearInterval(intervalId);
      }
    };
    initPuter();
  }, []);

  const fetchUserSpace = async (puterInstance) => {
    if (!puterInstance) return;
    try {
      const space = await puterInstance.fs.space();
      setUserSpace(space);
    } catch (error) {
      console.error("Failed to fetch user space:", error);
      setUserSpace({ error: "Could not fetch space info." });
    }
  };


  useEffect(() => {
    if (chatEndRef.current && !showScrollToBottom) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isAiThinking, showScrollToBottom]);

  useEffect(() => {
    const updateCssVariables = () => {
      if (headerRef.current) document.documentElement.style.setProperty('--header-height', `${headerRef.current.offsetHeight}px`);
      if (footerRef.current) document.documentElement.style.setProperty('--footer-height', `${footerRef.current.offsetHeight}px`);
    };
    updateCssVariables();
    const resizeObserver = new ResizeObserver(updateCssVariables);
    const currentHeaderRef = headerRef.current;
    const currentFooterRef = footerRef.current;
    if (currentHeaderRef) resizeObserver.observe(currentHeaderRef);
    if (currentFooterRef) resizeObserver.observe(currentFooterRef);
    return () => {
      if (currentHeaderRef) resizeObserver.unobserve(currentHeaderRef);
      if (currentFooterRef) resizeObserver.unobserve(currentFooterRef);
    };
  }, [isDarkMode, headerRef, footerRef]);

  const handleChatScroll = useCallback(() => {
    if (chatAreaRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatAreaRef.current;
      const threshold = clientHeight / 2;
      setShowScrollToBottom(scrollHeight - scrollTop - clientHeight > threshold);
    }
  }, []);

  useEffect(() => {
    const chatAreaCurrent = chatAreaRef.current;
    chatAreaCurrent?.addEventListener('scroll', handleChatScroll);
    return () => chatAreaCurrent?.removeEventListener('scroll', handleChatScroll);
  }, [handleChatScroll]);

  const toggleTheme = () => setIsDarkMode(prev => !prev);

  const addMessageToList = (messageData) => {
    setMessages(prev => [...prev, { ...messageData, id: generateId(), timestamp: new Date() }]);
  };

  const handleCommand = async (command, ...args) => {
    setIsLoading(true);
    setIsAiThinking(true);
    const thinkingMsgId = generateId();
    addMessageToList({ text: `Executing: ${command}...`, sender: 'ai', streaming: true, id: thinkingMsgId });

    try {
        if (command === '/image') {
            const imagePrompt = args.join(' ');
            const imageUrl = await puter.ai.txt2img(imagePrompt, { testMode: false }); // Use testMode: true if not wanting to use credits
            addMessageToList({ text: `Generated image for "${imagePrompt}":`, sender: 'ai', imageUrl: imageUrl });
        } else if (command === '/describe') {
            const imageUrlToDescribe = args[0];
            if (!imageUrlToDescribe) throw new Error("No image URL provided for /describe");
            const description = await puter.ai.img2txt(imageUrlToDescribe);
            addMessageToList({ text: `Description for image at ${imageUrlToDescribe}:\n${description}`, sender: 'ai' });
        }
        setMessages(prev => prev.filter(msg => msg.id !== thinkingMsgId)); // Remove thinking message
    } catch (error) {
        console.error(`Error executing command ${command}:`, error);
        setMessages(prev => prev.map(msg => 
            msg.id === thinkingMsgId 
              ? { ...msg, text: `Error with command ${command}: ${error.message || JSON.stringify(error)}`, streaming: false, error: true } 
              : msg
          ));
    } finally {
        setIsLoading(false);
        setIsAiThinking(false);
    }
  };


  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    const trimmedPrompt = currentPrompt.trim();
    if (!puter || !trimmedPrompt || isLoading || isAiThinking) return;

    addMessageToList({ text: trimmedPrompt, sender: 'user', imageUrl: imageInputUrl });
    
    const promptForAi = trimmedPrompt;
    const imageUrlForAi = imageInputUrl;

    setCurrentPrompt('');
    setImageInputUrl('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    if (promptForAi.startsWith('/')) {
        const [command, ...args] = promptForAi.split(' ');
        handleCommand(command, ...args);
        return;
    }
    
    setIsLoading(true);
    setIsAiThinking(true);

    const aiMessageId = generateId();
    addMessageToList({ text: '', sender: 'ai', streaming: true, modelUsed: selectedModel, id: aiMessageId });
    
    try {
      const chatOptions = { model: selectedModel, stream: true };
      let responseStream;

      if (imageUrlForAi) {
        responseStream = await puter.ai.chat(promptForAi, imageUrlForAi, false, chatOptions);
      } else {
        responseStream = await puter.ai.chat(promptForAi, chatOptions);
      }
      
      setIsAiThinking(false);

      let fullResponse = '';
      let buffer = '';
      const RENDER_INTERVAL = 30;
      let lastRenderTime = 0;

      for await (const part of responseStream) {
        const textContent = part?.text || part?.content || '';
        buffer += textContent;
        
        const currentTime = Date.now();
        if (buffer && (currentTime - lastRenderTime > RENDER_INTERVAL || textContent.includes('\n'))) {
          fullResponse += buffer;
          buffer = '';
          setMessages(prev => prev.map(msg =>
            msg.id === aiMessageId ? { ...msg, text: fullResponse, streaming: true } : msg
          ));
          lastRenderTime = currentTime;
        }
      }
      
      if (buffer) {
        fullResponse += buffer;
      }
      
      setMessages(prev => prev.map(msg =>
        msg.id === aiMessageId ? { ...msg, text: fullResponse, streaming: false } : msg
      ));

    } catch (error) {
      console.error(`Error with model ${selectedModel}:`, error);
      setIsAiThinking(false);
      
      let errorMessageText = `Error with ${selectedModel}: `;
      if (error && error.message) {
        errorMessageText += error.message;
      } else if (typeof error === 'string') {
        errorMessageText += error;
      } else {
        try {
          errorMessageText += JSON.stringify(error);
        } catch (_) {
          errorMessageText += 'Unknown error occurred. Check console for details.';
        }
      }
      
      if (error && (String(error.message).includes('undefined') || String(error.message).includes('not found') || String(error.status).startsWith('4'))) {
        errorMessageText += ' This model might be unavailable, misconfigured, or the request was malformed. Try a different model like gpt-4o-mini or claude-3-5-sonnet.';
      }
      
      setMessages(prev => prev.map(msg =>
        msg.id === aiMessageId ? { ...msg, text: errorMessageText, streaming: false, error: true } : msg
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

  const handleSpeechToText = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert("Speech recognition not supported in this browser.");
      return;
    }
    if (!recognitionRef.current) {
      recognitionRef.current = new window.webkitSpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setCurrentPrompt(prev => prev + transcript);
        setIsListening(false);
      };
      recognitionRef.current.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        alert(`Speech recognition error: ${event.error}`);
        setIsListening(false);
      };
      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleSpeakMessage = async (text) => {
    if (!puter || !text) return;
    try {
        const audio = await puter.ai.txt2speech(text);
        audio.play();
    } catch (error) {
        console.error("Text-to-speech error:", error);
        alert(`Text-to-speech error: ${error.message}`);
    }
  };
  
  const handleSignIn = async () => {
    if (!puter) return;
    try {
      await puter.auth.signIn();
      const user = await puter.auth.getUser();
      setCurrentUser(user);
      fetchUserSpace(puter);
    } catch (error) {
      console.error("Sign in failed:", error);
    }
  };

  const handleSignOut = async () => {
    if (!puter) return;
    try {
      await puter.auth.signOut();
      setCurrentUser(null);
      setUserSpace(null);
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  };

  const handleOpenFilePicker = async () => {
    if (!puter) return;
    try {
        const file = await puter.ui.showOpenFilePicker();
        if (file) {
            const fileInfo = `Selected file: ${file.name}, Size: ${file.size} bytes, Path: ${file.path}`;
            puter.ui.alert(fileInfo);
        }
    } catch (error) {
        console.error("Error with open file picker:", error);
        puter.ui.alert(`Error: ${error.message}`);
    }
  };

  const handleKvSet = async () => {
    if (!puter || !kvKey) return;
    try {
        await puter.kv.set(kvKey, kvValue);
        setKvResult(`Set '${kvKey}' to '${kvValue}'`);
    } catch (error) {
        setKvResult(`Error setting KV: ${error.message}`);
    }
  };

  const handleKvGet = async () => {
    if (!puter || !kvKey) return;
    try {
        const value = await puter.kv.get(kvKey);
        setKvResult(`Value of '${kvKey}': ${value === null ? 'Not Found' : value}`);
    } catch (error) {
        setKvResult(`Error getting KV: ${error.message}`);
    }
  };

  const handlePuterFetch = async () => {
    if(!puter) return;
    const urlToFetch = "https://jsonplaceholder.typicode.com/todos/1";
    try {
        const response = await puter.net.fetch(urlToFetch);
        const data = await response.json();
        puter.ui.alert(`Fetched from ${urlToFetch}:\n${JSON.stringify(data, null, 2)}`);
    } catch (error) {
        puter.ui.alert(`Error fetching: ${error.message}`);
    }
  };


  if (!puter && !isLoading && !isAiThinking && !showToolsPanel) {
    return (
      <div className="initial-loading-container">
        <div className="spinner"></div><p>Initializing Cool Chat...</p>
      </div>
    );
  }

  return (
    <div className={`app-container cool-chat-theme ${showToolsPanel ? 'tools-panel-active' : ''}`}>
      <header className="app-header" ref={headerRef}>
        <div className="header-title-area"><h1>Cool Chat</h1></div>
        <div className="header-controls-area">
          <button 
            onClick={() => setShowToolsPanel(prev => !prev)} 
            className="tools-toggle-button neumorphic-element" 
            aria-label="Toggle Tools Panel"
          >
            🛠️
          </button>
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

      <div className="main-content-wrapper">
        <main className="chat-area" ref={chatAreaRef}>
          <div className="message-list">
            {messages.map(msg => (
              <div key={msg.id} className={`message-wrapper ${msg.sender === 'user' ? 'user-wrapper' : 'ai-wrapper'}`}>
                <div className={`message-bubble ${msg.sender === 'user' ? 'user-message' : 'ai-message'} ${msg.error ? 'error-message' : ''}`}>
                  {msg.imageUrl && <img src={msg.imageUrl} alt="User uploaded content" className="message-image" />}
                  <SimpleMarkdown text={msg.text} />
                  {msg.streaming && !msg.text && !isAiThinking && <span className="thinking-dots"><span>.</span><span>.</span><span>.</span></span>}
                  {msg.streaming && msg.text && <span className="streaming-cursor"></span>}
                  
                  {msg.sender === 'ai' && !msg.streaming && !msg.error && msg.text && (
                    <div className="ai-message-controls">
                        <button className="copy-button neumorphic-element" onClick={() => handleCopyText(msg.text)} aria-label="Copy message">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                        </button>
                        <button className="speak-button neumorphic-element" onClick={() => handleSpeakMessage(msg.text)} aria-label="Speak message">
                            🔊
                        </button>
                    </div>
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
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path d="M12 17.27L18.18 11.09L16.77 9.68L12 14.45L7.23 9.68L5.82 11.09L12 17.27ZM12 4C11.74 4 11.5 4.1 11.32 4.23L3.5 9.87C3.18 10.09 3 10.47 3 10.87V11C3 11.55 3.45 12 4 12H20C20.55 12 21 11.55 21 11V10.87C21 10.47 20.82 10.09 20.5 9.87L12.68 4.23C12.5 4.1 12.26 4 12 4Z"/></svg>
            </button>
          )}
        </main>

        {showToolsPanel && (
            <aside className="tools-panel glassmorphic-element">
                <h2>Puter Tools</h2>
                <div className="tool-section">
                    <h4>Authentication</h4>
                    {currentUser ? (
                        <>
                            <p>User: {currentUser.username} ({currentUser.uuid})</p>
                            <button onClick={handleSignOut} className="neumorphic-element tool-button">Sign Out</button>
                        </>
                    ) : (
                        <button onClick={handleSignIn} className="neumorphic-element tool-button">Sign In with Puter</button>
                    )}
                </div>
                <div className="tool-section">
                    <h4>File System</h4>
                    <button onClick={handleOpenFilePicker} className="neumorphic-element tool-button">Open File...</button>
                    {userSpace && (
                        <p className="space-info">
                            Storage: {userSpace.error ? userSpace.error : 
                            `${(userSpace.used / 1024 / 1024).toFixed(2)}MB / ${(userSpace.capacity / 1024 / 1024).toFixed(2)}MB`}
                        </p>
                    )}
                </div>
                 <div className="tool-section">
                    <h4>Key-Value Store</h4>
                    <input type="text" value={kvKey} onChange={e => setKvKey(e.target.value)} placeholder="Key" className="neumorphic-input tool-input" />
                    <textarea value={kvValue} onChange={e => setKvValue(e.target.value)} placeholder="Value" className="neumorphic-input tool-input" rows="2"></textarea>
                    <div className="tool-buttons-inline">
                        <button onClick={handleKvSet} className="neumorphic-element tool-button">Set</button>
                        <button onClick={handleKvGet} className="neumorphic-element tool-button">Get</button>
                    </div>
                    {kvResult && <p className="kv-result">{kvResult}</p>}
                </div>
                <div className="tool-section">
                    <h4>UI Demo</h4>
                    <button onClick={() => puter?.ui.alert("This is a Puter alert!", [{label: "OK", value: "ok"}])} className="neumorphic-element tool-button">Show Alert</button>
                </div>
                 <div className="tool-section">
                    <h4>Networking Demo</h4>
                    <button onClick={handlePuterFetch} className="neumorphic-element tool-button">Fetch Demo Data</button>
                </div>
            </aside>
        )}
      </div>


      <footer className="chat-input-area glassmorphic-element" ref={footerRef}>
        <div className="image-url-input-container">
            <input 
                type="text" 
                className="image-url-input neumorphic-input"
                placeholder="Paste image URL for vision (optional)"
                value={imageInputUrl}
                onChange={(e) => setImageInputUrl(e.target.value)}
                disabled={isLoading || isAiThinking}
            />
        </div>
        <form onSubmit={handleSendMessage} className="input-form">
          <textarea
            ref={textareaRef}
            className="chat-input"
            value={currentPrompt}
            onChange={(e) => setCurrentPrompt(e.target.value)}
            placeholder="Message Cool Chat... (try /image a cat or /describe <URL>)"
            rows="1"
            disabled={isLoading || isAiThinking}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !isLoading && !isAiThinking) { e.preventDefault(); handleSendMessage(); }}}
          />
          <button 
            type="button" 
            onClick={handleSpeechToText} 
            className={`speech-button neumorphic-element ${isListening ? 'listening' : ''}`} 
            disabled={isLoading || isAiThinking} 
            aria-label="Toggle speech input"
          >
            🎤
          </button>
          <button
            type="submit"
            className="send-button neumorphic-element"
            disabled={isLoading || isAiThinking || !currentPrompt.trim()}
            aria-label="Send message"
          >
            {isLoading || isAiThinking ? (<div className="typing-indicator"><span></span><span></span><span></span></div>) : (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24px" height="24px"><path d="M3.40039 20.5996L20.9996 12.9996L3.40039 5.39961L3.40039 10.9996L14.4004 12.9996L3.40039 14.9996L3.40039 20.5996Z"/></svg>)}
          </button>
        </form>
      </footer>
    </div>
  );
}

export default App;