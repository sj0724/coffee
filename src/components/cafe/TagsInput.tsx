import { useEffect, useState } from 'react';
import { NoteInput } from './NoteInput';

export function TagsInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string[];
  onChange: (tags: string[]) => void;
}) {
  const [raw, setRaw] = useState(value?.join(', ') ?? '');

  useEffect(() => {
    setRaw(value?.join(', ') ?? '');
  }, [value]);

  return (
    <NoteInput
      label={label}
      value={raw}
      onChange={setRaw}
      onBlur={() =>
        onChange(
          raw
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        )
      }
    />
  );
}
