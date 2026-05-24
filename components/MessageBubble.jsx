import React, { useEffect, useRef } from 'react';
import { marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';

marked.setOptions({ breaks: true, gfm: true });

const renderer = new marked.Renderer();
renderer.code = ({ text: code, lang }) => {
  const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
  let highlighted = '';
  try { highlighted = hljs.highlight(code, { language }).value; }
  catch { highlighted = hljs.highlightAuto(code).value; }
  return `<pre><code class="hljs language-${language}">${highlighted}</code></pre>`;
};
marked.use({ renderer });

function timeStr(iso) {
  if (!iso) return '';
  try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
}

const AGENT_LABELS = {
  main: 'Main Agent', web: 'Web Agent', code: 'Code Agent',
  database: 'Database Agent', search: 'Search Agent',
  direct_tools: 'Direct LLM', fallback: 'Fallback LLM',
};

export default function MessageBubble({ msg, streamingContent }) {
  const isUser = msg.role === 'agent' ? false : msg.role === 'user';
  const contentRef = useRef(null);
  const agentType = msg.metadata?.agentType || msg.agentType || '';
  const tokens = msg.metadata?.tokensUsed || msg.tokensUsed || 0;

  useEffect(() => {
    if (!isUser && contentRef.current) {
      contentRef.current.querySelectorAll('pre code:not(.hljs)').forEach(el => {
        hljs.highlightElement(el);
      });
    }
  }, [msg.content]);

  if (msg.role === 'user') {
    return (
      <div className="message-row user">
        <div className="msg-bubble-wrap">
          <div className="msg-bubble user-bubble">{msg.content}</div>
          <span className="msg-meta">{timeStr(msg.created_at)}</span>
        </div>
        <div className="msg-avatar user-avatar">U</div>
      </div>
    );
  }

  const html = marked.parse(msg.content || '');
  const streamingHtml = streamingContent ? marked.parse(streamingContent) : '';

  return (
    <div className="message-row agent">
      <div className="msg-avatar agent-avatar">X</div>
      <div className="msg-bubble-wrap" style={{ maxWidth: '100%', flex: 1 }}>
        <div className="msg-bubble agent-bubble">
          <div
            className="md-content"
            ref={contentRef}
            dangerouslySetInnerHTML={{ __html: html }}
          />
          {streamingContent && (
            <div className="md-content streaming-content">
              <span dangerouslySetInnerHTML={{ __html: streamingHtml }} />
              <span className="streaming-cursor" />
            </div>
          )}
        </div>
        <span className="msg-meta">
          {timeStr(msg.created_at)}
          {agentType && ` · ${AGENT_LABELS[agentType] || agentType}`}
          {tokens > 0 && ` · ${tokens.toLocaleString()} tokens`}
        </span>
      </div>
    </div>
  );
}
