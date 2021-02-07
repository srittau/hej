import React from "react";

import { Note } from "./Note";
import "./NoteView.css";

interface NoteViewProps {
  note: Note;
  onChangeNote?: (newNote: Note) => void;
  onDeleteNote?: (uuid: string) => void;
}

function NoteView({ note, onChangeNote, onDeleteNote }: NoteViewProps) {
  const onTitleChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
    onChangeNote?.({ ...note, title: evt.target.value });
  };
  const onTextChange = (evt: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChangeNote?.({ ...note, text: evt.target.value });
  };
  return (
    <div className="note-view">
      <div className="note-title">
        <input type="text" value={note.title} onChange={onTitleChange} />
      </div>
      <button onClick={() => onDeleteNote?.(note.uuid)}>Delete note</button>
      <div className="note-text">
        <textarea value={note.text} onChange={onTextChange} />
      </div>
    </div>
  );
}

export default NoteView;
