import { faCircleQuestion } from "@fortawesome/free-regular-svg-icons";
import { Anchor, Stack, Title } from "@mantine/core";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";

import EmptyState from "./EmptyState";
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
              { replace: true },
            )
          }
          key={label.uuid}
        />
      ) : (
        <EmptyState icon={faCircleQuestion} message="Unknown label">
          It may have been renamed or deleted.{" "}
          <Anchor component={Link} to="/labels" inherit>
            Show all labels
          </Anchor>
        </EmptyState>
      )}
    </Stack>
  );
}
