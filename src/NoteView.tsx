import { Button, Loader, TextInput, Textarea } from "@mantine/core";
import { useEffect, useState } from "react";
import { useParams, useSubmit } from "react-router-dom";

import { Note } from "./Note";
import classes from "./NoteView.module.css";
import { useNote, useUpdateNote, useUpdateNoteInCache } from "./gql";
import { useDebouncedValue } from "./hooks";

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
    <div className={classes.noteView}>
      <TextInput
        type="text"
        value={title}
        className={classes.noteTitle}
        onChange={(evt) => updateTitle(evt.target.value)}
      />
      <div
        className={`${classes.noteSpinner} ${
          updating ? classes.active : classes.inactive
        }`}
      >
        <Loader type="dots" />{" "}
      </div>
      <Button
        variant="light"
        type="button"
        className={classes.noteActions}
        onClick={onDelete}
      >
        Delete note
      </Button>
      <Textarea
        multiline
        value={text}
        className={classes.noteText}
        onChange={(evt) => updateText(evt.target.value)}
      />
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
