import { Button, Container, Paper, PasswordInput, Stack } from "@mantine/core";
import { useForm } from "@mantine/form";
import { Form, useActionData } from "react-router";
import { LoginError } from "./Router";

export default function LoginPage() {
  const form = useForm({
    initialValues: { password: "" },
  });
  const status = useActionData<LoginError>();

  return (
    <Container size="420" my={40}>
      <Paper p="xl" withBorder className="login-page">
        <Form method="POST" action="/login">
          <Stack>
            <PasswordInput
              label="Password"
              name="password"
              required
              autoComplete="current-password"
              error={
                status === "error"
                  ? "Internal error"
                  : form.errors.password || status === "invalid"
                    ? "Invalid password"
                    : null
              }
            />
            <Button variant="filled" type="submit">
              Login
            </Button>
          </Stack>
        </Form>
      </Paper>
    </Container>
  );
}
