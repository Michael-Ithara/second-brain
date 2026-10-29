export interface Profile {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    created_at: string;
}

export interface Space {
    id: string;
    user_id: string;
    name: string;
    description: string | null;
    created_at: string;
}

export interface Note {
    id: string;
    space_id: string;
    user_id: string;
    title: string;
    content: string;
    source_url: string | null;
    created_at: string;
    updated_at: string;
}

// Whether a note can be found by chat search yet.
// 'embedding' = request in flight, 'missing' = no vector stored (failed or never ran).
export type EmbedStatus = 'embedding' | 'missing'
