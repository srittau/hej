import { Button } from "@mantine/core";
import { useSubmit } from "react-router-dom";

interface AddNoteProps {
  onClick?: () => void;
  children?: React.ReactNode;
}

export default function AddNote({ onClick, children }: AddNoteProps) {
  const submit = useSubmit();
  return (
    <Button
      type="button"
      variant="filled"
      onClick={() => {
        submit(null, { method: "post", action: "/notes" });
        onClick?.();
      }}
    >
      {children}
    </Button>
  );
}
