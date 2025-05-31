// src/App.jsx
import React, { useState, useEffect, useRef } from 'react';
import './index.css'; // Styles will be significantly updated

// Simple unique ID generator for messages
const generateId = () => '_' + Math.random().toString(36).substr(2, 9);

function App() {
  const [puter, setPuter] = useState(null);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [chatModel, setChatModel] = useState('claude-sonnet-4'); // Default model
  const [messages, setMessages] = useState([]); // Stores { id, text, sender: 'user' | 'ai', streaming?: boolean }
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef(null); // To auto-scroll to the latest message

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
    // Scroll to bottom when messages change
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!puter || !currentPrompt.trim() || isLoading) return;

    const userMessage = { id: generateId(), text: currentPrompt, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    setCurrentPrompt('');
    setIsLoading(true);

    const aiMessageId = generateId();
    // Add a placeholder for the AI's response while streaming
    setMessages(prev => [...prev, { id: aiMessageId, text: '', sender: 'ai', streaming: true }]);

    try {
      const responseStream = await puter.ai.chat(
        userMessage.text, // Send the text from the user message
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
      // Mark streaming as complete for this message
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

  if (!puter && !isLoading) { // Show initial loading for PuterJS only if not already in a chat loading state
    return (
      <div className="initial-loading-container neumorphic-card">
        <div className="spinner"></div>
        <p>Initializing Cool Chat...</p>
      </div>
    );
  }

  return (
    <div className="app-container cool-chat-theme">
      <header className="app-header neumorphic">
        <h1>Cool Chat</h1>
        <div className="model-selector-container neumorphic-inset">
          <select
            className="neumorphic-select"
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
              <p>{msg.text}{msg.streaming && <span className="streaming-cursor">▍</span>}</p>
            </div>
          ))}
          <div ref={chatEndRef} /> {/* For auto-scrolling */}
        </div>
      </main>

      <footer className="chat-input-area">
        <form onSubmit={handleSendMessage} className="input-form">
          <textarea
            className="neumorphic-textarea chat-input"
            value={currentPrompt}
            onChange={(e) => setCurrentPrompt(e.target.value)}
            placeholder="Type your message..."
            rows="2"
            disabled={isLoading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
                handleSendMessage(e);
              }
            }}
          />
          <button
            type="submit"
            className="neumorphic-button send-button"
            disabled={isLoading || !currentPrompt.trim()}
          >
            {isLoading ? (
              <div className="typing-indicator">
                <span></span><span></span><span></span>
              </div>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24px" height="24px"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
            )}
          </button>
        </form>
      </footer>
    </div>
  );
}

export default App;