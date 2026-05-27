import React, { useEffect, useRef } from 'react';
import { marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';
import { useChatStore } from '../store/chatStore.js';
import FileCard from './FileCard.jsx';

/* ── Marked setup ────────────────────────── */
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

/* ── Time helper ─────────────────────────── */
function timeStr(iso) {
  if (!iso) return '';
  try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
}

/* ── Typing dots ─────────────────────────── */
function TypingDots() {
  return (
    <div className="typing-dots">
      <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
    </div>
  );
}

/* ── Main bubble ─────────────────────────── */
export default function MessageBubble({ msg, isStreaming, liveContent }) {
  const isUser = msg.role === 'user';
  const contentRef = useRef(null);

  /* Re-highlight when content changes */
  useEffect(() => {
    if (!isUser && contentRef.current) {
      contentRef.current.querySelectorAll('pre code:not(.hljs)').forEach(el => {
        try { hljs.highlightElement(el); } catch {}
      });
    }
  }, [msg.content, isUser]);

  /* Delegate copy button clicks (avoid inline onclick — CSP-safe) */
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
  }, [msg.content, isUser]);

  /* ── User bubble ── */
  if (isUser) {
    const username = useChatStore.getState()?.user?.username || 'U';
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

  /* ── Agent bubble ── */
  const displayContent = isStreaming ? liveContent : (msg.content || '');
  const isEmpty = !displayContent;
  const showDots = isStreaming && isEmpty;
  const html = displayContent ? marked.parse(displayContent) : '';

  const allFileCards = useChatStore(s => s.fileCards);
  const cards = allFileCards[msg.id] || [];
  const metaFiles = msg.metadata?.files || [];
  const allFiles = [...metaFiles, ...cards].filter(
    (f, i, arr) => arr.findIndex(x => (x.id || x.filename) === (f.id || f.filename)) === i
  );

  const reasoningBuffer = useChatStore(s => s.reasoningBuffer);
  const liveReasoning = isStreaming ? reasoningBuffer : '';
  const savedReasoning = msg.metadata?.reasoning || '';
  const reasoningText = liveReasoning || savedReasoning;

  return (
    <div className="msg-row msg-row--agent">
      <div className="msg-avatar msg-avatar--agent">X</div>
      <div className="msg-col" style={{ flex: 1, minWidth: 0 }}>

        <div className={`msg-bubble msg-bubble--agent${isStreaming ? ' msg-bubble--streaming' : ''}`}>
          {showDots && !reasoningText ? (
            <TypingDots />
          ) : (
            <>
              {reasoningText && (
                <details className="ts ts-reasoning" open>
                  <summary>Thinking...</summary>
                  <div className="ts-body">{reasoningText}</div>
                </details>
              )}
              <div
                className="md-body"
                ref={contentRef}
                dangerouslySetInnerHTML={{ __html: html }}
              />
              {allFiles.length > 0 && (
                <div className="file-card-list">
                  {allFiles.map((f, i) => <FileCard key={f.id || f.filename || i} file={f} />)}
                </div>
              )}
              {isStreaming && <span className="stream-cursor" />}
            </>
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
