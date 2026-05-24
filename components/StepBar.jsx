import React, { useState, useEffect } from 'react';
import { useChatStore } from '../store/chatStore.js';

const STEP_ICONS = {
  analyzing: '🔍', routing: '▶️', fetching: '🌐',
  searching: '🔎', reasoning: '🧠', coding: '💻',
  generating_sql: '🗃️', executing: '⚡', thinking: '💭',
};

const AGENT_COLORS = {
  web: '#0369a1', search: '#a16207', code: '#15803d',
  database: '#b91c1c', main: '#7c3aed',
};

function CollapsedBar({ steps }) {
  const { toggleSteps } = useChatStore();
  const last = steps[steps.length - 1];
  const done = steps.filter(s => s.completed).length;
  const icon = STEP_ICONS[last?.step] || '🔄';

  return (
    <div className="step-bar-collapsed" onClick={toggleSteps}>
      <span className="step-bar-collapsed-icon">{icon}</span>
      <span className="step-bar-collapsed-label">{last?.label || 'Processing...'}</span>
      <span className="step-bar-collapsed-count">{done}/{steps.length}</span>
      <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  );
}

function ExpandedBar({ steps }) {
  const { toggleSteps } = useChatStore();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const list = (
    <div className="step-bar-expanded">
      {steps.map((s, i) => (
        <div key={i} className="step-item">
          <span className="step-item-icon">
            {s.completed ? '✅' : (STEP_ICONS[s.step] || '🔄')}
          </span>
          <span className="step-item-label">{s.label}</span>
          {s.agent && (
            <span
              className="step-item-agent"
              style={{
                background: (AGENT_COLORS[s.agent] || '#7c3aed') + '18',
                color: AGENT_COLORS[s.agent] || '#7c3aed',
              }}
            >
              {s.agent}
            </span>
          )}
          {!s.completed && (
            <span className="step-item-dots">
              <span className="step-dot" />
              <span className="step-dot" />
              <span className="step-dot" />
            </span>
          )}
        </div>
      ))}
    </div>
  );

  if (isMobile) {
    return (
      <>
        <div className="step-bar-overlay" onClick={toggleSteps} />
        <div className="step-bar-sheet">
          <div className="step-bar-sheet-handle" />
          {list}
          <button className="step-bar-sheet-close" onClick={toggleSteps}>Close</button>
        </div>
      </>
    );
  }

  return <div className="step-bar-desktop"><div className="step-bar-desktop-header" onClick={toggleSteps}>▲ Hide</div>{list}</div>;
}

export default function StepBar() {
  const { steps, stepsExpanded } = useChatStore();

  if (steps.length === 0) return null;
  return stepsExpanded ? <ExpandedBar steps={steps} /> : <CollapsedBar steps={steps} />;
}
