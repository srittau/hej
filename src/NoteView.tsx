import { useEffect, useState } from "react";
import { useParams, useSubmit } from "react-router-dom";
import { Pulse } from "react-svg-spinners";

import { Note } from "./Note";
import { useNote, useUpdateNote, useUpdateNoteInCache } from "./gql";
import { useDebouncedValue } from "./hooks";

import "./NoteView.css";

export default function NoteView() {
  const { uuid } = useParams<string>();
  const note = useNote(uuid ?? "");
  if (!note) return;
  return <NoteContent note={note} key={uuid} />;
}

interface NoteContentProps {
  note: Note;
}

function NoteContent({ note }: NoteContentProps) {
  const { title, text, updateTitle, updateText, updating } =
    useDebouncedUpdate(note);
  const submit = useSubmit();

  function onDelete() {
    submit(null, { method: "delete", action: `/notes/${note.uuid}` });
  }

  return (
    <div className="note-view">
      <div className="note-title">
        <input
          type="text"
          value={title}
          onChange={(evt) => updateTitle(evt.target.value)}
        />
      </div>
      <div className={`note-spinner ${updating ? "active" : "inactive"}`}>
        <Pulse />
      </div>
      <button onClick={onDelete}>Delete note</button>
      <div className="note-text">
        <textarea
          value={text}
          onChange={(evt) => updateText(evt.target.value)}
        />
      </div>
    </div>
  );
}

function useDebouncedUpdate(initialNote: Note): {
  title: string;
  text: string;
  updateTitle: (title: string) => void;
  updateText: (text: string) => void;
  updating: boolean;
} {
  const [update, loading] = useUpdateNote(initialNote.uuid);
  const updateCache = useUpdateNoteInCache();
  const [title, setTitle] = useState(initialNote.title);
  const [text, setText] = useState(initialNote.text);
  const [debouncedTitle, isTitleBouncing] = useDebouncedValue(title);
  const [debouncedText, isTextBouncing] = useDebouncedValue(text);

  useEffect(() => {
    updateCache(initialNote.uuid, debouncedTitle, debouncedText);
    void (async () =>
      await update({ title: debouncedTitle, text: debouncedText }))();
  }, [initialNote.uuid, debouncedTitle, debouncedText, updateCache, update]);

  return {
    title,
    text,
    updateTitle: setTitle,
    updateText: setText,
    updating: loading || isTitleBouncing || isTextBouncing,
  };
}
