// Add this component to src/components/ProgressDeployButton.tsx

import React from 'react';

interface ProgressDeployButtonProps {
  messageCount: number;
  maxMessages: number;
  onDeploy: () => void;
  isDisabled: boolean;
  moduleLabel: string;
}

const ProgressDeployButton: React.FC<ProgressDeployButtonProps> = ({
  messageCount, 
  maxMessages,
  onDeploy,
  isDisabled,
  moduleLabel
}) => {
  // Calculate progress percentage (min 10%, max 100%)
  const progress = Math.min(100, Math.max(10, Math.floor((messageCount / maxMessages) * 100)));
  const isComplete = progress >= 100;
  
  // Get descriptive stage text
  const getStageText = () => {
    if (progress < 25) return <strong>Getting Started...</strong>;
    if (progress < 50) return <strong>Collecting Requirements...</strong>;
    if (progress < 75) return <strong>Refining Details...</strong> ;
    if (progress < 100) return <strong>Almost Ready...</strong>;
    return 'Ready to Deploy!';
  };

  // Get informative status message
  const getStatusMessage = () => {
    if (progress < 25) {
      return `<p>I'm learning about your ${moduleLabel} needs! <strong>Keep sharing details</strong> so I can craft the perfect solution.</p>`;
    }
    if (progress < 50) {
      return `<p><strong>A few more specific requirements</strong>.</p>`;
    }
    if (progress < 75) {
      return `<p>We're making great progress! <strong>Any final requirements ?</strong></p>`;
    }
    if (progress < 100) {
      return `<p>Almost there! <strong>One last exchange</strong> and you can deploy.</p>`;
    }
    return `<p><strong>Perfect! All requirements received.</strong> Your customization is ready to be deployed.</p>`;
  };

  return (
    <div className="progress-deploy-container">
      {/* Status message above the button */}
      <div 
        className="progress-status-message"
        dangerouslySetInnerHTML={{ __html: getStatusMessage() }}
      />

      
      <div className="progress-button-wrapper">
        <div className="progress-stage">
          <span className="progress-stage-icon">
            {isComplete ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="green" strokeWidth="4">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            )}
          </span>
          <br></br>
          {getStageText()}
        </div>

        <br></br>
        
        <button 
          className={`progress-deploy-button ${isComplete ? 'complete' : ''}`}
          onClick={onDeploy}
          disabled={isDisabled}
        >
          <div 
            className="progress-fill" 
            style={{ width: `${progress}%` }}
          />
          <span className="button-text">
            {isComplete ? 'Deploy' : `${progress}%`}
          </span>
          {isComplete && (
            <span className="deploy-icon">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            </span>
          )}
        </button>
      </div>
    </div>
  );
};

export default ProgressDeployButton;