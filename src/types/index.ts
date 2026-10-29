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

// Whether chat search sees a note's current text.
// 'pending' = edited, re-embed scheduled; 'embedding' = request in flight;
// 'stale' = search has an older version; 'missing' = search can't see it at all.
export type EmbedStatus = 'pending' | 'embedding' | 'stale' | 'missing'
