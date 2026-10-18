import { faEdit } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Alert, Button, Group, Paper, Stack, Title } from "@mantine/core";
import { Link, useParams } from "react-router";

import FavoriteIcon from "./FavoriteIcon";
import { LabelChip } from "./LabelChip";
import classes from "./LabelView.module.css";
import { useLabel } from "./gql";

export default function LabelView() {
  const { slug } = useParams<string>();
  const label = useLabel(slug ?? "");

  if (!label) return <Alert w="fit-content">Unknown label.</Alert>;

  return (
    <Paper shadow="xs" p="md">
      <Stack gap="xs" align="flex-start">
        <Group justify="space-between" wrap="nowrap" w="100%">
          <Group gap="sm" wrap="nowrap">
            {label.favorite && (
              <span
                title="Favorite label"
                aria-label="Favorite label"
                className={classes.favoriteIcon}
              >
                <FavoriteIcon starred />
              </span>
            )}
            <Title order={1}>{label.name}</Title>
          </Group>
          <Button
            component={Link}
            to={`/labels/${label.slug}/editor`}
            variant="light"
            leftSection={<FontAwesomeIcon icon={faEdit} />}
          >
            Edit label
          </Button>
        </Group>
        <LabelChip label={label} />
      </Stack>
    </Paper>
  );
}
