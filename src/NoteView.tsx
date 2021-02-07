import React from "react";

import { Note } from "./Note";
import "./NoteView.css";

interface NoteViewProps {
  note: Note;
  onNoteChanged?: (newNote: Note) => void;
}

function NoteView({ note, onNoteChanged }: NoteViewProps) {
  const onTitleChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
    onNoteChanged?.({ ...note, title: evt.target.value });
  };
  const onTextChange = (evt: React.ChangeEvent<HTMLTextAreaElement>) => {
    onNoteChanged?.({ ...note, text: evt.target.value });
  };
  return (
    <div className="note-view">
      <div className="note-title">
        <input type="text" value={note.title} onChange={onTitleChange} />
      </div>
      <div className="note-text">
        <textarea value={note.text} onChange={onTextChange} />
      </div>
    </div>
  );
}

export default NoteView;
