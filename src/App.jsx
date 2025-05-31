// src/App.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import './index.css';

const generateId = () => '_' + Math.random().toString(36).substr(2, 9);

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
  if (!text && text !== "") return null; // Allow empty string to clear content
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
  const [isLoading, setIsLoading] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [currentUser, setCurrentUser] = useState(null); // For auth status

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

  const fetchInitialPuterData = useCallback(async (puterInstance) => {
    if (!puterInstance) return;
    try {
      if (await puterInstance.auth.isSignedIn()) {
        const user = await puterInstance.auth.getUser();
        setCurrentUser(user);
        // await fetchUserSpace(puterInstance); // Potentially fetch space if needed later
      } else {
        // Optionally prompt for sign-in if essential for app start
        // await puterInstance.auth.signIn();
        // const user = await puterInstance.auth.getUser();
        // setCurrentUser(user);
      }
    } catch (error) {
      console.error("Error during initial Puter data fetch:", error);
      addMessageToList({ text: `Error initializing Puter connection: ${error.message || JSON.stringify(error)}`, sender: 'ai', error: true});
    }
  }, []);

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
    window.addEventListener('resize', updateCssVariables); // Recalculate on resize
    const resizeObserver = new ResizeObserver(updateCssVariables);
    const currentHeaderRef = headerRef.current;
    const currentFooterRef = footerRef.current;
    if (currentHeaderRef) resizeObserver.observe(currentHeaderRef);
    if (currentFooterRef) resizeObserver.observe(currentFooterRef);
    return () => {
      window.removeEventListener('resize', updateCssVariables);
      if (currentHeaderRef) resizeObserver.unobserve(currentHeaderRef);
      if (currentFooterRef) resizeObserver.unobserve(currentFooterRef);
    };
  }, [isDarkMode, headerRef, footerRef]); // Rerun if theme changes affecting sizes

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
  
  const extractUrl = (text) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = text.match(urlRegex);
    return urls ? urls[0] : null; // Return the first URL found
  };


  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    const trimmedPrompt = currentPrompt.trim();
    if (!puter || !trimmedPrompt || isLoading || isAiThinking) return;

    addMessageToList({ text: trimmedPrompt, sender: 'user' });
    const promptForAi = trimmedPrompt;
    setCurrentPrompt('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    
    setIsLoading(true);
    setIsAiThinking(true);
    const aiMessageId = generateId(); // For updating streamed response

    // Heuristic for image generation
    const genKeywords = ['draw', 'generate image of', 'create a picture of', 'imagine an image of', 'generate an image of'];
    let isImageGen = false;
    let imageGenPrompt = promptForAi;
    for (const keyword of genKeywords) {
        if (promptForAi.toLowerCase().startsWith(keyword)) {
            isImageGen = true;
            imageGenPrompt = promptForAi.substring(keyword.length).trim();
            break;
        }
    }

    // Heuristic for image description
    const descKeywords = ['describe image at', 'what is in the image at', 'analyze image at', 'describe this image:', 'what is in this image:'];
    let isImageDesc = false;
    let imageUrlForDesc = extractUrl(promptForAi);
    if (imageUrlForDesc) {
        for (const keyword of descKeywords) {
            if (promptForAi.toLowerCase().includes(keyword)) {
                isImageDesc = true;
                break;
            }
        }
    }
    
    // Image URL for vision models (passed to puter.ai.chat)
    let imageUrlForVision = !isImageDesc ? extractUrl(promptForAi) : null; 
    let textPromptForVision = promptForAi;
    if (imageUrlForVision) {
        textPromptForVision = promptForAi.replace(imageUrlForVision, '').trim();
    }


    try {
        if (isImageGen) {
            addMessageToList({ text: `Generating image for: "${imageGenPrompt}"...`, sender: 'ai', streaming: true, id: aiMessageId });
            const generatedImageUrl = await puter.ai.txt2img(imageGenPrompt, false); // testMode: false
            setMessages(prev => prev.map(msg => 
                msg.id === aiMessageId 
                  ? { ...msg, text: `Generated image for "${imageGenPrompt}":`, imageUrl: generatedImageUrl, streaming: false } 
                  : msg
            ));
        } else if (isImageDesc && imageUrlForDesc) {
            addMessageToList({ text: `Describing image at: ${imageUrlForDesc}...`, sender: 'ai', streaming: true, id: aiMessageId });
            const description = await puter.ai.img2txt(imageUrlForDesc);
            setMessages(prev => prev.map(msg => 
                msg.id === aiMessageId 
                  ? { ...msg, text: `Description for image:\n${description}`, streaming: false } 
                  : msg
            ));
        } else { // Regular chat or vision chat
            addMessageToList({ text: '', sender: 'ai', streaming: true, modelUsed: selectedModel, id: aiMessageId });
            const chatOptions = { model: selectedModel, stream: true };
            const responseStream = imageUrlForVision 
                ? await puter.ai.chat(textPromptForVision, imageUrlForVision, false, chatOptions)
                : await puter.ai.chat(promptForAi, chatOptions);

            setIsAiThinking(false); // AI started responding, not just "thinking" before first token
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
      console.error(`Error during AI operation:`, error);
      let errorMessageText = `AI Error: `;
      if (error && error.message) {
        errorMessageText += error.message;
      } else {
        try { errorMessageText += JSON.stringify(error); }
        catch (_) { errorMessageText += 'An unknown error occurred.'; }
      }
      setMessages(prev => prev.map(msg => 
        msg.id === aiMessageId 
          ? { ...msg, text: errorMessageText, streaming: false, error: true } 
          : (msg.streaming && msg.sender === 'ai' ? {...msg, text: errorMessageText, streaming: false, error: true} : msg) // Catch general thinking message too
      ));
    } finally {
      setIsLoading(false);
      setIsAiThinking(false); // Ensure this is reset
    }
  };
  
  const handleCopyText = (text) => { /* ... same ... */ };
  const autoResizeTextarea = () => { /* ... same ... */ };
  useEffect(autoResizeTextarea, [currentPrompt]);
  const clearChat = () => setMessages([]);
  const scrollToBottom = () => { /* ... same ... */ };

  const handleSpeakMessage = async (text) => { /* ... same ... */ };

  if (!puter && !isLoading && !isAiThinking) {
    return ( /* ... same initial loading ... */ );
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
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
          </button>
        </div>
      </header>

      <main className="chat-area" ref={chatAreaRef}>
        <div className="message-list">
          {messages.map(msg => (
            <div key={msg.id} className={`message-wrapper ${msg.sender === 'user' ? 'user-wrapper' : 'ai-wrapper'}`}>
              <div className={`message-bubble ${msg.sender === 'user' ? 'user-message' : 'ai-message'} ${msg.error ? 'error-message' : ''}`}>
                {msg.imageUrl && <img src={msg.imageUrl} alt="Generated content" className="message-image" />}
                <SimpleMarkdown text={msg.text} />
                {msg.streaming && !msg.text && !isAiThinking && <span className="thinking-dots"><span>.</span><span>.</span><span>.</span></span>}
                {msg.streaming && msg.text && <span className="streaming-cursor"></span>}
                
                {msg.sender === 'ai' && !msg.streaming && !msg.error && msg.text && (
                  <div className="ai-message-controls">
                      <button className="copy-button neumorphic-element" onClick={() => handleCopyText(msg.text)} aria-label="Copy message">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                      </button>
                      <button className="speak-button neumorphic-element" onClick={() => handleSpeakMessage(msg.text)} aria-label="Speak message">🔊</button>
                  </div>
                )}
                 <span className="message-timestamp">{new Date(msg.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
              </div>
            </div>
          ))}
          {isAiThinking && messages.every(m => m.id !== aiMessageId || !m.text) && ( // Show general thinking only if no AI message is actively streaming
            <div className="message-wrapper ai-wrapper">
              <div className="message-bubble ai-message thinking-message">
                <div className="aurora-loader"><div></div><div></div><div></div><div></div></div>
                <span>AI is thinking...</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
        {showScrollToBottom && ( <button onClick={scrollToBottom} className={`scroll-to-bottom-button neumorphic-element ${showScrollToBottom ? 'visible' : ''}`} aria-label="Scroll to bottom"> <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path d="M12 17.27L18.18 11.09L16.77 9.68L12 14.45L7.23 9.68L5.82 11.09L12 17.27ZM12 4C11.74 4 11.5 4.1 11.32 4.23L3.5 9.87C3.18 10.09 3 10.47 3 10.87V11C3 11.55 3.45 12 4 12H20C20.55 12 21 11.55 21 11V10.87C21 10.47 20.82 10.09 20.5 9.87L12.68 4.23C12.5 4.1 12.26 4 12 4Z"/></svg> </button> )}
      </main>

      <footer className="chat-input-area" ref={footerRef}> {/* Removed glassmorphic-element to ensure content scrolls under */}
        <form onSubmit={handleSendMessage} className="input-form">
          <textarea
            ref={textareaRef}
            className="chat-input"
            value={currentPrompt}
            onChange={(e) => setCurrentPrompt(e.target.value)}
            placeholder="Ask Cool Chat, or try 'draw a cat'..."
            rows="1"
            disabled={isLoading || isAiThinking}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !isLoading && !isAiThinking) { e.preventDefault(); handleSendMessage(); }}}
          />
          <button type="submit" className="send-button neumorphic-element" disabled={isLoading || isAiThinking || !currentPrompt.trim()} aria-label="Send message">
            {isLoading || isAiThinking ? (<div className="typing-indicator"><span></span><span></span><span></span></div>) : (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24px" height="24px"><path d="M3.40039 20.5996L20.9996 12.9996L3.40039 5.39961L3.40039 10.9996L14.4004 12.9996L3.40039 14.9996L3.40039 20.5996Z"/></svg>)}
          </button>
        </form>
      </footer>
    </div>
  );
}

export default App;