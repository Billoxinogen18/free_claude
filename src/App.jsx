// src/App.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import './index.css';

const generateId = () => '_' + Math.random().toString(36).substr(2, 9);

// Model groups (ensure this list is accurate and up-to-date with Puter.js docs)
const modelGroups = [
  {
    label: "OpenAI",
    models: [
      { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Default)' }, { value: 'gpt-4o', label: 'GPT-4o' },
      { value: 'o1', label: 'OpenAI o1' }, { value: 'o1-mini', label: 'OpenAI o1-mini' },
      { value: 'o1-pro', label: 'OpenAI o1-pro' }, { value: 'o3', label: 'OpenAI o3' },
      { value: 'o3-mini', label: 'OpenAI o3-mini' }, { value: 'o4-mini', label: 'OpenAI o4-mini' },
      { value: 'gpt-4.1', label: 'GPT-4.1' }, { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
      { value: 'gpt-4.1-nano', label: 'GPT-4.1 Nano' }, { value: 'gpt-4.5-preview', label: 'GPT-4.5 Preview' },
    ]
  },
  {
    label: "Anthropic",
    models: [
      { value: 'claude-sonnet-4', label: 'Claude Sonnet 4' }, { value: 'claude-opus-4', label: 'Claude Opus 4' },
      { value: 'claude-3-7-sonnet', label: 'Claude 3.7 Sonnet' }, { value: 'claude-3-5-sonnet', label: 'Claude 3.5 Sonnet' },
    ]
  },
  {
    label: "DeepSeek", models: [ { value: 'deepseek-chat', label: 'DeepSeek Chat' }, { value: 'deepseek-reasoner', label: 'DeepSeek Reasoner' },]
  },
  {
    label: "Google", models: [ { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' }, { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' }, { value: 'google/gemma-2-27b-it', label: 'Gemma 2 27B IT (Groq)' },]
  },
  {
    label: "Meta", models: [ { value: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo', label: 'Llama 3.1 8B Turbo' }, { value: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo', label: 'Llama 3.1 70B Turbo' }, { value: 'meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo', label: 'Llama 3.1 405B Turbo' },]
  },
  {
    label: "Mistral", models: [ { value: 'mistral-large-latest', label: 'Mistral Large' }, { value: 'pixtral-large-latest', label: 'Pixtral Large' }, { value: 'codestral-latest', label: 'Codestral' },]
  },
  {
    label: "xAI", models: [ { value: 'grok-beta', label: 'Grok Beta' },]
  }
];

const SimpleMarkdown = ({ text }) => {
  if (!text && text !== "") return null;
  const html = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/```([\s\S]*?)```/g, (match, code) => {
        const language = code.startsWith('\n') ? '' : code.split('\n')[0];
        const actualCode = language ? code.substring(language.length +1) : code;
        return `<pre><code class="language-${language.trim() || 'plaintext'}">${actualCode.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`;
    })
    .replace(/\n/g, '<br />');
  return <span className="message-content-html" dangerouslySetInnerHTML={{ __html: html }} />;
};


function App() {
  const [puter, setPuter] = useState(null);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState(modelGroups[0].models[0].value);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false); // General loading for operations that block input
  const [isAiThinking, setIsAiThinking] = useState(false); // Specifically for AI response generation
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);
  const chatAreaRef = useRef(null);
  const headerRef = useRef(null);
  const footerRef = useRef(null);

  // Theme initialization
  useEffect(() => {
    const savedTheme = localStorage.getItem('cool-chat-theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme) {
      setIsDarkMode(savedTheme === 'dark');
    } else {
      setIsDarkMode(prefersDark);
    }
  }, []);

  // Theme persistence and body class update
  useEffect(() => {
    document.body.classList.toggle('dark-mode', isDarkMode);
    document.body.classList.toggle('light-mode', !isDarkMode);
    localStorage.setItem('cool-chat-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Puter.js initialization and auth check
  const fetchInitialPuterData = useCallback(async (puterInstance) => {
    if (!puterInstance) return;
    try {
      if (await puterInstance.auth.isSignedIn()) {
        const user = await puterInstance.auth.getUser();
        setCurrentUser(user);
      } else {
        // Consider if automatic sign-in is desired or if a button should handle it.
        // For now, let Puter.js handle sign-in when a protected resource is accessed.
        console.log("Puter: User not signed in initially.");
      }
    } catch (error) {
      console.error("Error during initial Puter data fetch:", error);
      addMessageToList({ text: `Puter Init Error: ${error.message || JSON.stringify(error)}`, sender: 'ai', error: true});
    }
  }, []); // Removed addMessageToList from dependencies as it causes loops

  useEffect(() => {
    if (window.puter) {
      setPuter(window.puter);
      fetchInitialPuterData(window.puter);
    } else {
      const intervalId = setInterval(() => {
        if (window.puter) {
          setPuter(window.puter);
          fetchInitialPuterData(window.puter);
          clearInterval(intervalId);
        }
      }, 100);
      return () => clearInterval(intervalId);
    }
  }, [fetchInitialPuterData]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (chatEndRef.current && !showScrollToBottom) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isAiThinking, showScrollToBottom]); // isAiThinking ensures scroll after "thinking" message appears

  // Dynamic CSS variables for header/footer height
  useEffect(() => {
    const updateCssVariables = () => {
      if (headerRef.current) {
        document.documentElement.style.setProperty('--header-height', `${headerRef.current.offsetHeight}px`);
      }
      if (footerRef.current) {
        document.documentElement.style.setProperty('--footer-height', `${footerRef.current.offsetHeight}px`);
      }
    };
    updateCssVariables(); // Initial call
    window.addEventListener('resize', updateCssVariables); // Update on resize
    // Also observe header/footer for size changes (e.g., if content inside them changes height)
    const resizeObserver = new ResizeObserver(updateCssVariables);
    const currentHeaderRef = headerRef.current;
    const currentFooterRef = footerRef.current;
    if(currentHeaderRef) resizeObserver.observe(currentHeaderRef);
    if(currentFooterRef) resizeObserver.observe(currentFooterRef);

    return () => {
      window.removeEventListener('resize', updateCssVariables);
      if(currentHeaderRef) resizeObserver.unobserve(currentHeaderRef);
      if(currentFooterRef) resizeObserver.unobserve(currentFooterRef);
    }
  }, [isDarkMode, headerRef, footerRef]); // Rerun if theme changes affecting sizes

  // Show/hide scroll-to-bottom button
  const handleChatScroll = useCallback(() => {
    if (chatAreaRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatAreaRef.current;
      const threshold = clientHeight / 2; // Show if scrolled up more than half the visible area
      setShowScrollToBottom(scrollHeight - scrollTop - clientHeight > threshold);
    }
  }, []);

  useEffect(() => {
    const chatAreaCurrent = chatAreaRef.current;
    chatAreaCurrent?.addEventListener('scroll', handleChatScroll);
    return () => chatAreaCurrent?.removeEventListener('scroll', handleChatScroll);
  }, [handleChatScroll]);

  const toggleTheme = () => setIsDarkMode(prev => !prev);

  // Helper to add messages to the list
  const addMessageToList = (messageData) => {
    setMessages(prev => [...prev, { ...messageData, id: generateId(), timestamp: new Date() }]);
  };
  
  // Helper to extract the first URL from text
  const extractUrl = (text) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = text.match(urlRegex);
    return urls ? urls[0] : null;
  };

  // Main message sending logic
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault(); // Prevent form submission if called from form
    const trimmedPrompt = currentPrompt.trim();
    if (!puter || !trimmedPrompt || isLoading || isAiThinking) return;

    addMessageToList({ text: trimmedPrompt, sender: 'user' });
    const promptForAi = trimmedPrompt; // Keep original prompt for analysis
    setCurrentPrompt(''); // Clear input
    if (textareaRef.current) textareaRef.current.style.height = 'auto'; // Reset textarea height
    
    setIsLoading(true); // General loading state
    // isAiThinking will be set true just before the AI call if it's a chat operation

    const aiMessageId = generateId(); // Unique ID for the AI's response message

    // --- Automatic Task Detection ---
    let taskType = 'chat'; // Default task
    let operationPrompt = promptForAi;
    let operationImageUrl = null;

    // 1. Image Generation Detection
    const genKeywords = ['draw', 'generate image of', 'create a picture of', 'imagine an image of', 'generate an image of', 'make an image of'];
    for (const keyword of genKeywords) {
        if (promptForAi.toLowerCase().startsWith(keyword)) {
            taskType = 'txt2img';
            operationPrompt = promptForAi.substring(keyword.length).trim();
            break;
        }
    }

    // 2. Image Description Detection (if not already image gen)
    if (taskType === 'chat') {
        const descKeywords = ['describe image at', 'what is in the image at', 'analyze image at', 'describe this image:', 'what is in this image:', 'tell me about the image at'];
        const extractedUrl = extractUrl(promptForAi);
        if (extractedUrl) {
            for (const keyword of descKeywords) {
                if (promptForAi.toLowerCase().includes(keyword)) {
                    taskType = 'img2txt';
                    operationImageUrl = extractedUrl;
                    // operationPrompt remains the full prompt for context, or could be cleared
                    break;
                }
            }
        }
    }
    
    // 3. Image for Vision Models (if still 'chat' and URL is present)
    if (taskType === 'chat') {
        const extractedUrl = extractUrl(promptForAi);
        if (extractedUrl) {
            operationImageUrl = extractedUrl; // This will be passed as imageURL to puter.ai.chat
            operationPrompt = promptForAi.replace(extractedUrl, '').trim(); // Send text without URL
            if (!operationPrompt) operationPrompt = "What do you see in this image?"; // Default prompt if only URL
        }
    }
    // --- End of Task Detection ---

    setIsAiThinking(true); // Now set AI thinking for all AI operations

    try {
        if (taskType === 'txt2img') {
            addMessageToList({ text: `🎨 Generating image for: "${operationPrompt}"...`, sender: 'ai', streaming: true, id: aiMessageId });
            const generatedImageUrl = await puter.ai.txt2img(operationPrompt, false); // testMode: false
            setMessages(prev => prev.map(msg => 
                msg.id === aiMessageId 
                  ? { ...msg, text: `Generated image for "${operationPrompt}":`, imageUrl: generatedImageUrl, streaming: false } 
                  : msg
            ));
        } else if (taskType === 'img2txt') {
            addMessageToList({ text: `🖼️ Describing image at: ${operationImageUrl}...`, sender: 'ai', streaming: true, id: aiMessageId });
            const description = await puter.ai.img2txt(operationImageUrl);
            setMessages(prev => prev.map(msg => 
                msg.id === aiMessageId 
                  ? { ...msg, text: `Description for image:\n${description}`, streaming: false } 
                  : msg
            ));
        } else { // Default to chat (with or without image for vision)
            addMessageToList({ text: '', sender: 'ai', streaming: true, modelUsed: selectedModel, id: aiMessageId });
            const chatOptions = { model: selectedModel, stream: true };
            const responseStream = operationImageUrl
                ? await puter.ai.chat(operationPrompt, operationImageUrl, false, chatOptions) // Vision call
                : await puter.ai.chat(operationPrompt, chatOptions); // Regular chat

            // setIsAiThinking(false); // Moved to finally block
            let fullResponse = '';
            for await (const part of responseStream) {
                const textContent = part?.text || part?.content || '';
                fullResponse += textContent;
                setMessages(prev => prev.map(msg =>
                    msg.id === aiMessageId ? { ...msg, text: fullResponse, streaming: true } : msg
                ));
            }
            setMessages(prev => prev.map(msg =>
                msg.id === aiMessageId ? { ...msg, streaming: false } : msg
            ));
        }
    } catch (error) {
      console.error(`Error during AI operation (${taskType}):`, error);
      let errorMessageText = `AI Error (${selectedModel || taskType}): `;
      if (error && error.message) {
        errorMessageText += error.message;
      } else {
        try { errorMessageText += JSON.stringify(error); }
        catch (_) { errorMessageText += 'An unknown error occurred. Check the console.'; }
      }
      // Update the specific AI message or the last "thinking" message if it exists
      setMessages(prev => prev.map(msg => 
        msg.id === aiMessageId 
          ? { ...msg, text: errorMessageText, streaming: false, error: true } 
          : (msg.streaming && msg.sender === 'ai' && !msg.text ? {...msg, text: errorMessageText, streaming: false, error: true} : msg)
      ));
    } finally {
      setIsLoading(false);
      setIsAiThinking(false);
    }
  };
  
  const handleCopyText = (text) => {
    navigator.clipboard.writeText(text).catch(err => console.error("Failed to copy text: ", err));
  };

  const autoResizeTextarea = () => {
    if (textareaRef.current) {
      const maxHeight = 150; // Max height in pixels
      textareaRef.current.style.height = 'auto'; // Temporarily shrink to get scrollHeight
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
      textareaRef.current.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
    }
  };
  
  useEffect(autoResizeTextarea, [currentPrompt]);

  const clearChat = () => setMessages([]);
  
  const scrollToBottom = () => {
     chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
     setShowScrollToBottom(false); // Hide button after click
  };

  const handleSpeakMessage = async (text) => {
    if (!puter || !text) return;
    try {
        setIsLoading(true); // Indicate activity
        const audio = await puter.ai.txt2speech(text);
        audio.play();
        audio.onended = () => setIsLoading(false); // Reset loading when done
    } catch (error) {
        console.error("Text-to-speech error:", error);
        addMessageToList({ text: `TTS Error: ${error.message}`, sender: 'ai', error: true});
        setIsLoading(false);
    }
  };

  // Initial loading screen
  if (!puter && !isLoading && !isAiThinking) { // Check all loading states
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
                {msg.imageUrl && <img src={msg.imageUrl} alt="Generated or referenced content" className="message-image" />}
                <SimpleMarkdown text={msg.text} />
                {msg.streaming && !msg.text && isAiThinking && <span className="thinking-dots"><span>.</span><span>.</span><span>.</span></span>}
                {msg.streaming && msg.text && <span className="streaming-cursor"></span>}
                
                {msg.sender === 'ai' && !msg.streaming && !msg.error && msg.text && (
                  <div className="ai-message-controls">
                      <button className="copy-button neumorphic-element" onClick={() => handleCopyText(msg.text)} aria-label="Copy message">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                      </button>
                      <button className="speak-button neumorphic-element" onClick={() => handleSpeakMessage(msg.text)} aria-label="Speak message" disabled={isLoading}>
                        🔊
                      </button>
                  </div>
                )}
                 <span className="message-timestamp">{new Date(msg.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
              </div>
            </div>
          ))}
          {isAiThinking && messages.filter(m => m.streaming && m.sender === 'ai' && !m.text).length === 0 && ( // Show general thinking only if no specific AI message is already in "empty streaming" state
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

      <footer className="chat-input-area" ref={footerRef}>
        <form onSubmit={handleSendMessage} className="input-form">
          <textarea
            ref={textareaRef}
            className="chat-input"
            value={currentPrompt}
            onChange={(e) => setCurrentPrompt(e.target.value)}
            placeholder="Message Cool Chat... (e.g., 'draw a cat' or 'describe image at <URL>')"
            rows="1"
            disabled={isLoading || isAiThinking} // General loading or AI thinking
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !isLoading && !isAiThinking) { e.preventDefault(); handleSendMessage(); }}}
          />
          <button
            type="submit"
            className="send-button neumorphic-element"
            disabled={isLoading || isAiThinking || !currentPrompt.trim()}
            aria-label="Send message"
          >
            {isAiThinking && !isLoading ? (<div className="typing-indicator"><span></span><span></span><span></span></div>) : (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24px" height="24px" fill="currentColor"><path d="M3.40039 20.5996L20.9996 12.9996L3.40039 5.39961L3.40039 10.9996L14.4004 12.9996L3.40039 14.9996L3.40039 20.5996Z"/></svg>)}
          </button>
        </form>
      </footer>
    </div>
  );
}

export default App;