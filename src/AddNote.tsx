import { useSubmit } from "react-router-dom";

interface AddNoteProps {
  children?: React.ReactNode;
}

export default function AddNote({ children }: AddNoteProps) {
  const submit = useSubmit();
  return (
    <button
      type="button"
      className="add-note"
      onClick={() => submit(null, { method: "post", action: "/" })}
    >
      {children}
    </button>
  );
}
