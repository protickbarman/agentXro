import React, { useState, useEffect } from 'react';

export default function StepCard({ step }) {
  const [isOpen, setIsOpen] = useState(step.status === 'running');

  useEffect(() => {
    if (step.status === 'running') setIsOpen(true);
  }, [step.status]);

  const isRunning = step.status === 'running';

  return (
    <div className={`step-card step-card--${step.status}`}>
      <button className="step-header" onClick={() => setIsOpen(!isOpen)}>
        <span className="step-header-left">
          {isRunning ? (
            <span className="step-spinner" />
          ) : step.status === 'success' ? (
            <span className="step-icon step-icon--success">&#10003;</span>
          ) : (
            <span className="step-icon step-icon--failed">&#10005;</span>
          )}
          <span className="step-tool-badge">{step.tool}</span>
          <span className="step-status-text">
            {isRunning
              ? step.message || 'Running...'
              : step.status === 'success'
                ? 'Completed'
                : 'Failed'}
          </span>
        </span>
        <span className={`step-chevron${isOpen ? ' step-chevron--open' : ''}`}>&#9654;</span>
      </button>
      <div className={`step-body${isOpen ? ' step-body--open' : ''}`}>
        <div className="step-body-inner">
          {isRunning && step.message && <p className="step-message">{step.message}</p>}
          {!isRunning && step.summary && <p className="step-summary">{step.summary}</p>}
        </div>
      </div>
    </div>
  );
}
