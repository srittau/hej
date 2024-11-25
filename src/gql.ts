import {
  QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { AwesomeGraphQLClient, gql } from "awesome-graphql-client";
import { useCallback } from "react";
import { Params } from "react-router";

import { Note, NoteMeta } from "./Note";
import { setAuthCookie, unsetAuthCookie } from "./auth";

const REFETCH_MS = 60 * 1000;

export const queryClient = new QueryClient();
const gqlClient = new AwesomeGraphQLClient({ endpoint: "/graphql/" });

const LOGIN = gql`
  mutation login($password: String!) {
    sessionKey: login(password: $password)
  }
`;

type LoginVars = {
  password: string;
};

interface LoginResponse {
  sessionKey: string | null;
}

export async function login(password: string): Promise<boolean> {
  const response = await gqlClient.request<LoginResponse, LoginVars>(LOGIN, {
    password,
  });
  if (response.sessionKey === null) {
    return false;
  } else {
    setAuthCookie(response.sessionKey);
    return true;
  }
}

const LOGOUT = gql`
  mutation logout {
    logout
  }
`;

export async function logout(): Promise<void> {
  await gqlClient.request(LOGOUT);
  unsetAuthCookie();
  queryClient.clear();
}

const NOTE_META_FRAGMENT = gql`
  fragment NoteMetaFragment on Note {
    uuid
    title
    favorite
    creationDate
    lastChanged
  }
`;

const NOTE_FRAGMENT = gql`
  fragment NoteFragment on Note {
    uuid
    title
    favorite
    creationDate
    lastChanged
    text
  }
`;

const ALL_NOTES_META = gql`
  ${NOTE_META_FRAGMENT}
  query allNotesMeta {
    notes {
      ...NoteMetaFragment
    }
  }
`;

interface AllNotesMetaResponse {
  notes: readonly NoteMeta[];
}

const allNotesMetaQuery = {
  queryKey: ["notes", "list", "all-meta"],
  queryFn: () =>
    gqlClient
      .request<AllNotesMetaResponse>(ALL_NOTES_META)
      .then(({ notes }) => notes),
  refetchInterval: REFETCH_MS,
  refetchIntervalInBackground: false,
};

export function useNotesMeta(): readonly NoteMeta[] {
  const { data } = useQuery(allNotesMetaQuery);
  return data ?? [];
}

// TODO: Query that only fetches the latest notes.
export function useLatestNotes(count: number): readonly NoteMeta[] {
  const { data } = useQuery(allNotesMetaQuery);
  // We filter favorite notes, as they are already shown in the favorites
  // section.
  const sortedNotes = (data ?? [])
    .filter((n) => !n.favorite)
    .sort((n1, n2) => n2.lastChanged.localeCompare(n1.lastChanged));
  return sortedNotes.slice(0, count);
}

export const allNotesMetaLoader = (queryClient: QueryClient) => async () =>
  queryClient.ensureQueryData(allNotesMetaQuery);

// TODO: Query that only fetches favorite notes.
export function useFavoriteNotes(): readonly NoteMeta[] {
  const { data } = useQuery(allNotesMetaQuery);
  return (data ?? [])
    .filter((n) => n.favorite)
    .sort((n1, n2) => n1.title.localeCompare(n2.title));
}

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

const allNotesQuery = {
  queryKey: ["notes", "list", "all"],
  queryFn: () =>
    gqlClient.request<AllNotesResponse>(ALL_NOTES).then(({ notes }) => notes),
  refetchInterval: REFETCH_MS,
  refetchIntervalInBackground: false,
};

// TODO: Query that only fetches the note with the given uuid.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const lastestNotesLoader = (queryClient: QueryClient, count: number) =>
  allNotesMetaLoader(queryClient);

// TODO: Query that only fetches the note with the given uuid.
export function useNote(uuid: string): Note | undefined {
  const { data } = useQuery(allNotesQuery);
  return (data ?? []).find((n) => n.uuid === uuid);
}

// TODO: Query that only fetches the note with the given uuid.
export const noteLoader =
  (queryClient: QueryClient) =>
  async ({ params }: { params: Params<string> }): Promise<Note | undefined> => {
    const notes = await queryClient.ensureQueryData(allNotesQuery);
    return notes.find((n) => n.uuid === params.uuid);
  };

const CREATE_NOTE = gql`
  ${NOTE_FRAGMENT}
  mutation createNote($title: String!, $text: String!) {
    note: createNote(title: $title, text: $text) {
      ...NoteFragment
    }
  }
`;

type CreateNoteVars = {
  title: string;
  text: string;
};

interface CreateNoteResponse {
  note: Note;
}

export async function createNote() {
  const { note } = await gqlClient.request<CreateNoteResponse, CreateNoteVars>(
    CREATE_NOTE,
    {
      title: "",
      text: "",
    },
  );
  await queryClient.invalidateQueries({ queryKey: ["notes", "list"] });
  return note;
}

const UPDATE_NOTE = gql`
  ${NOTE_FRAGMENT}
  mutation updateNote($uuid: ID!, $title: String, $text: String) {
    note: updateNote(uuid: $uuid, title: $title, text: $text) {
      ...NoteFragment
    }
  }
`;

interface NoteResponse {
  note: Note;
}

type UpdateNoteVars = {
  uuid: string;
  title?: string;
  text?: string;
};

export function useUpdateNoteInCache(): (
  uuid: string,
  title?: string,
  text?: string,
  favorite?: boolean,
) => void {
  const client = useQueryClient();
  return useCallback(
    (uuid: string, title?: string, text?: string, favorite?: boolean) => {
      client.setQueriesData<Note>(
        { queryKey: ["notes", "details", uuid] },
        (oldNote) =>
          oldNote ? updateNote(oldNote, title, text, favorite) : undefined,
      );
      void client.invalidateQueries({ queryKey: ["notes", "list"] });
    },
    [client],
  );
}

function updateNote(
  note: Note,
  title?: string,
  text?: string,
  favorite?: boolean,
): Note {
  const newNote = { ...note };
  if (title !== undefined) newNote.title = title;
  if (text !== undefined) newNote.text = text;
  if (favorite !== undefined) newNote.favorite = favorite;
  return newNote;
}

export function useUpdateNote(
  uuid: string,
): [
  updateNote: (data: { title?: string; text?: string }) => Promise<Note>,
  loading: boolean,
] {
  const updateCache = useUpdateNoteInCache();
  const mutation = useMutation({
    mutationFn: ({ title, text }: { title?: string; text?: string }) =>
      gqlClient.request<NoteResponse, UpdateNoteVars>(UPDATE_NOTE, {
        uuid,
        title,
        text,
      }),
    onSuccess({ note }) {
      updateCache(uuid, note.title, note.text);
    },
  });

  const mutateAsync = mutation.mutateAsync;
  const updateNote = useCallback(
    async (data: { title?: string; text?: string }) => {
      const { note } = await mutateAsync(data);
      return note;
    },
    [mutateAsync],
  );

  return [updateNote, mutation.isPending];
}

const MARK_NOTE_AS_FAVORITE = gql`
  ${NOTE_FRAGMENT}
  mutation markNoteAsFavorite($uuid: ID!, $favorite: Boolean!) {
    note: markNoteAsFavorite(uuid: $uuid, favorite: $favorite) {
      ...NoteFragment
    }
  }
`;

type MarkNoteAsFavoriteVars = {
  uuid: string;
  favorite: boolean;
};

export function useMarkNoteAsFavorite(
  uuid: string,
): [updateNote: (favorite: boolean) => Promise<Note>, loading: boolean] {
  const updateCache = useUpdateNoteInCache();
  const mutation = useMutation({
    mutationFn: (favorite: boolean) =>
      gqlClient.request<NoteResponse, MarkNoteAsFavoriteVars>(
        MARK_NOTE_AS_FAVORITE,
        { uuid, favorite },
      ),
    onSuccess({ note }) {
      updateCache(uuid, note.title, note.text);
    },
  });

  return [
    async (favorite: boolean) => {
      const { note } = await mutation.mutateAsync(favorite);
      return note;
    },
    mutation.isPending,
  ];
}

const DELETE_NOTE = gql`
  mutation deleteNote($uuid: ID!) {
    deleteNote(uuid: $uuid)
  }
`;

type DeleteNoteVars = {
  uuid: string;
};

export async function deleteNote(uuid: string): Promise<boolean> {
  // @ts-expect-error Type 'boolean' does not satisfy the constraint 'Record<string, any>'
  const success = await gqlClient.request<boolean, DeleteNoteVars>(
    DELETE_NOTE,
    {
      uuid,
    },
  );
  await queryClient.invalidateQueries({ queryKey: ["notes", "list"] });
  return success;
}
