import {
  ApolloClient,
  ApolloProvider,
  InMemoryCache,
  gql,
  useMutation,
  useQuery,
} from "@apollo/client";
import React, { useEffect, useState } from "react";
import { setAuthCookie } from "./auth";

import { Note } from "./Note";

const client = new ApolloClient({
  uri: "/graphql/",
  cache: new InMemoryCache({
    typePolicies: {
      Note: {
        keyFields: ["uuid"],
      },
    },
  }),
});

interface GqlProviderProps {
  children?: React.ReactNode;
}

export function GqlProvider({ children }: GqlProviderProps) {
  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}

const LOGIN = gql`
  mutation login($password: String!) {
    sessionKey: login(password: $password)
  }
`;

interface LoginResponse {
  sessionKey: string;
}

export type LoginStatus = "not-logged-in" | "logged-in" | "wrong-password";

export function useLogin(): [
  status: LoginStatus,
  login: (password: string) => void,
] {
  const [status, setStatus] = useState<LoginStatus>("not-logged-in");
  const [login, { data }] = useMutation<LoginResponse>(LOGIN);
  console.log(data);

  useEffect(() => {
    if (!data) return;
    if (data.sessionKey === null) {
      setStatus("wrong-password");
    } else {
      setAuthCookie(data.sessionKey);
      setStatus("logged-in");
    }
  }, [data]);

  return [
    status,
    (password) => {
      login({ variables: { password } });
    },
  ];
}

const LOGOUT = gql`
  mutation logout {
    logout
  }
`;

export function useLogout(): () => void {
  const [logout] = useMutation(LOGOUT);
  return () => logout();
}

const ALL_NOTES = gql`
  query allNotes {
    notes {
      uuid
      title
      text
      lastChanged
    }
  }
`;

interface AllNotesResponse {
  notes: readonly Note[];
}

export function useNotes(): readonly Note[] {
  const { data } = useQuery<AllNotesResponse>(ALL_NOTES);
  return data?.notes ?? [];
}

const CREATE_NOTE = gql`
  mutation createNote($title: String!, $text: String!) {
    note: createNote(title: $title, text: $text) {
      uuid
    }
  }
`;

interface CreateNoteResponse {
  note: Note;
}

export function useCreateNote(): [
  createNote: () => void,
  uuid: string | undefined,
] {
  const [create, { data }] = useMutation<CreateNoteResponse>(CREATE_NOTE, {
    refetchQueries: [ALL_NOTES],
  });
  function createNote() {
    create({ variables: { title: "", text: "" } });
  }
  return [createNote, data?.note.uuid];
}

const UPDATE_NOTE = gql`
  mutation updateNote($uuid: ID!, $title: String, $text: String) {
    updateNote(uuid: $uuid, title: $title, text: $text) {
      uuid
      title
      text
      lastChanged
    }
  }
`;

export function useUpdateNote(): (note: Note) => void {
  const [update] = useMutation(UPDATE_NOTE);
  function updateNote(newNote: Note) {
    update({
      variables: {
        uuid: newNote.uuid,
        title: newNote.title,
        text: newNote.text,
      },
      optimisticResponse: {
        updateNote: {
          __typename: "Note",
          uuid: newNote.uuid,
          title: newNote.title,
          text: newNote.text,
        },
      },
    });
  }
  return updateNote;
}

const DELETE_NOTE = gql`
  mutation deleteNote($uuid: ID!) {
    deleteNote(uuid: $uuid)
  }
`;

export function useDeleteNote(): (uuid: string) => void {
  const [delete_] = useMutation(DELETE_NOTE, {
    refetchQueries: [ALL_NOTES],
  });
  return (uuid) => delete_({ variables: { uuid } });
}
