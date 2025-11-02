"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import "./CodeEditorPanel.css";
import { useCollaborativeDoc } from "../../../../hooks/useCollaborativeDoc";
import languages from "../../../../utils/syntax";

type Props = {
  roomId: string;
  token: string;
};

function escapeHTML(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightSyntaxSafe(
  text: string,
  lang: {
    keywords: string[];
    commentPattern: RegExp;
    stringPatterns?: RegExp[];
  }
) {
  if (!lang) return escapeHTML(text);

  const src = escapeHTML(text);
  const stringSources = (lang.stringPatterns || []).map((p) => p.source).filter(Boolean);
  const stringAlt = stringSources.length ? `(${stringSources.join("|")})` : null;
  const commentSource = lang.commentPattern.source;
  const keywordAlt = lang.keywords.length
    ? `(${lang.keywords.map(escapeRegExp).join("|")})`
    : null;

  const parts: string[] = [];
  if (stringAlt) parts.push(stringAlt);
  if (commentSource) parts.push(`(${commentSource})`);
  if (keywordAlt) parts.push(`\\b${keywordAlt}\\b`);

  const combined = new RegExp(parts.join("|"), "g");

  const stringTest = stringAlt ? new RegExp(`^${stringAlt}$`) : null;
  const commentTest = new RegExp(`^${commentSource}$`);
  const keywordTest = keywordAlt ? new RegExp(`^\\b${keywordAlt}\\b$`) : null;

  return src.replace(combined, (match) => {
    if (stringTest && stringTest.test(match)) return `<span class="ce-string">${match}</span>`;
    if (commentTest.test(match)) return `<span class="ce-comment">${match}</span>`;
    if (keywordTest && keywordTest.test(match)) return `<span class="ce-keyword">${match}</span>`;
    return match;
  });
}

export default function CodeEditorPanel({ roomId, token }: Props) {
  const { content, updateContent, status } = useCollaborativeDoc(roomId, token, "code");
  const [language, setLanguage] = useState<string>(Object.keys(languages)[0] || "Java");

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const preRef = useRef<HTMLPreElement | null>(null);
  const gutterRef = useRef<HTMLDivElement | null>(null);

  const lines = (content || "").split("\n");
  const lineCount = Math.max(1, lines.length);
  const highlightedHtml = highlightSyntaxSafe(content ?? "", languages[language]);

  // Scroll sync logic
  const onScroll = useCallback(() => {
    const ta = textareaRef.current;
    const pre = preRef.current;
    const gutter = gutterRef.current;
    if (!ta || !pre || !gutter) return;
    pre.scrollTop = ta.scrollTop;
    pre.scrollLeft = ta.scrollLeft;
    gutter.scrollTop = ta.scrollTop;
  }, []);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.addEventListener("scroll", onScroll, { passive: true });
    return () => ta.removeEventListener("scroll", onScroll);
  }, [onScroll]);

  useEffect(() => {
    const ta = textareaRef.current;
    const pre = preRef.current;
    const gutter = gutterRef.current;
    if (!ta || !pre || !gutter) return;
    pre.scrollTop = ta.scrollTop;
    pre.scrollLeft = ta.scrollLeft;
    gutter.scrollTop = ta.scrollTop;
  }, [content, language]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateContent(e.target.value);
  };

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    try {
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      ta.setSelectionRange(start, end);
    } catch {}
  }, [content]);

  return (
    <div className="ce-container" role="region" aria-label="Code editor">
      <div className="ce-header">
        <div className="ce-title">Code Editor</div>
        <div className="ce-controls">
          <select
            className="ce-lang-select"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            {Object.keys(languages).map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="ce-body">
        <div className="ce-gutter" ref={gutterRef} aria-hidden>
          {Array.from({ length: lineCount }, (_, i) => (
            <div className="ce-line-number" key={i}>
              {i + 1}
            </div>
          ))}
        </div>

        <div className="ce-editor-wrapper">
          <pre
            className="ce-highlight"
            ref={preRef}
            aria-hidden
            dangerouslySetInnerHTML={{ __html: highlightedHtml || " " }}
          />
          <textarea
            ref={textareaRef}
            className="ce-textarea"
            value={content ?? ""}
            onChange={handleChange}
            spellCheck={false}
          />
        </div>
      </div>

      <div className="ce-footer">
        <div className="ce-status">Connection: {status}</div>
      </div>
    </div>
  );
}
