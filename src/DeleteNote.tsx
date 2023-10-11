import { Button, Group, Modal, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";

interface DeleteNoteProps {
  className?: string;
  onDelete?: () => void;
}

export default function DeleteNote({ className, onDelete }: DeleteNoteProps) {
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
                onDelete?.();
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
