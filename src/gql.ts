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
import { Label } from "./Label";

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

const GQL_LABEL_FRAGMENT = gql`
  fragment LabelFragment on Label {
    uuid
    name
    slug
    color
    favorite
  }
`;

const GQL_ALL_LABELS = gql`
  query AllLabels {
    labels {
      ...LabelFragment
    }
  }
  ${GQL_LABEL_FRAGMENT}
`;

interface AllLabelsResponse {
  labels: Label[];
}

const allLabelsQuery = {
  queryKey: ["labels", "list", "all"],
  queryFn: () =>
    gqlClient
      .request<AllLabelsResponse>(GQL_ALL_LABELS)
      .then(({ labels }) => labels),
  refetchInterval: REFETCH_MS,
  refetchIntervalInBackground: false,
};

export function useAllLabels(): [
  "error" | "success" | "pending",
  readonly Label[],
] {
  const { status, data } = useQuery(allLabelsQuery);
  return [status, data ?? []];
}

export const allLabelsLoader = (queryClient: QueryClient) => async () =>
  queryClient.ensureQueryData(allLabelsQuery);

const GQL_FAVORITE_LABELS = gql`
  query FavoriteLabels {
    labels(favorites: true) {
      ...LabelFragment
    }
  }
  ${GQL_LABEL_FRAGMENT}
`;

const favoriteLabelsQuery = {
  queryKey: ["labels", "list", "favorites"],
  queryFn: () =>
    gqlClient
      .request<AllLabelsResponse>(GQL_FAVORITE_LABELS)
      .then(({ labels }) => labels),
  refetchInterval: REFETCH_MS,
  refetchIntervalInBackground: false,
};

export function useFavoriteLabels(): readonly Label[] {
  const { data } = useQuery(favoriteLabelsQuery);
  return [...(data ?? [])].sort((l1, l2) => l1.name.localeCompare(l2.name));
}

const GQL_LABEL_BY_SLUG = gql`
  query LabelBySlug($slug: String!) {
    labels(slug: $slug) {
      ...LabelFragment
    }
  }
  ${GQL_LABEL_FRAGMENT}
`;

type LabelBySlugVars = {
  slug: string;
};

const labelQuery = (slug: string) => ({
  queryKey: ["labels", "detail", slug],
  queryFn: () =>
    gqlClient
      .request<AllLabelsResponse, LabelBySlugVars>(GQL_LABEL_BY_SLUG, { slug })
      .then(({ labels }) => labels[0] ?? null),
});

export function useLabel(slug: string): Label | null {
  const { data } = useQuery(labelQuery(slug));
  return data ?? null;
}

export const labelLoader =
  (queryClient: QueryClient) =>
  async ({ params }: { params: Params<string> }): Promise<Label | null> =>
    queryClient.ensureQueryData({
      ...labelQuery(params.slug ?? ""),
      revalidateIfStale: true,
    });

const GQL_CREATE_LABEL = gql`
  mutation CreateLabel($name: String!, $color: Color!, $favorite: Boolean) {
    label: createLabel(name: $name, color: $color, favorite: $favorite) {
      __typename
      ...LabelFragment
      ... on UserError {
        message
      }
    }
  }
  ${GQL_LABEL_FRAGMENT}
`;

type CreateLabelVars = {
  name: string;
  color: string;
  favorite?: boolean;
};

interface CreateLabelResponse {
  label:
    | ({ __typename: "Label" } & Label)
    | { __typename: "DuplicateItemError" | "ValueError"; message: string };
}

export type CreateLabelError = "duplicate" | "invalid";

export async function createLabel(
  name: string,
  color: string,
  favorite = false,
): Promise<Label | CreateLabelError> {
  const { label } = await gqlClient.request<
    CreateLabelResponse,
    CreateLabelVars
  >(GQL_CREATE_LABEL, { name, color, favorite });
  switch (label.__typename) {
    case "DuplicateItemError":
      return "duplicate";
    case "ValueError":
      return "invalid";
  }
  await queryClient.invalidateQueries({ queryKey: ["labels", "list"] });
  return label;
}

const GQL_UPDATE_LABEL = gql`
  mutation UpdateLabel(
    $uuid: ID!
    $name: String
    $color: Color
    $favorite: Boolean
  ) {
    label: updateLabel(
      uuid: $uuid
      name: $name
      color: $color
      favorite: $favorite
    ) {
      __typename
      ...LabelFragment
      ... on UserError {
        message
      }
    }
  }
  ${GQL_LABEL_FRAGMENT}
`;

type UpdateLabelVars = {
  uuid: string;
  name?: string;
  color?: string;
  favorite?: boolean;
};

interface UpdateLabelResponse {
  label:
    | ({ __typename: "Label" } & Label)
    | {
        __typename: "UnknownItemError" | "DuplicateItemError" | "ValueError";
        message: string;
      };
}

export type UpdateLabelError = CreateLabelError | "unknown";

export async function updateLabel(
  uuid: string,
  values: { name?: string; color?: string; favorite?: boolean },
): Promise<Label | UpdateLabelError> {
  const { label } = await gqlClient.request<
    UpdateLabelResponse,
    UpdateLabelVars
  >(GQL_UPDATE_LABEL, { uuid, ...values });
  switch (label.__typename) {
    case "UnknownItemError":
      return "unknown";
    case "DuplicateItemError":
      return "duplicate";
    case "ValueError":
      return "invalid";
  }
  await queryClient.invalidateQueries({ queryKey: ["labels", "list"] });
  // Don't refetch the label details right away: If the slug changed, the
  // query for the old slug would return no label, causing the editor to
  // unmount before the route action can redirect.
  await queryClient.invalidateQueries({
    queryKey: ["labels", "detail"],
    refetchType: "none",
  });
  queryClient.setQueryData(labelQuery(label.slug).queryKey, label);
  await queryClient.invalidateQueries({ queryKey: ["notes"] });
  return label;
}

const GQL_DELETE_LABEL = gql`
  mutation DeleteLabel($uuid: ID!) {
    deleteLabel(uuid: $uuid)
  }
`;

type DeleteLabelVars = {
  uuid: string;
};

interface DeleteLabelResponse {
  deleteLabel: boolean;
}

export async function deleteLabel(uuid: string): Promise<boolean> {
  const { deleteLabel } = await gqlClient.request<
    DeleteLabelResponse,
    DeleteLabelVars
  >(GQL_DELETE_LABEL, { uuid });
  await queryClient.invalidateQueries({ queryKey: ["labels"] });
  await queryClient.invalidateQueries({ queryKey: ["notes"] });
  return deleteLabel;
}

const GQL_NOTE_META_FRAGMENT = gql`
  fragment NoteMetaFragment on Note {
    uuid
    title
    favorite
    creationDate
    lastChanged
  }
`;

const GQL_NOTE_FRAGMENT = gql`
  fragment NoteFragment on Note {
    uuid
    title
    favorite
    creationDate
    lastChanged
    text
    labels {
      ...LabelFragment
    }
  }
  ${GQL_LABEL_FRAGMENT}
`;

const GQL_ALL_NOTES_META = gql`
  ${GQL_NOTE_META_FRAGMENT}
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
      .request<AllNotesMetaResponse>(GQL_ALL_NOTES_META)
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
  ${GQL_NOTE_FRAGMENT}
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

const GQL_CREATE_NOTE = gql`
  ${GQL_NOTE_FRAGMENT}
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
    GQL_CREATE_NOTE,
    {
      title: "",
      text: "",
    },
  );
  await queryClient.invalidateQueries({ queryKey: ["notes", "list"] });
  return note;
}

const UPDATE_NOTE = gql`
  ${GQL_NOTE_FRAGMENT}
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
  ${GQL_NOTE_FRAGMENT}
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

const GQL_ATTACH_NOTE_LABEL = gql`
  ${GQL_NOTE_FRAGMENT}
  mutation AttachNoteLabel($noteUUID: ID!, $labelUUID: ID!) {
    note: attachNoteLabel(noteUUID: $noteUUID, labelUUID: $labelUUID) {
      __typename
      ...NoteFragment
    }
  }
`;

const GQL_DETACH_NOTE_LABEL = gql`
  ${GQL_NOTE_FRAGMENT}
  mutation DetachNoteLabel($noteUUID: ID!, $labelUUID: ID!) {
    note: detachNoteLabel(noteUUID: $noteUUID, labelUUID: $labelUUID) {
      __typename
      ...NoteFragment
    }
  }
`;

type NoteLabelVars = {
  noteUUID: string;
  labelUUID: string;
};

interface NoteResultResponse {
  note: ({ __typename: "Note" } & Note) | { __typename: "UnknownItemError" };
}

/** Attach labels to or detach labels from a note. */
export function useNoteLabels(
  noteUUID: string,
): [
  attach: (labelUUID: string) => Promise<void>,
  detach: (labelUUID: string) => Promise<void>,
  loading: boolean,
] {
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({
      labelUUID,
      attach,
    }: {
      labelUUID: string;
      attach: boolean;
    }) =>
      gqlClient.request<NoteResultResponse, NoteLabelVars>(
        attach ? GQL_ATTACH_NOTE_LABEL : GQL_DETACH_NOTE_LABEL,
        { noteUUID, labelUUID },
      ),
    async onSuccess({ note }) {
      if (note.__typename === "Note") {
        client.setQueryData<readonly Note[]>(allNotesQuery.queryKey, (notes) =>
          notes?.map((n) =>
            n.uuid === noteUUID ? { ...n, labels: note.labels } : n,
          ),
        );
      } else {
        // The note or label is gone. Refresh our stale data.
        await client.invalidateQueries({ queryKey: ["notes"] });
      }
      await client.invalidateQueries({ queryKey: ["labels"] });
    },
  });

  return [
    async (labelUUID: string) => {
      await mutation.mutateAsync({ labelUUID, attach: true });
    },
    async (labelUUID: string) => {
      await mutation.mutateAsync({ labelUUID, attach: false });
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
