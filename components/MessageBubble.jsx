import React, { useEffect, useRef, useMemo, useState } from 'react';
import { marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';
import { useChatStore } from '../store/chatStore.js';
import { useAuthStore } from '../store/authStore.js';

marked.setOptions({ breaks: true, gfm: true });
const renderer = new marked.Renderer();
renderer.code = ({ text: code, lang }) => {
  const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
  let highlighted = '';
  try { highlighted = hljs.highlight(code, { language }).value; }
  catch { highlighted = hljs.highlightAuto(code).value; }
  const id = `cb-${Math.random().toString(36).slice(2, 8)}`;
  return `<div class="code-block">
<div class="code-header">
  <span class="code-lang">${language}</span>
  <button class="copy-btn" data-id="${id}">Copy</button>
</div>
<pre id="${id}"><code class="hljs language-${language}">${highlighted}</code></pre>
</div>`;
};
marked.use({ renderer });

function timeStr(iso) {
  if (!iso) return '';
  try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
}

function TypingDots() {
  return (
    <div className="typing-dots">
      <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
    </div>
  );
}

function MarkdownBlock({ content, contentRef }) {
  const html = useMemo(() => (content ? marked.parse(content) : ''), [content]);
  return (
    <div
      className="md-body"
      ref={contentRef}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function AccordionItem({ label, children, content, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen || false);
  return (
    <div className="seg-reasoning">
      <div className="seg-hd" onClick={() => setOpen(!open)}>
        <span className="seg-lbl">{label}</span>
        <span className="seg-chev">{open ? '▼' : '>'}</span>
      </div>
      {open && (
        <pre className="seg-pre">{content}</pre>
      )}
    </div>
  );
}

function toolArgsPreview(args) {
  if (!args) return '';
  try {
    const parsed = typeof args === 'string' ? JSON.parse(args) : args;
    const q = parsed.query || parsed.url || parsed.message || '';
    if (q && typeof q === 'string') return ` "${q.slice(0, 60)}${q.length > 60 ? '...' : ''}"`;
  } catch {}
  return '';
}

export default function MessageBubble({ msg, isStreaming }) {
  const isUser = msg.role === 'user';
  const contentRef = useRef(null);
  const streamSegments = useChatStore(s => s.streamSegments);
  const username = useAuthStore(s => s.user?.username || 'U');

  const isSegmentStreaming = isStreaming && streamSegments.length > 0;
  const showTyping = isStreaming && streamSegments.length === 0;

  useEffect(() => {
    if (!isUser && contentRef.current) {
      contentRef.current.querySelectorAll('pre code:not(.hljs)').forEach(el => {
        try { hljs.highlightElement(el); } catch {}
      });
    }
  }, [streamSegments, msg.content, isUser]);

  useEffect(() => {
    const el = contentRef.current;
    if (!el || isUser) return;
    const handler = (e) => {
      const btn = e.target.closest('.copy-btn');
      if (!btn) return;
      const id = btn.getAttribute('data-id');
      const pre = document.getElementById(id);
      if (!pre) return;
      navigator.clipboard.writeText(pre.innerText).then(() => {
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = 'Copy'; }, 1800);
      }).catch(() => {});
    };
    el.addEventListener('click', handler);
    return () => el.removeEventListener('click', handler);
  }, [streamSegments, msg.content, isUser]);

  if (isUser) {
    return (
      <div className="msg-row msg-row--user">
        <div className="msg-col">
          <div className="msg-bubble msg-bubble--user">{msg.content}</div>
          <span className="msg-meta">{timeStr(msg.created_at)}</span>
        </div>
        <div className="msg-avatar msg-avatar--user">
          {username[0].toUpperCase()}
        </div>
      </div>
    );
  }

  return (
    <div className="msg-row msg-row--agent">
      <div className="msg-avatar msg-avatar--agent">X</div>
      <div className="msg-col" style={{ flex: 1, minWidth: 0 }}>
        <div className={`msg-bubble msg-bubble--agent${isStreaming ? ' msg-bubble--streaming' : ''}`}>
          {showTyping ? (
            <TypingDots />
          ) : isSegmentStreaming || (!isStreaming && streamSegments.length > 0) ? (
            <div className="seg-list">
              {streamSegments.map((seg) => {
                if (seg.type === 'reasoning') {
                  return (
                    <AccordionItem key={seg.id} label="Thinking..." content={seg.content} defaultOpen />
                  );
                }
                if (seg.type === 'tool_call') {
                  return (
                    <div key={seg.id} className="seg-tool">{seg.name}{toolArgsPreview(seg.arguments)}</div>
                  );
                }
                if (seg.type === 'content') {
                  return <MarkdownBlock key={seg.id} content={seg.content} contentRef={contentRef} />;
                }
                return null;
              })}
            </div>
          ) : (
            <MarkdownBlock content={msg.content || ''} contentRef={contentRef} />
          )}
        </div>

        <div className="msg-footer">
          <span className="msg-meta">
            {timeStr(msg.created_at)}
            {msg.agentType && msg.agentType !== 'error' && ` · ${msg.agentType}`}
          </span>
        </div>
      </div>
    </div>
  );
}