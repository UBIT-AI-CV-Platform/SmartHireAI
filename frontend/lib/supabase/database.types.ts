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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      applications: {
        Row: {
          applied_at: string
          candidate_email: string | null
          candidate_id: string
          candidate_name: string | null
          cover_note: string | null
          cv_id: string | null
          cv_snapshot: Json | null
          id: string
          job_id: string
          match_score: number | null
          recruiter_notes: string | null
          recruiter_rating: number | null
          status: Database["public"]["Enums"]["application_status"]
          updated_at: string
        }
        Insert: {
          applied_at?: string
          candidate_email?: string | null
          candidate_id: string
          candidate_name?: string | null
          cover_note?: string | null
          cv_id?: string | null
          cv_snapshot?: Json | null
          id?: string
          job_id: string
          match_score?: number | null
          recruiter_notes?: string | null
          recruiter_rating?: number | null
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
        }
        Update: {
          applied_at?: string
          candidate_email?: string | null
          candidate_id?: string
          candidate_name?: string | null
          cover_note?: string | null
          cv_id?: string | null
          cv_snapshot?: Json | null
          id?: string
          job_id?: string
          match_score?: number | null
          recruiter_notes?: string | null
          recruiter_rating?: number | null
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      awards: {
        Row: {
          award_date: string | null
          created_at: string
          id: number
          issuer: string | null
          name: string
          profile_id: string
        }
        Insert: {
          award_date?: string | null
          created_at?: string
          id?: never
          issuer?: string | null
          name: string
          profile_id: string
        }
        Update: {
          award_date?: string | null
          created_at?: string
          id?: never
          issuer?: string | null
          name?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "awards_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      certifications: {
        Row: {
          created_at: string
          id: number
          issue_date: string | null
          issuer: string | null
          name: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          issue_date?: string | null
          issuer?: string | null
          name: string
          profile_id: string
        }
        Update: {
          created_at?: string
          id?: never
          issue_date?: string | null
          issuer?: string | null
          name?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          completion_date: string | null
          created_at: string
          id: number
          name: string
          profile_id: string
          provider: string | null
        }
        Insert: {
          completion_date?: string | null
          created_at?: string
          id?: never
          name: string
          profile_id: string
          provider?: string | null
        }
        Update: {
          completion_date?: string | null
          created_at?: string
          id?: never
          name?: string
          profile_id?: string
          provider?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          candidate_email: string | null
          candidate_id: string
          candidate_name: string | null
          candidate_unread: number
          company: string | null
          created_at: string
          id: string
          job_id: string | null
          job_title: string | null
          last_message: string | null
          last_message_at: string | null
          last_sender_id: string | null
          recruiter_email: string | null
          recruiter_id: string
          recruiter_name: string | null
          recruiter_unread: number
          updated_at: string
        }
        Insert: {
          candidate_email?: string | null
          candidate_id: string
          candidate_name?: string | null
          candidate_unread?: number
          company?: string | null
          created_at?: string
          id?: string
          job_id?: string | null
          job_title?: string | null
          last_message?: string | null
          last_message_at?: string | null
          last_sender_id?: string | null
          recruiter_email?: string | null
          recruiter_id: string
          recruiter_name?: string | null
          recruiter_unread?: number
          updated_at?: string
        }
        Update: {
          candidate_email?: string | null
          candidate_id?: string
          candidate_name?: string | null
          candidate_unread?: number
          company?: string | null
          created_at?: string
          id?: string
          job_id?: string | null
          job_title?: string | null
          last_message?: string | null
          last_message_at?: string | null
          last_sender_id?: string | null
          recruiter_email?: string | null
          recruiter_id?: string
          recruiter_name?: string | null
          recruiter_unread?: number
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string | null
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean
          kind: string
          meta: Json | null
          sender_id: string
        }
        Insert: {
          body?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          kind?: string
          meta?: Json | null
          sender_id: string
        }
        Update: {
          body?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          kind?: string
          meta?: Json | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      cover_letters: {
        Row: {
          company: string | null
          content: string | null
          created_at: string
          id: string
          is_favorite: boolean
          profile_id: string
          target_role: string | null
          tone: string | null
          updated_at: string
        }
        Insert: {
          company?: string | null
          content?: string | null
          created_at?: string
          id?: string
          is_favorite?: boolean
          profile_id: string
          target_role?: string | null
          tone?: string | null
          updated_at?: string
        }
        Update: {
          company?: string | null
          content?: string | null
          created_at?: string
          id?: string
          is_favorite?: boolean
          profile_id?: string
          target_role?: string | null
          tone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cover_letters_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_sections: {
        Row: {
          created_at: string
          heading: string
          id: number
          items: Json
          profile_id: string
        }
        Insert: {
          created_at?: string
          heading: string
          id?: never
          items?: Json
          profile_id: string
        }
        Update: {
          created_at?: string
          heading?: string
          id?: never
          items?: Json
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_sections_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cvs: {
        Row: {
          ats_score: number | null
          content: Json | null
          created_at: string
          id: string
          is_favorite: boolean
          profile_id: string
          suggestions: Json | null
          target_role: string | null
          tone: string | null
          updated_at: string
        }
        Insert: {
          ats_score?: number | null
          content?: Json | null
          created_at?: string
          id?: string
          is_favorite?: boolean
          profile_id: string
          suggestions?: Json | null
          target_role?: string | null
          tone?: string | null
          updated_at?: string
        }
        Update: {
          ats_score?: number | null
          content?: Json | null
          created_at?: string
          id?: string
          is_favorite?: boolean
          profile_id?: string
          suggestions?: Json | null
          target_role?: string | null
          tone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cvs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      education: {
        Row: {
          created_at: string
          degree: string
          end_year: string | null
          id: number
          institute: string
          profile_id: string
          start_year: string | null
        }
        Insert: {
          created_at?: string
          degree: string
          end_year?: string | null
          id?: never
          institute: string
          profile_id: string
          start_year?: string | null
        }
        Update: {
          created_at?: string
          degree?: string
          end_year?: string | null
          id?: never
          institute?: string
          profile_id?: string
          start_year?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "education_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_sessions: {
        Row: {
          created_at: string
          feedback: Json | null
          id: string
          job_id: string | null
          messages: Json
          profile_id: string
          questions: Json | null
          role: string | null
          score: number | null
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          feedback?: Json | null
          id?: string
          job_id?: string | null
          messages?: Json
          profile_id: string
          questions?: Json | null
          role?: string | null
          score?: number | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          feedback?: Json | null
          id?: string
          job_id?: string | null
          messages?: Json
          profile_id?: string
          questions?: Json | null
          role?: string | null
          score?: number | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_sessions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_sessions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      interviews: {
        Row: {
          application_id: string | null
          candidate_id: string
          candidate_name: string | null
          created_at: string
          duration_min: number
          id: string
          job_id: string | null
          job_title: string | null
          location: string | null
          meeting_link: string | null
          notes: string | null
          recruiter_id: string
          reminded_at: string | null
          scheduled_at: string | null
          stage: string
          updated_at: string
        }
        Insert: {
          application_id?: string | null
          candidate_id: string
          candidate_name?: string | null
          created_at?: string
          duration_min?: number
          id?: string
          job_id?: string | null
          job_title?: string | null
          location?: string | null
          meeting_link?: string | null
          notes?: string | null
          recruiter_id: string
          reminded_at?: string | null
          scheduled_at?: string | null
          stage?: string
          updated_at?: string
        }
        Update: {
          application_id?: string | null
          candidate_id?: string
          candidate_name?: string | null
          created_at?: string
          duration_min?: number
          id?: string
          job_id?: string | null
          job_title?: string | null
          location?: string | null
          meeting_link?: string | null
          notes?: string | null
          recruiter_id?: string
          reminded_at?: string | null
          scheduled_at?: string | null
          stage?: string
          updated_at?: string
        }
        Relationships: []
      }
      jobs: {
        Row: {
          company: string
          created_at: string
          description: string | null
          expires_at: string | null
          id: string
          is_open: boolean
          location: string | null
          recruiter_id: string
          salary: string | null
          skills: string[]
          title: string
          updated_at: string
        }
        Insert: {
          company: string
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          is_open?: boolean
          location?: string | null
          recruiter_id: string
          salary?: string | null
          skills?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          company?: string
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          is_open?: boolean
          location?: string | null
          recruiter_id?: string
          salary?: string | null
          skills?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_recruiter_id_fkey"
            columns: ["recruiter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      languages: {
        Row: {
          created_at: string
          id: number
          level: string
          name: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          level?: string
          name: string
          profile_id: string
        }
        Update: {
          created_at?: string
          id?: never
          level?: string
          name?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "languages_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          profile_id: string
          title: string
          type: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          profile_id: string
          title: string
          type?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          profile_id?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_about: string | null
          company_industry: string | null
          company_name: string | null
          company_size: string | null
          company_website: string | null
          created_at: string
          date_of_birth: string | null
          desired_role: string | null
          discord: string | null
          discord_url: string | null
          email: string | null
          full_name: string | null
          github: string | null
          github_url: string | null
          id: string
          linkedin: string | null
          linkedin_url: string | null
          location: string | null
          phone: string | null
          photo_url: string | null
          role: Database["public"]["Enums"]["user_role"]
          role_selected: boolean
          summary: string | null
          updated_at: string
        }
        Insert: {
          company_about?: string | null
          company_industry?: string | null
          company_name?: string | null
          company_size?: string | null
          company_website?: string | null
          created_at?: string
          date_of_birth?: string | null
          desired_role?: string | null
          discord?: string | null
          discord_url?: string | null
          email?: string | null
          full_name?: string | null
          github?: string | null
          github_url?: string | null
          id: string
          linkedin?: string | null
          linkedin_url?: string | null
          location?: string | null
          phone?: string | null
          photo_url?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          role_selected?: boolean
          summary?: string | null
          updated_at?: string
        }
        Update: {
          company_about?: string | null
          company_industry?: string | null
          company_name?: string | null
          company_size?: string | null
          company_website?: string | null
          created_at?: string
          date_of_birth?: string | null
          desired_role?: string | null
          discord?: string | null
          discord_url?: string | null
          email?: string | null
          full_name?: string | null
          github?: string | null
          github_url?: string | null
          id?: string
          linkedin?: string | null
          linkedin_url?: string | null
          location?: string | null
          phone?: string | null
          photo_url?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          role_selected?: boolean
          summary?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          description: string | null
          id: number
          link: string | null
          name: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: never
          link?: string | null
          name: string
          profile_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: never
          link?: string | null
          name?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_jobs: {
        Row: {
          created_at: string
          job_id: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          job_id: string
          profile_id: string
        }
        Update: {
          created_at?: string
          job_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_jobs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_jobs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          created_at: string
          id: number
          name: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          name: string
          profile_id: string
        }
        Update: {
          created_at?: string
          id?: never
          name?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skills_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_interview_reminders: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      ensure_conversation: {
        Args: { p_recruiter: string; p_candidate: string; p_job?: string }
        Returns: string
      }
      is_conversation_member: {
        Args: { p_conversation_id: string }
        Returns: boolean
      }
    }
    Enums: {
      application_status:
        | "applied"
        | "screening"
        | "interview"
        | "offer"
        | "rejected"
        | "withdrawn"
      user_role: "candidate" | "recruiter"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database["public"]

export type Tables<
  T extends keyof DefaultSchema["Tables"],
> = DefaultSchema["Tables"][T]["Row"]

export type TablesInsert<
  T extends keyof DefaultSchema["Tables"],
> = DefaultSchema["Tables"][T]["Insert"]

export type TablesUpdate<
  T extends keyof DefaultSchema["Tables"],
> = DefaultSchema["Tables"][T]["Update"]

export type Enums<
  T extends keyof DefaultSchema["Enums"],
> = DefaultSchema["Enums"][T]
