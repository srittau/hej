import React, { useEffect, useState } from "react";
import { Pulse } from "react-svg-spinners";

import { Note } from "./Note";
import { useDeleteNote, useUpdateNote, useUpdateNoteInCache } from "./gql";

import "./NoteView.css";

const DEBOUNCE_MS = 500;

interface NoteViewProps {
  note: Note;
  onDeleteNote?: (uuid: string) => void;
}

export default function NoteView({ note, onDeleteNote }: NoteViewProps) {
  const [updateNote, updating] = useDebouncedUpdate();
  const [title, text, setTitle, setText] = useNoteText(note);
  const deleteNote = useDeleteNote();

  const onTitleChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(evt.target.value);
    updateNote({ ...note, title: evt.target.value });
  };
  const onTextChange = (evt: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(evt.target.value);
    updateNote({ ...note, text: evt.target.value });
  };
  function onDelete() {
    void deleteNote(note.uuid);
    onDeleteNote?.(note.uuid);
  }

  return (
    <div className="note-view">
      <div className="note-title">
        <input type="text" value={title} onChange={onTitleChange} />
      </div>
      <div className={`note-spinner ${updating ? "active" : "inactive"}`}>
        <Pulse />
      </div>
      <button onClick={onDelete}>Delete note</button>
      <div className="note-text">
        <textarea value={text} onChange={onTextChange} />
      </div>
    </div>
  );
}

function useNoteText(
  note: Note,
): [string, string, (title: string) => void, (text: string) => void] {
  const [prevTitle, setPrevTitle] = useState(note.title);
  const [prevText, setPrevText] = useState(note.text);
  const [title, setTitle] = useState(note.title);
  const [text, setText] = useState(note.text);

  if (prevTitle !== note.title) {
    setTitle(note.title);
    setPrevTitle(note.title);
  }
  if (prevText !== note.text) {
    setText(note.text);
    setPrevText(note.text);
  }

  return [title, text, setTitle, setText];
}

function useDebouncedUpdate(): [
  updateNote: (note: Note) => void,
  updating: boolean,
] {
  const [update, loading] = useUpdateNote();
  const updateCache = useUpdateNoteInCache();
  const [newNote, setNewNote] = useState<Note>();

  useEffect(() => {
    if (!newNote) return;
    updateCache(newNote);
    const timeout = setTimeout(() => {
      try {
        void (async () => await update(newNote))();
      } finally {
        setNewNote(undefined);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [newNote, update, updateCache]);

  return [setNewNote, loading || newNote !== undefined];
}
