import React from "react";

import { Note } from "./Note";
import { useDeleteNote, useUpdateNote } from "./gql";
import "./NoteView.css";

interface NoteViewProps {
  note: Note;
  onDeleteNote?: (uuid: string) => void;
}

export default function NoteView({ note, onDeleteNote }: NoteViewProps) {
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();

  const onTitleChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
    updateNote({ ...note, title: evt.target.value });
  };
  const onTextChange = (evt: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateNote({ ...note, text: evt.target.value });
  };
  function onDelete() {
    void deleteNote(note.uuid);
    onDeleteNote?.(note.uuid);
  }

  return (
    <div className="note-view">
      <div className="note-title">
        <input type="text" value={note.title} onChange={onTitleChange} />
      </div>
      <button onClick={onDelete}>Delete note</button>
      <div className="note-text">
        <textarea value={note.text} onChange={onTextChange} />
      </div>
    </div>
  );
}
