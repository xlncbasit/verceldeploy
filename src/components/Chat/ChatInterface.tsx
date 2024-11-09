//src/components/Chat/ChatInterface.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { ConfigParams } from '@/types';
import '@/styles/chat.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ConfigState {
  currentConfig: any;
  proposedConfig: any;
  requirementsSummary: string;
}

export default function ChatInterface({ params }: { params: ConfigParams }) {
  const [mounted, setMounted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<'requirements' | 'review'>('requirements');
  const [configState, setConfigState] = useState<ConfigState | null>(null);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const avatarImages = {
    user: '/images/user.png',
    assistant: '/images/fieldmo.png',
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    setMounted(true);
    setMessages([{
      role: 'assistant',
      content: `Welcome! I'm your AI assistant for the ${params.moduleKey} module. Please tell me about your customization requirements, and once you've shared all the necessary information, click "Finalize Customization" to proceed with the changes.`
    }]);
  }, [params.moduleKey]);

  const handleFinalizeCustomization = async () => {
    setIsTyping(true);
    try {
      const response = await fetch('/api/chat/finalize', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ 
          conversationHistory: messages,
          params 
        })
      });

      if (!response.ok) {
        throw new Error('Failed to process customization');
      }

      const data = await response.json();
      setConfigState({
        currentConfig: data.currentConfig,
        proposedConfig: data.proposedConfig,
        requirementsSummary: data.summary
      });
      
      setPhase('review');
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Based on our conversation, I've prepared the customization changes. Here's a summary of what will be modified:\n\n${data.summary}\n\nWould you like to proceed with these changes? Please respond with 'yes' to confirm or 'no' to make adjustments.`
      }]);
      setAwaitingConfirmation(true);
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsTyping(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setError(null);
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsTyping(true);

    try {
      if (phase === 'review' && awaitingConfirmation) {
        const response = userMessage.toLowerCase();
        if (response === 'yes') {
          // Process final confirmation
          const finalResponse = await fetch('/api/chat/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              confirmed: true,
              configState,
              params 
            })
          });

          if (!finalResponse.ok) throw new Error('Failed to apply changes');

          setMessages(prev => [...prev, {
            role: 'assistant',
            content: 'Great! The customization has been successfully applied.'
          }]);
          setAwaitingConfirmation(false);
        } else if (response === 'no') {
          // Reset to requirements gathering phase
          setPhase('requirements');
          setConfigState(null);
          setAwaitingConfirmation(false);
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: "I understand. Let's revisit your requirements. Please tell me what needs to be adjusted."
          }]);
        } else {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: "Please respond with 'yes' to confirm the changes or 'no' to make adjustments."
          }]);
        }
      } else {
        // Regular conversation flow
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: userMessage, params })
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
      }
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
          <button 
            className="finalize-button" 
            onClick={handleFinalizeCustomization}
            disabled={phase === 'review' || isTyping}
          >
            Finalize Customization
          </button>
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
                placeholder={phase === 'review' && awaitingConfirmation ? 
                  "Type 'yes' to confirm or 'no' to make adjustments" : 
                  "Type your message..."
                }
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
