import { Alert, Stack, Title } from "@mantine/core";
import { useNavigate, useParams, useSearchParams } from "react-router";

import LabelForm from "./LabelForm";
import { useLabel } from "./gql";

export default function EditLabel() {
  const { slug } = useParams<string>();
  const label = useLabel(slug ?? "");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("from") === "list" ? "list" : "label";

  return (
    <Stack>
      <Title order={2}>Edit label</Title>
      {label ? (
        <LabelForm
          label={label}
          returnTo={returnTo}
          onCancel={() =>
            void navigate(
              returnTo === "list" ? "/labels" : `/labels/${label.slug}`,
            )
          }
          key={label.uuid}
        />
      ) : (
        <Alert w="fit-content">Unknown label.</Alert>
      )}
    </Stack>
  );
}
