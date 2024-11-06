'use client';

import { useState, useEffect, useRef } from 'react';
import { ConfigParams } from '@/types';
import '@/styles/chat.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatInterface({ params }: { params: ConfigParams }) {
  const [mounted, setMounted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const avatarImages = {
    user: '/images/user.png',
    assistant: '/images/fieldmo.png',
  };

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    setMounted(true);
    setMessages([{
      role: 'assistant',
      content: `Welcome! I'm your AI assistant for the ${params.moduleKey} module. How can I help you with your customization?`
    }]);
  }, [params.moduleKey]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setError(null);
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsTyping(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ 
          message: userMessage, 
          params 
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process request');
      }

      const data = await response.json();
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: data.response 
      }]);
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, there was an error processing your message. Please try again.'
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="container">
      <header className="header">
        <div className="logo">fieldmobi.ai</div>
        {error && (
          <div className="error-banner">
            {error}
          </div>
        )}
      </header>

      <div className="content-wrapper">
        <div className="params-sidebar">
          <h2>Configuration Parameters</h2>
          {Object.entries(params).map(([key, value]) => (
            <div key={key} className="param-item">
              <span className="param-label">{key}:</span>
              <span className="param-value">{value || 'Not specified'}</span>
            </div>
          ))}
        </div>

        <div className="main-container">
          <div className="chat-container">
            <div className="chat-messages">
              {messages.map((message, index) => (
                <div 
                  key={index} 
                  className={`message-wrapper ${message.role}-wrapper animate__animated animate__fadeIn`}
                >
                  <div className="avatar">
                    <img 
                      src={avatarImages[message.role]}
                      alt={`${message.role} Avatar`}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/api/placeholder/50/50';
                      }}
                    />
                  </div>
                  <div className={`message ${message.role}`}>
                    <div className="message-content">
                      {message.content}
                    </div>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="message-wrapper assistant-wrapper">
                  <div className="avatar">
                    <img 
                      src={avatarImages.assistant}
                      alt="Assistant Avatar"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/api/placeholder/50/50';
                      }}
                    />
                  </div>
                  <div className="message assistant">
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSubmit} className="input-container">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type your message..."
                disabled={isTyping}
              />
              <button type="submit" disabled={isTyping || !inputValue.trim()}>
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}