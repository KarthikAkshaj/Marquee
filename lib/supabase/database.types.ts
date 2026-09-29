export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          color: string
          created_at: string
          icon: string
          id: string
          is_public: boolean
          kind: Database["public"]["Enums"]["category_kind"]
          name: string
          position: number
          slug: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          is_public?: boolean
          kind?: Database["public"]["Enums"]["category_kind"]
          name: string
          position?: number
          slug: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          is_public?: boolean
          kind?: Database["public"]["Enums"]["category_kind"]
          name?: string
          position?: number
          slug?: string
          user_id?: string
        }
        Relationships: []
      }
      dismissed_picks: {
        Row: {
          created_at: string
          external_id: string
          genres: string[]
          source: Database["public"]["Enums"]["meta_source"]
          tags: string[]
          user_id: string
        }
        Insert: {
          created_at?: string
          external_id: string
          genres?: string[]
          source: Database["public"]["Enums"]["meta_source"]
          tags?: string[]
          user_id?: string
        }
        Update: {
          created_at?: string
          external_id?: string
          genres?: string[]
          source?: Database["public"]["Enums"]["meta_source"]
          tags?: string[]
          user_id?: string
        }
        Relationships: []
      }
      items: {
        Row: {
          accent_color: string | null
          backdrop_url: string | null
          category_id: string
          community_score: number | null
          cover_url: string | null
          created_at: string
          external_id: string | null
          finished_at: string | null
          format: Database["public"]["Enums"]["item_format"] | null
          genres: string[]
          id: string
          is_favorite: boolean
          notes: string | null
          progress_current: number
          progress_total: number | null
          rating: number | null
          runtime_minutes: number | null
          source: Database["public"]["Enums"]["meta_source"]
          started_at: string | null
          status: Database["public"]["Enums"]["item_status"]
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
          year: number | null
        }
        Insert: {
          accent_color?: string | null
          backdrop_url?: string | null
          category_id: string
          community_score?: number | null
          cover_url?: string | null
          created_at?: string
          external_id?: string | null
          finished_at?: string | null
          format?: Database["public"]["Enums"]["item_format"] | null
          genres?: string[]
          id?: string
          is_favorite?: boolean
          notes?: string | null
          progress_current?: number
          progress_total?: number | null
          rating?: number | null
          runtime_minutes?: number | null
          source?: Database["public"]["Enums"]["meta_source"]
          started_at?: string | null
          status?: Database["public"]["Enums"]["item_status"]
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
          year?: number | null
        }
        Update: {
          accent_color?: string | null
          backdrop_url?: string | null
          category_id?: string
          community_score?: number | null
          cover_url?: string | null
          created_at?: string
          external_id?: string | null
          finished_at?: string | null
          format?: Database["public"]["Enums"]["item_format"] | null
          genres?: string[]
          id?: string
          is_favorite?: boolean
          notes?: string | null
          progress_current?: number
          progress_total?: number | null
          rating?: number | null
          runtime_minutes?: number | null
          source?: Database["public"]["Enums"]["meta_source"]
          started_at?: string | null
          status?: Database["public"]["Enums"]["item_status"]
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          is_public: boolean
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          is_public?: boolean
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_public?: boolean
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      shelf_links: {
        Row: {
          category_id: string
          created_at: string
          id: string
          token: string
          user_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          token?: string
          user_id?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shelf_links_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      copies_of: {
        Args: { p_items: string[] }
        Returns: {
          copy_id: string
          copy_shelf: string
          shared_id: string
        }[]
      }
      copy_shared_title: {
        Args: {
          p_category: string
          p_item: string
          p_status: Database["public"]["Enums"]["item_status"]
          p_username: string
        }
        Returns: string
      }
      copy_shared_titles: {
        Args: {
          p_category: string
          p_items: string[]
          p_status: Database["public"]["Enums"]["item_status"]
          p_token: string
          p_username: string
        }
        Returns: Json
      }
      delete_account: { Args: never; Returns: undefined }
      fill_item_runtimes: { Args: { rows: Json }; Returns: number }
      fill_item_tags: { Args: { rows: Json }; Returns: number }
      import_titles: {
        Args: { batch_started: string; target_category: string; titles: Json }
        Returns: number
      }
      is_username_available: { Args: { candidate: string }; Returns: boolean }
      link_page: { Args: { p_token: string }; Returns: Json }
      public_page: {
        Args: { p_slug?: string; p_username: string }
        Returns: Json
      }
      public_profile: { Args: { p_username: string }; Returns: Json }
      public_shelf: {
        Args: { p_slug: string; p_username: string }
        Returns: Json
      }
      restore_shelves: { Args: { shelves: Json }; Returns: Json }
      restore_titles: {
        Args: { rows: Json; target_category: string }
        Returns: Json
      }
      shared_title: {
        Args: { p_item: string; p_username: string }
        Returns: Json
      }
      shared_titles: {
        Args: { p_items: string[]; p_token: string; p_username: string }
        Returns: Json
      }
      shelf_titles: { Args: { p_category: string }; Returns: Json }
      viewer_side: { Args: { p_category: string }; Returns: Json }
      visible_shelves: {
        Args: { p_token: string; p_username: string }
        Returns: string[]
      }
    }
    Enums: {
      category_kind: "anime" | "movie" | "series" | "game" | "custom"
      item_format:
        | "movie"
        | "tv"
        | "tv_short"
        | "ova"
        | "ona"
        | "special"
        | "manga"
        | "manhwa"
        | "manhua"
        | "light_novel"
        | "novel"
      item_status: "planned" | "in_progress" | "completed" | "dropped"
      meta_source: "tmdb" | "anilist" | "igdb" | "manual"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      category_kind: ["anime", "movie", "series", "game", "custom"],
      item_format: [
        "movie",
        "tv",
        "tv_short",
        "ova",
        "ona",
        "special",
        "manga",
        "manhwa",
        "manhua",
        "light_novel",
        "novel",
      ],
      item_status: ["planned", "in_progress", "completed", "dropped"],
      meta_source: ["tmdb", "anilist", "igdb", "manual"],
    },
  },
} as const
