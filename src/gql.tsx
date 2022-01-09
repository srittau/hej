import {
  ApolloClient,
  ApolloProvider,
  gql,
  InMemoryCache,
  useMutation,
  useQuery,
} from "@apollo/client";
import React from "react";

import { Note } from "./Note";

const client = new ApolloClient({
  uri: "/graphql/",
  cache: new InMemoryCache(),
});

interface GqlProviderProps {
  children?: React.ReactNode;
}

export function GqlProvider({ children }: GqlProviderProps) {
  return <ApolloProvider client={client}>{children}</ApolloProvider>;
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
  const [update] = useMutation(UPDATE_NOTE, {
    refetchQueries: [ALL_NOTES],
  });
  function updateNote(newNote: Note) {
    update({
      variables: {
        uuid: newNote.uuid,
        title: newNote.title,
        text: newNote.text,
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
