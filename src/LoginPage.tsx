import { Button, Container, Paper, PasswordInput, Stack } from "@mantine/core";
import { useForm } from "@mantine/form";

import { useLogin } from "./gql";

export default function LoginPage() {
  const form = useForm({
    initialValues: {
      password: "",
    },

    validate: {
      password: (value) => (value.length === 0 ? "Password is required" : null),
    },
  });
  const [loginStatus, login] = useLogin();

  return (
    <Container size="420" my={40}>
      <Paper p="xl" withBorder className="login-page">
        <form onSubmit={form.onSubmit(() => login(form.values.password))}>
          <Stack>
            <PasswordInput
              label="Password"
              value={form.values.password}
              required
              autoComplete="current-password"
              error={
                (form.errors.password || loginStatus === "wrong-password") &&
                "Invalid password"
              }
              onChange={(evt) =>
                form.setFieldValue("password", evt.currentTarget.value)
              }
            />
            <Button variant="filled" type="submit">
              Login
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}
