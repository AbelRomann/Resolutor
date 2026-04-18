import { useState, KeyboardEvent } from 'react';

interface TagsInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
}

export function TagsInput({ tags, onChange }: TagsInputProps) {
  const [input, setInput] = useState('');

  const addTag = () => {
    const trimmed = input.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInput('');
  };

  const removeTag = (t: string) => onChange(tags.filter(x => x !== t));

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && !input && tags.length) {
      onChange(tags.slice(0, -1));
    }
  };

  return (
    <div className="tags-input-wrap" onClick={() => document.getElementById('tags-field')?.focus()}>
      {tags.map(t => (
        <span key={t} className="tag-item">
          {t}
          <button type="button" className="tag-remove" onClick={(e) => { e.stopPropagation(); removeTag(t); }}>×</button>
        </span>
      ))}
      <input
        id="tags-field"
        className="tags-input"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKey}
        onBlur={addTag}
        placeholder={tags.length === 0 ? 'Escribe y presiona Enter…' : ''}
      />
    </div>
  );
}
