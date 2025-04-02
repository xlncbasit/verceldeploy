import { useState, useEffect, useRef } from 'react';
import { ConfigParams } from '@/types';
import ProgressDeployButton from '../ProgressDeployButton';
import { getModuleLabel, replaceAllModuleCodes } from '@/lib/utils/moduleMapping';
import '@/styles/chat.css';
import ErrorBanner from '../ErrorBanner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ConfigState {
  currentConfig: any;
  proposedConfig: any;
  requirementsSummary: string;
}

interface ConversationContext {
  pastRequirements: string[];
  keyDecisions: Record<string, string>;
  lastTopics: string[];
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const MAX_MESSAGE_EXCHANGES = 4;
  const MESSAGE_FORMATS = {
    heading: (text: string) => `<h3 class="message-heading">${text}</h3>`,
    paragraph: (text: string) => `<p>${text}</p>`,
    bulletList: (items: string[]) => `<ul class="message-bullet-list">${items.map(item => `<li>${item}</li>`).join('')}</ul>`,
    emphasis: (text: string) => `<strong class="message-emphasis">${text}</strong>`,
    highlight: (text: string) => `<span class="message-highlight">${text}</span>`,
    note: (text: string) => `<div class="message-note"><span class="note-icon">💡</span> ${text}</div>`,
    section: (title: string, content: string) => `
      <div class="message-section">
        <div class="section-title">${title}</div>
        <div class="section-content">${content}</div>
      </div>
    `,
  };

  const [ conversationContext, setConversationContext ] = useState<ConversationContext>({
    pastRequirements: [],
    keyDecisions: {},
    lastTopics: []
  });
  
  const avatarImages = {
    user: '/images/user.png',
    assistant: '/images/fieldmo.png',
  };

  // Extract key topics from messages
  const extractTopics = (message: string): string[] => {
    const topics = message.match(/(configure|modify|change|update|add|remove|create|customize)\s+([a-zA-Z\s]+)/gi);
    const fieldMatches = message.match(/field[s]?\s+([a-zA-Z0-9\s]+)/gi);
    
    const combinedMatches = [
      ...(topics || []), 
      ...(fieldMatches || [])
    ];
    
    return combinedMatches
      ?.map(t => t.trim())
      .filter((v, i, a) => a.indexOf(v) === i)
      .slice(0, 3) || [];
  };
  
  // Extract decisions from assistant messages
  const extractDecisions = (message: string): Record<string, string> => {
    const decisions: Record<string, string> = {};
    
    // Look for phrases that indicate decisions
    const fieldChanges = message.match(/will (add|update|modify|remove|change) ([a-zA-Z0-9\s]+)/gi);
    if (fieldChanges) {
      fieldChanges.forEach(change => {
        const normalizedChange = change.trim().toLowerCase();
        const key = normalizedChange.slice(0, 30);
        decisions[key] = normalizedChange;
      });
    }
    
    return decisions;
  };

  const getMessageExchangeCount = () => {
    // Count complete back-and-forth exchanges (user message followed by assistant response)
    let exchangeCount = 0;
    let consecutiveTypes = [];
    
    for (const message of messages) {
      consecutiveTypes.push(message.role);
      if (consecutiveTypes.includes('user') && consecutiveTypes.includes('assistant')) {
        exchangeCount++;
        consecutiveTypes = [];
      }
    }
    
    // Add partial exchange if it exists
    if (consecutiveTypes.includes('user')) {
      exchangeCount += 0.5;
    }
    
    return Math.min(MAX_MESSAGE_EXCHANGES, exchangeCount);
  };


  const handleRedirect = () => {
    const urlParams = new URLSearchParams({
      org_key: params.orgKey || '',
      user_key: params.userKey || '',
      module_key: params.moduleKey || '',
      industry: params.industry || '',
      subindustry: params.subIndustry || ''
    });
    window.location.href = `https://customizer.fieldmobi.ai/edit?${urlParams.toString()}`;
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  
const fetchConfigSummary = async () => {
    try {
      setIsTyping(true);
      const response = await fetch('/api/chat/summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ params })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch configuration summary');
      }

      const data = await response.json();
      const moduleLabel = getModuleLabel(params.moduleKey);
      
      // Create a module-specific initial message with enhanced formatting
      let initialMessage = '';
      
      // Common greeting section with emoji and formatting
      initialMessage = `## Welcome to Your ${moduleLabel} Customization

  Buzz🐝! I'm **Fieldmo**, your ERP consultant. I'll help customize your ${moduleLabel} module for ${params.industry}.

  NOTE: Your requirements will help me tailor this module specifically for your business needs.`;
      
      // Add module-specific prompts based on the module type
      if (params.moduleKey.includes('WORKFORCE')) {
        initialMessage += `

  ## Let's Start Customizing

  What specific changes do you need for your workforce management? Common areas include:

  • **Employee information fields** - What employee data needs to be captured?
  • **Attendance tracking requirements** - Any specific attendance rules to implement?
  • **Expense claim processes** - How should expense workflows be configured?

  Please describe your requirements as specifically as possible!`;
      } 
      // Add other module types here...
      else {
        initialMessage += `

  ## Let's Start Customizing

  What specific changes do you need for this module? Common areas for customization include:

  • **Field labels and descriptions** - What terminology fits your business?
  • **Required data fields** - What information must be captured?
  • **Form layout and workflow** - How should the process flow?

  Please describe your requirements as specifically as possible!`;
      }
      
      // Apply the formatting function to the initial message
      const formattedInitialMessage = formatMessageContent(replaceAllModuleCodes(initialMessage));
      
      setMessages([{
        role: 'assistant',
        content: formattedInitialMessage
      }]);
    } catch (error) {
      console.error('Error fetching summary:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
      
      // Fallback initial message with basic formatting
      const fallbackMessage = `## Ready to Customize Your Module

  Buzz🐝! I'm **Fieldmo**, your friendly ERP consultant. I'll help customize.

  What specific changes are you looking to make? Please be as detailed as possible!`;

      setMessages([{
        role: 'assistant',
        content: formatMessageContent(fallbackMessage)
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  useEffect(() => {
    if (mounted) return;
    setMounted(true);
    fetchConfigSummary();
  }, [mounted]);

  function formatMessageContent(content: string): string {
    return content
      // Remove excessive line breaks (no more than two consecutive)
      .replace(/\n{3,}/g, '\n\n')
      
      // Format section headers with special styling (## Heading)
      // Make sure to process this FIRST before other replacements
      .replace(/## ([^\n]+)/g, '<h3 class="message-heading">$1</h3>')
      .replace(/# ([^\n]+)/g, '<h2 class="message-heading">$1</h2>')
      
      // Format markdown-style bold
      .replace(/\*\*([^\*]+)\*\*/g, '<strong class="message-emphasis">$1</strong>')
      
      // Format markdown-style italic
      .replace(/\*([^\*]+)\*/g, '<em>$1</em>')
      
      // Format note callouts
      .replace(/NOTE: ([^\n]+)/gi, '<div class="message-note"><span class="note-icon">💡</span> $1</div>')
      
      // Format bullet points with enhanced styling
      .replace(/• ([^\n]+)/g, '<li class="enhanced-bullet">$1</li>')
      
      // Wrap bullet points in a proper list if not already
      .replace(/(<li class="enhanced-bullet">[^<]+<\/li>(?:\s*<li class="enhanced-bullet">[^<]+<\/li>)*)/g, 
             '<ul class="message-bullet-list">$1</ul>')
      
      // Convert single newlines to break tags, double for paragraphs
      // But don't add breaks inside HTML tags we've already created
      .replace(/\n\n(?!<\/?(h[2-3]|ul|li|div|p))/g, '</p><p class="message-paragraph">')
      .replace(/\n(?!<\/?(h[2-3]|ul|li|div|p))/g, '<br/>')
      
      // Add paragraph tags if not present
      .replace(/^(?!<(p|h[2-3]|ul|div))/i, '<p class="message-paragraph">')
      .replace(/(?<!<\/(p|h[2-3]|ul|div)>)$/i, '</p>')
      
      // Clean up any empty paragraphs
      .replace(/<p[^>]*>\s*<\/p>/g, '')
      
      // Make sure all paragraphs have the proper class
      .replace(/<p>/g, '<p class="message-paragraph">');
  }

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
          params ,
          context: conversationContext
        })
      });
  
      const data = await response.json();
      
      // Construct edit URL with current parameters
      const editUrl = new URL('https://customizer.fieldmobi.ai/edit');
      editUrl.searchParams.set('org_key', params.orgKey);
      editUrl.searchParams.set('user_key', params.userKey);
      editUrl.searchParams.set('module_key', params.moduleKey);
      editUrl.searchParams.set('industry', params.industry);
      editUrl.searchParams.set('subindustry', params.subIndustry);
  
      // Redirect to edit URL
      window.location.href = editUrl.toString();
      
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsTyping(false);
    }
  };

  const getHumanLikeDelay = (message: string): number => {
    // Base delay between 500-1000ms
    const baseDelay = Math.random() * 500 + 500;
    
    // Add delay based on message length (longer = more thinking time)
    const lengthFactor = Math.min(message.length / 100, 5);
    
    // Add random variation (±300ms)
    const randomVariation = (Math.random() * 600) - 300;
    
    return baseDelay + (lengthFactor * 1000) + randomVariation;
  };
  
  // Modify handleSubmit function to use the delay
  // Replace the existing handleSubmit function with this updated version:
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
  
    const userMessage = inputValue.trim();
    setInputValue('');
    setError(null);
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsTyping(true);
  
    setConversationContext(prev => ({
      ...prev,
      pastRequirements: [...prev.pastRequirements, userMessage]
    }));
  
    try {
      // Get the human-readable module label
      const moduleLabel = getModuleLabel(params.moduleKey);
      
      // Adjust the message context based on exchange count
      const messageExchangeCount = getMessageExchangeCount();
      let contextAddition = '';
      let formattingInstructions = '';
  
      // First, determine the conversation stage
      if (messageExchangeCount <= 1) {
        contextAddition = `This is the user's first description of requirements. Ask 1-2 focused follow-up questions to clarify any ambiguities and explore important areas they might have missed.`;
        formattingInstructions = `Use a brief "Thank You" section at the start. Then use a "Follow-up Questions" section with bullet points for key questions. Make good use of bold formatting for emphasis.`;
      } else if (messageExchangeCount <= 2) {
        contextAddition = `The conversation is progressing. The user has provided some details. Ask for any final critical information needed. Keep response brief and focused.`;
        formattingInstructions = `Start with a "Progress Update" section acknowledging what you've learned. Then use a "Final Details" section with specific questions. Use note formatting for any important clarifications needed.`;
      } else {
        contextAddition = `This is one of the final exchanges. Provide a clear summary of all requirements gathered so far, confirm understanding, and encourage the user to press Deploy if everything looks correct.`;
        formattingInstructions = `Use a "Summary of Requirements" section with bullet points grouping similar requirements. Then add a "Ready to Deploy" section encouraging them to finalize. Use section formatting and bold highlights for key points.`;
      }
  
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMessage, 
          params,
          context: {
            ...conversationContext,
            messageExchangeCount: messageExchangeCount,
            contextStage: contextAddition,
            formattingInstructions: formattingInstructions,
            moduleLabel: moduleLabel // Pass the human-readable label
          }
        })
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process request');
      }
  
      const data = await response.json();
      
      // Add human-like delay before showing response
      const typingDelay = getHumanLikeDelay(data.response);
      await new Promise(resolve => setTimeout(resolve, typingDelay));

      let processedResponse = replaceAllModuleCodes(data.response);
      
      const formattedContent = formatMessageContent(processedResponse);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: formattedContent
      }]);
  
      // Update context with any key decisions from the assistant response
      const newDecisions = extractDecisions(data.response);
      const newTopics = extractTopics(userMessage);
      
      setConversationContext(prev => ({
        pastRequirements: prev.pastRequirements,
        keyDecisions: { ...prev.keyDecisions, ...newDecisions },
        lastTopics: newTopics.length ? newTopics : prev.lastTopics
      }));
      
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

  const isLastMessageFromAssistant = () => {
    return messages.length > 0 && messages[messages.length - 1].role === 'assistant';
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const moduleLabel = getModuleLabel(params.moduleKey);

  return (
    <div className="container">
      <header className="header">
        <button 
          className="sidebar-toggle"
          onClick={toggleSidebar}
          aria-label="Toggle Sidebar"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
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
            <span className="param-value">
              {key === 'moduleKey' ? getModuleLabel(value) : (value || 'Not specified')}
            </span>
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
                  <div 
                    className="message-content"
                    dangerouslySetInnerHTML={{ __html: message.content }}
                  />
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="message-wrapper assistant-wrapper">
                  <div className="avatar">
                    <img 
                      src={avatarImages.assistant}
                      alt="Assistant typing"
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
               {isLastMessageFromAssistant() && phase === 'requirements' && !isTyping && messages.length > 1 && (
                <ProgressDeployButton 
                  messageCount={getMessageExchangeCount()} 
                  maxMessages={MAX_MESSAGE_EXCHANGES}
                  onDeploy={handleFinalizeCustomization}
                  isDisabled={isTyping || phase !== 'requirements'}
                  moduleLabel={moduleLabel}
                />
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSubmit} className="input-container">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' ) {
                    // Let enter create a new line
                    return;
                  }
                  if (e.key === 'Enter' && !e.shiftKey) {
                    // Regular Shift+Enter submits the form
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder={phase === 'review' && awaitingConfirmation ? 
                  "Type 'yes' to confirm or 'no' to make adjustments" : 
                  "Describe your customization needs..."
                }
                disabled={isTyping}
                rows={1}
                className="chat-input"
              />
              <button 
                type="submit" 
                disabled={isTyping || !inputValue.trim()}
                aria-label="Send message"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}