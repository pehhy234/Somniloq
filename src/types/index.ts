export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          avatar_url: string | null
          is_active: boolean
          is_admin: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username?: string
          avatar_url?: string | null
          is_active?: boolean
          is_admin?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          username?: string
          avatar_url?: string | null
          is_active?: boolean
          is_admin?: boolean
          updated_at?: string
        }
      }
      characters: {
        Row: {
          id: string
          author_id: string
          name: string
          description: string
          greeting: string
          prompt: string
          avatar_url: string | null
          tags: string[]
          is_public: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          author_id: string
          name: string
          description?: string
          greeting?: string
          prompt?: string
          avatar_url?: string | null
          tags?: string[]
          is_public?: boolean
        }
        Update: {
          name?: string
          description?: string
          greeting?: string
          prompt?: string
          avatar_url?: string | null
          tags?: string[]
          is_public?: boolean
        }
      }
      conversations: {
        Row: {
          id: string
          user_id: string
          character_id: string
          bg_image_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          character_id: string
          bg_image_url?: string | null
        }
        Update: {
          model_id?: string | null
          bg_image_url?: string | null
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          role: 'user' | 'assistant'
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          role: 'user' | 'assistant'
          content: string
          created_at?: string
        }
        Update: {
          content?: string
        }
      }
      models: {
        Row: {
          id: string
          name: string
          description: string | null
          provider: string
          model_id: string
          category: string
          is_active: boolean
          api_key_name: string | null
          base_url: string | null
          icon_url: string | null
          tags: string[] | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          provider: string
          model_id: string
          category?: string
          is_active?: boolean
          api_key_name?: string | null
          base_url?: string | null
          icon_url?: string | null
          tags?: string[] | null
          created_at?: string
        }
        Update: {
          name?: string
          description?: string | null
          provider?: string
          model_id?: string
          category?: string
          is_active?: boolean
          api_key_name?: string | null
          base_url?: string | null
          icon_url?: string | null
          tags?: string[] | null
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

// Convenient shorthand types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Character = Database['public']['Tables']['characters']['Row']
export type Conversation = Database['public']['Tables']['conversations']['Row']
export type Message = Database['public']['Tables']['messages']['Row']
export type Model = Database['public']['Tables']['models']['Row']

// Extended types for joined queries
export type ConversationWithCharacter = Conversation & {
  character: Pick<Character, 'id' | 'name' | 'avatar_url' | 'description' | 'greeting' | 'prompt'>
}

export type CharacterWithAuthor = Character & {
  author: Pick<Profile, 'id' | 'username' | 'avatar_url'>
}
