import { Button } from "@mantine/core";
import { useSubmit } from "react-router-dom";

interface AddNoteProps {
  children?: React.ReactNode;
}

export default function AddNote({ children }: AddNoteProps) {
  const submit = useSubmit();
  return (
    <Button
      type="button"
      variant="filled"
      onClick={() => submit(null, { method: "post", action: "/" })}
    >
      {children}
    </Button>
  );
}
