import { EspressoNote } from '@/src/types';
import { FlavorDetailRow } from './NoteDetailRow';

export function EspressoNoteView({ note }: { note: EspressoNote }) {
  if (note.tags.length === 0) return null;
  return <FlavorDetailRow label="커피 특징" notes={note.tags} />;
}
