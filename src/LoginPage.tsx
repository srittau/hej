import { Button, Container, Paper, PasswordInput, Stack } from "@mantine/core";
import { useForm } from "@mantine/form";
import { Form, useActionData } from "react-router-dom";

export default function LoginPage() {
  const form = useForm({
    initialValues: { password: "" },
  });
  const status = useActionData();

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
                (form.errors.password || status === false) && "Invalid password"
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
