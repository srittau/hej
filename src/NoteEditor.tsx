import { faClose } from "@fortawesome/free-solid-svg-icons";
import { Loader, TextInput, Textarea } from "@mantine/core";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import AppLinkAction from "./AppLinkAction";
import DeleteNote from "./DeleteNote";
import { Note } from "./Note";
import classes from "./NoteEditor.module.css";
import { useNote, useUpdateNote, useUpdateNoteInCache } from "./gql";
import { useDebouncedValue } from "./hooks";

export default function NoteEditor() {
  const { uuid } = useParams<string>();
  const note = useNote(uuid ?? "");
  if (!note) return;
  return (
    <>
      <NoteContent note={note} key={uuid} />
      <AppLinkAction to={`/notes/${uuid}`} replace icon={faClose} />
    </>
  );
}

interface NoteContentProps {
  note: Note;
}

function NoteContent({ note }: NoteContentProps) {
  const { title, text, updateTitle, updateText, updating } =
    useDebouncedUpdate(note);

  return (
    <div className={classes.noteView}>
      <TextInput
        type="text"
        value={title}
        autoFocus // eslint-disable-line jsx-a11y/no-autofocus
        aria-label="Note title"
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
      <Textarea
        multiline
        value={text}
        aria-label="Note text"
        className={classes.noteText}
        onChange={(evt) => updateText(evt.target.value)}
      />
      <DeleteNote className={classes.noteActions} />
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
