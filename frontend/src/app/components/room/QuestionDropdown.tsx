"use client";

import { useState } from "react";
import { useTheme } from "../../../../context/ThemeContext";
// Inline QuestionPanel content into the dropdown to avoid rendering two cards

type Props = {
  title?: string;
  description?: string;
  difficulty?: string;
  acceptanceRate?: number | string;
};

export default function QuestionDropdown({ title, description, difficulty, acceptanceRate }: Props) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);

  const truncated = (description || "").length > 180 ? (description || "").slice(0, 180) + "..." : description || "";

  return (
    <div style={{ marginBottom: 12 }}>
      <div
        onClick={() => setOpen((s) => !s)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setOpen((s) => !s); }}
        style={{
          background: theme.card.background,
          border: `1px solid ${theme.border}`,
          borderRadius: 8,
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          cursor: 'pointer',
          alignItems: 'stretch',
          boxSizing: 'border-box'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 700, color: theme.id === 'dark' ? '#f3f4f6' : '#111827' }}>{title || 'Question'}</div>
          <div style={{ marginLeft: 12, color: theme.textSecondary }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.18s' }}>
              <path d="M6 9l6 6 6-6" stroke={theme.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* Description: truncated when closed; full when open. When open the content area scrolls internally to avoid pushing the editor */}
        <div style={{ fontSize: 13, color: theme.id === 'dark' ? '#cbd5e1' : '#6b7280', width: '100%' }}>
          {open ? (
            <div style={{ width: '100%', maxHeight: '40vh', overflowY: 'auto', overflowX: 'hidden', whiteSpace: 'pre-wrap', lineHeight: 1.6, color: theme.id === 'dark' ? '#e5e7eb' : '#374151', boxSizing: 'border-box' }}>
              {description || 'No description available.'}
              {/* show difficulty/acceptance inline when open */}
              <div style={{ marginTop: 12, fontSize: 13, color: theme.id === 'dark' ? '#9ca3af' : '#6b7280' }}>
                {difficulty && <div>Difficulty: {difficulty}</div>}
                {typeof acceptanceRate === 'number' && <div>Acceptance Rate: {Math.round(acceptanceRate)}%</div>}
              </div>
            </div>
          ) : (
            <div>{truncated}</div>
          )}
        </div>
      </div>
    </div>
  );
}
