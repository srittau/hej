import {
  QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
// eslint-disable-next-line import/no-unresolved
import { GraphQLClient, Variables, gql } from "graphql-request";
import { useCallback, useEffect, useState } from "react";

import { Note } from "./Note";
import { setAuthCookie } from "./auth";

const REFETCH_MS = 60 * 1000;

export const queryClient = new QueryClient();
const gqlClient = new GraphQLClient("/graphql/");

const LOGIN = gql`
  mutation login($password: String!) {
    sessionKey: login(password: $password)
  }
`;

interface LoginVars extends Variables {
  password: string;
}

interface LoginResponse {
  sessionKey: string | null;
}

export type LoginStatus = "not-logged-in" | "logged-in" | "wrong-password";

export function useLogin(): [
  status: LoginStatus,
  login: (password: string) => void,
] {
  const [status, setStatus] = useState<LoginStatus>("not-logged-in");
  const mutation = useMutation((password: string) =>
    gqlClient.request<LoginResponse, LoginVars>(LOGIN, { password }),
  );

  useEffect(() => {
    if (!mutation.data) return;
    if (mutation.data.sessionKey === null) {
      setStatus("wrong-password");
    } else {
      setAuthCookie(mutation.data.sessionKey);
      setStatus("logged-in");
    }
  }, [mutation.data]);

  return [
    status,
    (password) => {
      mutation.mutate(password);
    },
  ];
}

const LOGOUT = gql`
  mutation logout {
    logout
  }
`;

export function useLogout(): () => void {
  const mutation = useMutation(() => gqlClient.request<unknown>(LOGOUT));
  return () => mutation.mutate();
}

const NOTE_FRAGMENT = gql`
  fragment NoteFragment on Note {
    uuid
    title
    text
    lastChanged
  }
`;

const ALL_NOTES = gql`
  ${NOTE_FRAGMENT}
  query allNotes {
    notes {
      ...NoteFragment
    }
  }
`;

interface AllNotesResponse {
  notes: readonly Note[];
}

export function useNotes(): readonly Note[] {
  const { data } = useQuery({
    queryKey: ["notes", "list", "all"],
    queryFn: () =>
      gqlClient.request<AllNotesResponse>(ALL_NOTES).then(({ notes }) => notes),
    refetchInterval: REFETCH_MS,
    refetchIntervalInBackground: false,
  });
  return data ?? [];
}

const CREATE_NOTE = gql`
  ${NOTE_FRAGMENT}
  mutation createNote($title: String!, $text: String!) {
    note: createNote(title: $title, text: $text) {
      ...NoteFragment
    }
  }
`;

interface CreateNoteVars extends Variables {
  title: string;
  text: string;
}

interface CreateNoteResponse {
  note: Note;
}

export function useCreateNote(): () => Promise<Note> {
  const client = useQueryClient();

  const mutation = useMutation(
    () =>
      gqlClient.request<CreateNoteResponse, CreateNoteVars>(CREATE_NOTE, {
        title: "",
        text: "",
      }),
    {
      onSuccess() {
        void client.invalidateQueries(["notes", "list"]);
      },
    },
  );

  return async () => {
    const { note } = await mutation.mutateAsync();
    return note;
  };
}

const UPDATE_NOTE = gql`
  ${NOTE_FRAGMENT}
  mutation updateNote($uuid: ID!, $title: String, $text: String) {
    note: updateNote(uuid: $uuid, title: $title, text: $text) {
      ...NoteFragment
    }
  }
`;

interface UpdateNoteResponse {
  note: Note;
}

interface UpdateNoteVars extends Variables {
  uuid: string;
  title?: string;
  text?: string;
}

export function useUpdateNoteInCache(): (newNote: Note) => void {
  const client = useQueryClient();
  return useCallback(
    (newNote: Note) => {
      client.setQueriesData<Note>(["notes", "details", newNote.uuid], newNote);
      client.setQueriesData<Note[]>(["notes", "list"], (oldData) => {
        if (!oldData) return oldData;
        return oldData.map((note: Note) =>
          note.uuid === newNote.uuid ? newNote : note,
        );
      });
    },
    [client],
  );
}

export function useUpdateNote(): [
  updateNote: (note: Note) => Promise<Note>,
  loading: boolean,
] {
  const updateCache = useUpdateNoteInCache();
  const mutation = useMutation(
    (newNote: Note) =>
      gqlClient.request<UpdateNoteResponse, UpdateNoteVars>(UPDATE_NOTE, {
        uuid: newNote.uuid,
        title: newNote.title,
        text: newNote.text,
      }),
    {
      onSuccess({ note: newNote }) {
        updateCache(newNote);
      },
    },
  );

  const updateNote = useCallback(
    async (newNote: Note) => {
      const { note } = await mutation.mutateAsync(newNote);
      return note;
    },
    [mutation],
  );

  return [updateNote, mutation.isLoading];
}

const DELETE_NOTE = gql`
  mutation deleteNote($uuid: ID!) {
    deleteNote(uuid: $uuid)
  }
`;

interface DeleteNoteVars extends Variables {
  uuid: string;
}

export function useDeleteNote(): (uuid: string) => void {
  const client = useQueryClient();
  const mutation = useMutation(
    (uuid: string) =>
      gqlClient.request<boolean, DeleteNoteVars>(DELETE_NOTE, { uuid }),
    {
      onSuccess() {
        void client.invalidateQueries(["notes", "list"]);
      },
    },
  );
  return (uuid) => mutation.mutate(uuid);
}