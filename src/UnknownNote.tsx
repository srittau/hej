import { faCircleQuestion } from "@fortawesome/free-regular-svg-icons";
import { Anchor } from "@mantine/core";
import { Link } from "react-router";

import EmptyState from "./EmptyState";

/** Shown instead of a note that doesn't exist. */
export default function UnknownNote() {
  return (
    <EmptyState icon={faCircleQuestion} message="Unknown note">
      It may have been deleted.{" "}
      <Anchor component={Link} to="/notes" inherit>
        Show all notes
      </Anchor>
    </EmptyState>
  );
}
