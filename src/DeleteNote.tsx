import { Button, Group, Modal, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useParams, useSubmit } from "react-router-dom";

interface DeleteNoteProps {
  className?: string;
}

export default function DeleteNote({ className }: DeleteNoteProps) {
  const { uuid } = useParams<string>();
  const submit = useSubmit();
  const [opened, { open, close }] = useDisclosure(false);

  return (
    <>
      <Modal opened={opened} withCloseButton={false} onClose={close}>
        <Stack>
          <Text size="lg">Delete this note?</Text>
          <Group>
            <Button variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button
              variant="filled"
              onClick={() => {
                close();
                submit(null, {
                  method: "delete",
                  action: `/notes/${uuid}`,
                });
              }}
            >
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Button
        variant="light"
        type="button"
        className={className}
        onClick={open}
      >
        Delete note
      </Button>
    </>
  );
}
