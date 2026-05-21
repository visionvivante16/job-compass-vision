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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      applications: {
        Row: {
          applied_at: string
          id: string
          job_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          applied_at?: string
          id?: string
          job_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          applied_at?: string
          id?: string
          job_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      ats_companies: {
        Row: {
          ats_platform: string
          auto_discovered: boolean
          company_name: string
          consecutive_empty_runs: number
          created_at: string
          date_added: string
          id: string
          ingested_via: string
          jobs_found_last_run: number
          jobs_last_7days: number
          jobs_last_run: number
          last_checked: string | null
          slug: string
          status: string
          tier: number
          updated_at: string
        }
        Insert: {
          ats_platform: string
          auto_discovered?: boolean
          company_name: string
          consecutive_empty_runs?: number
          created_at?: string
          date_added?: string
          id?: string
          ingested_via?: string
          jobs_found_last_run?: number
          jobs_last_7days?: number
          jobs_last_run?: number
          last_checked?: string | null
          slug: string
          status?: string
          tier?: number
          updated_at?: string
        }
        Update: {
          ats_platform?: string
          auto_discovered?: boolean
          company_name?: string
          consecutive_empty_runs?: number
          created_at?: string
          date_added?: string
          id?: string
          ingested_via?: string
          jobs_found_last_run?: number
          jobs_last_7days?: number
          jobs_last_run?: number
          last_checked?: string | null
          slug?: string
          status?: string
          tier?: number
          updated_at?: string
        }
        Relationships: []
      }
      ats_discovery_runs: {
        Row: {
          completed_at: string | null
          details: Json | null
          duration_ms: number | null
          errors: Json | null
          id: string
          started_at: string
          status: string
          total_activated: number
          total_added: number
          total_candidates: number
          total_deactivated: number
          total_validated: number
          trigger_type: string
          triggered_by: string | null
        }
        Insert: {
          completed_at?: string | null
          details?: Json | null
          duration_ms?: number | null
          errors?: Json | null
          id?: string
          started_at?: string
          status?: string
          total_activated?: number
          total_added?: number
          total_candidates?: number
          total_deactivated?: number
          total_validated?: number
          trigger_type?: string
          triggered_by?: string | null
        }
        Update: {
          completed_at?: string | null
          details?: Json | null
          duration_ms?: number | null
          errors?: Json | null
          id?: string
          started_at?: string
          status?: string
          total_activated?: number
          total_added?: number
          total_candidates?: number
          total_deactivated?: number
          total_validated?: number
          trigger_type?: string
          triggered_by?: string | null
        }
        Relationships: []
      }
      ats_ingest_runs: {
        Row: {
          companies_processed: number
          completed_at: string | null
          details: Json | null
          duplicates_removed: number
          duration_ms: number | null
          errors: Json | null
          id: string
          started_at: string
          status: string
          total_fetched: number
          total_filtered: number
          total_imported: number
          total_skipped: number
          trigger_type: string
          triggered_by: string | null
        }
        Insert: {
          companies_processed?: number
          completed_at?: string | null
          details?: Json | null
          duplicates_removed?: number
          duration_ms?: number | null
          errors?: Json | null
          id?: string
          started_at?: string
          status?: string
          total_fetched?: number
          total_filtered?: number
          total_imported?: number
          total_skipped?: number
          trigger_type?: string
          triggered_by?: string | null
        }
        Update: {
          companies_processed?: number
          completed_at?: string | null
          details?: Json | null
          duplicates_removed?: number
          duration_ms?: number | null
          errors?: Json | null
          id?: string
          started_at?: string
          status?: string
          total_fetched?: number
          total_filtered?: number
          total_imported?: number
          total_skipped?: number
          trigger_type?: string
          triggered_by?: string | null
        }
        Relationships: []
      }
      auto_apply_queue: {
        Row: {
          consumed_at: string | null
          cover_letter: string | null
          created_at: string
          external_url: string
          id: string
          job_id: string
          profile_data: Json | null
          status: string
          tailored_resume: Json | null
          user_id: string
        }
        Insert: {
          consumed_at?: string | null
          cover_letter?: string | null
          created_at?: string
          external_url: string
          id?: string
          job_id: string
          profile_data?: Json | null
          status?: string
          tailored_resume?: Json | null
          user_id: string
        }
        Update: {
          consumed_at?: string | null
          cover_letter?: string | null
          created_at?: string
          external_url?: string
          id?: string
          job_id?: string
          profile_data?: Json | null
          status?: string
          tailored_resume?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      checkout_recovery_emails: {
        Row: {
          completed_at: string | null
          created_at: string
          email: string
          id: string
          payment_completed: boolean
          sent_at: string
          stripe_customer_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          email: string
          id?: string
          payment_completed?: boolean
          sent_at?: string
          stripe_customer_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          email?: string
          id?: string
          payment_completed?: boolean
          sent_at?: string
          stripe_customer_id?: string | null
        }
        Relationships: []
      }
      cover_letters: {
        Row: {
          company: string
          content: string
          created_at: string
          id: string
          job_id: string
          job_title: string
          user_id: string
        }
        Insert: {
          company: string
          content: string
          created_at?: string
          id?: string
          job_id: string
          job_title: string
          user_id: string
        }
        Update: {
          company?: string
          content?: string
          created_at?: string
          id?: string
          job_id?: string
          job_title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cover_letters_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      email_notification_preferences: {
        Row: {
          created_at: string
          daily_digest_enabled: boolean
          id: string
          matched_jobs_enabled: boolean
          new_jobs_enabled: boolean
          sponsorship_jobs_enabled: boolean
          unsubscribed_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_digest_enabled?: boolean
          id?: string
          matched_jobs_enabled?: boolean
          new_jobs_enabled?: boolean
          sponsorship_jobs_enabled?: boolean
          unsubscribed_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          daily_digest_enabled?: boolean
          id?: string
          matched_jobs_enabled?: boolean
          new_jobs_enabled?: boolean
          sponsorship_jobs_enabled?: boolean
          unsubscribed_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      employer_permissions: {
        Row: {
          can_delete_jobs: boolean
          can_edit_jobs: boolean
          can_import_google_sheet: boolean
          can_manage_team: boolean
          can_post_jobs: boolean
          can_view_graphs: boolean
          created_at: string
          employer_id: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          can_delete_jobs?: boolean
          can_edit_jobs?: boolean
          can_import_google_sheet?: boolean
          can_manage_team?: boolean
          can_post_jobs?: boolean
          can_view_graphs?: boolean
          created_at?: string
          employer_id: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          can_delete_jobs?: boolean
          can_edit_jobs?: boolean
          can_import_google_sheet?: boolean
          can_manage_team?: boolean
          can_post_jobs?: boolean
          can_view_graphs?: boolean
          created_at?: string
          employer_id?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      error_logs: {
        Row: {
          created_at: string
          error_type: string
          id: string
          message: string
          metadata: Json | null
          page_url: string | null
          stack: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_type?: string
          id?: string
          message: string
          metadata?: Json | null
          page_url?: string | null
          stack?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_type?: string
          id?: string
          message?: string
          metadata?: Json | null
          page_url?: string | null
          stack?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      failed_payments: {
        Row: {
          amount: number | null
          created_at: string
          currency: string | null
          customer_name: string | null
          email: string
          email_sent: boolean
          event_type: string
          failure_reason: string | null
          id: string
          retry_link: string | null
          stripe_event_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string
          currency?: string | null
          customer_name?: string | null
          email: string
          email_sent?: boolean
          event_type: string
          failure_reason?: string | null
          id?: string
          retry_link?: string | null
          stripe_event_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string
          currency?: string | null
          customer_name?: string | null
          email?: string
          email_sent?: boolean
          event_type?: string
          failure_reason?: string | null
          id?: string
          retry_link?: string | null
          stripe_event_id?: string | null
        }
        Relationships: []
      }
      feature_feedback: {
        Row: {
          comment: string | null
          company_name: string | null
          created_at: string
          feature: string | null
          feedback_text: string | null
          id: string
          job_title: string | null
          rating: number | null
          template_used: string | null
          trigger_source: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          company_name?: string | null
          created_at?: string
          feature?: string | null
          feedback_text?: string | null
          id?: string
          job_title?: string | null
          rating?: number | null
          template_used?: string | null
          trigger_source: string
          user_id: string
        }
        Update: {
          comment?: string | null
          company_name?: string | null
          created_at?: string
          feature?: string | null
          feedback_text?: string | null
          id?: string
          job_title?: string | null
          rating?: number | null
          template_used?: string | null
          trigger_source?: string
          user_id?: string
        }
        Relationships: []
      }
      hiring_graph_data: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          percentage: number
          role_name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          percentage: number
          role_name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          percentage?: number
          role_name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      hiring_graph_published: {
        Row: {
          created_at: string
          id: string
          percentage: number
          published_at: string
          published_by: string | null
          role_name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          percentage: number
          published_at?: string
          published_by?: string | null
          role_name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          percentage?: number
          published_at?: string
          published_by?: string | null
          role_name?: string
          sort_order?: number
        }
        Relationships: []
      }
      import_history: {
        Row: {
          created_at: string
          error_count: number
          errors: Json | null
          id: string
          imported_count: number
          sheet_url: string
          skipped_count: number
          user_id: string
        }
        Insert: {
          created_at?: string
          error_count?: number
          errors?: Json | null
          id?: string
          imported_count?: number
          sheet_url: string
          skipped_count?: number
          user_id: string
        }
        Update: {
          created_at?: string
          error_count?: number
          errors?: Json | null
          id?: string
          imported_count?: number
          sheet_url?: string
          skipped_count?: number
          user_id?: string
        }
        Relationships: []
      }
      jobs: {
        Row: {
          ats_company_slug: string | null
          company: string
          company_logo: string | null
          created_at: string
          created_by_user_id: string | null
          deleted_at: string | null
          description: string
          description_enriched: boolean
          description_source: string
          employer_id: string | null
          employment_type: string
          experience_years: string | null
          external_apply_link: string
          id: string
          ingested_via: string
          is_archived: boolean
          is_direct_apply: boolean
          is_published: boolean
          is_reviewing: boolean
          location: string
          posted_date: string
          salary_range: string | null
          search_vector: unknown
          skills: string[]
          title: string
          updated_at: string
        }
        Insert: {
          ats_company_slug?: string | null
          company: string
          company_logo?: string | null
          created_at?: string
          created_by_user_id?: string | null
          deleted_at?: string | null
          description: string
          description_enriched?: boolean
          description_source?: string
          employer_id?: string | null
          employment_type?: string
          experience_years?: string | null
          external_apply_link: string
          id?: string
          ingested_via?: string
          is_archived?: boolean
          is_direct_apply?: boolean
          is_published?: boolean
          is_reviewing?: boolean
          location: string
          posted_date?: string
          salary_range?: string | null
          search_vector?: unknown
          skills?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          ats_company_slug?: string | null
          company?: string
          company_logo?: string | null
          created_at?: string
          created_by_user_id?: string | null
          deleted_at?: string | null
          description?: string
          description_enriched?: boolean
          description_source?: string
          employer_id?: string | null
          employment_type?: string
          experience_years?: string | null
          external_apply_link?: string
          id?: string
          ingested_via?: string
          is_archived?: boolean
          is_direct_apply?: boolean
          is_published?: boolean
          is_reviewing?: boolean
          location?: string
          posted_date?: string
          salary_range?: string | null
          search_vector?: unknown
          skills?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      jsearch_ingest_runs: {
        Row: {
          completed_at: string | null
          details: Json | null
          duplicates_removed: number
          duration_ms: number | null
          errors: Json | null
          id: string
          started_at: string
          status: string
          total_fetched: number
          total_filtered: number
          total_imported: number
          total_skipped: number
          trigger_type: string
          triggered_by: string | null
        }
        Insert: {
          completed_at?: string | null
          details?: Json | null
          duplicates_removed?: number
          duration_ms?: number | null
          errors?: Json | null
          id?: string
          started_at?: string
          status?: string
          total_fetched?: number
          total_filtered?: number
          total_imported?: number
          total_skipped?: number
          trigger_type?: string
          triggered_by?: string | null
        }
        Update: {
          completed_at?: string | null
          details?: Json | null
          duplicates_removed?: number
          duration_ms?: number | null
          errors?: Json | null
          id?: string
          started_at?: string
          status?: string
          total_fetched?: number
          total_filtered?: number
          total_imported?: number
          total_skipped?: number
          trigger_type?: string
          triggered_by?: string | null
        }
        Relationships: []
      }
      jsearch_query_seeds: {
        Row: {
          country: string
          created_at: string
          date_posted: string
          employment_types: string
          id: string
          is_active: boolean
          job_requirements: string | null
          last_imported_count: number | null
          last_run_at: string | null
          query: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          country?: string
          created_at?: string
          date_posted?: string
          employment_types?: string
          id?: string
          is_active?: boolean
          job_requirements?: string | null
          last_imported_count?: number | null
          last_run_at?: string | null
          query: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          country?: string
          created_at?: string
          date_posted?: string
          employment_types?: string
          id?: string
          is_active?: boolean
          job_requirements?: string | null
          last_imported_count?: number | null
          last_run_at?: string | null
          query?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      linkedin_message_usage: {
        Row: {
          created_at: string
          id: string
          updated_at: string
          usage_count: number
          usage_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
          usage_count?: number
          usage_date?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
          usage_count?: number
          usage_date?: string
          user_id?: string
        }
        Relationships: []
      }
      manual_premium_grants: {
        Row: {
          created_at: string
          duration_type: string
          expires_at: string | null
          granted_by: string
          id: string
          is_active: boolean
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_type?: string
          expires_at?: string | null
          granted_by: string
          id?: string
          is_active?: boolean
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_type?: string
          expires_at?: string | null
          granted_by?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      new_jobs_notification_log: {
        Row: {
          created_at: string
          id: string
          jobs_count_last_notification: number
          last_notified_at: string
          source: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          jobs_count_last_notification?: number
          last_notified_at?: string
          source?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          jobs_count_last_notification?: number
          last_notified_at?: string
          source?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      processed_stripe_events: {
        Row: {
          event_id: string
          event_type: string
          id: string
          processed_at: string
        }
        Insert: {
          event_id: string
          event_type: string
          id?: string
          processed_at?: string
        }
        Update: {
          event_id?: string
          event_type?: string
          id?: string
          processed_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          certifications: Json | null
          city: string | null
          contact_email: string | null
          country: string | null
          created_at: string
          current_company: string | null
          current_title: string | null
          disability_status: string | null
          education: Json | null
          email: string
          emoji_avatar: string | null
          employer_id: string | null
          experience_years: number | null
          feedback_given_at: string | null
          first_name: string | null
          full_name: string | null
          gender: string | null
          github_url: string | null
          hispanic_latino: string | null
          id: string
          is_active: boolean
          is_premium: boolean
          last_inactivity_nudge_at: string | null
          last_name: string | null
          linkedin_url: string | null
          location: string | null
          military_service: string | null
          phone: string | null
          portfolio_url: string | null
          preferred_resume_template: string | null
          race_ethnicity: string | null
          resume_filename: string | null
          resume_intelligence: Json | null
          resume_url: string | null
          skills: string[] | null
          state: string | null
          updated_at: string
          user_id: string
          veteran_status: string | null
          visa_status: string | null
          work_authorization: string | null
          work_experience: Json | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          certifications?: Json | null
          city?: string | null
          contact_email?: string | null
          country?: string | null
          created_at?: string
          current_company?: string | null
          current_title?: string | null
          disability_status?: string | null
          education?: Json | null
          email: string
          emoji_avatar?: string | null
          employer_id?: string | null
          experience_years?: number | null
          feedback_given_at?: string | null
          first_name?: string | null
          full_name?: string | null
          gender?: string | null
          github_url?: string | null
          hispanic_latino?: string | null
          id?: string
          is_active?: boolean
          is_premium?: boolean
          last_inactivity_nudge_at?: string | null
          last_name?: string | null
          linkedin_url?: string | null
          location?: string | null
          military_service?: string | null
          phone?: string | null
          portfolio_url?: string | null
          preferred_resume_template?: string | null
          race_ethnicity?: string | null
          resume_filename?: string | null
          resume_intelligence?: Json | null
          resume_url?: string | null
          skills?: string[] | null
          state?: string | null
          updated_at?: string
          user_id: string
          veteran_status?: string | null
          visa_status?: string | null
          work_authorization?: string | null
          work_experience?: Json | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          certifications?: Json | null
          city?: string | null
          contact_email?: string | null
          country?: string | null
          created_at?: string
          current_company?: string | null
          current_title?: string | null
          disability_status?: string | null
          education?: Json | null
          email?: string
          emoji_avatar?: string | null
          employer_id?: string | null
          experience_years?: number | null
          feedback_given_at?: string | null
          first_name?: string | null
          full_name?: string | null
          gender?: string | null
          github_url?: string | null
          hispanic_latino?: string | null
          id?: string
          is_active?: boolean
          is_premium?: boolean
          last_inactivity_nudge_at?: string | null
          last_name?: string | null
          linkedin_url?: string | null
          location?: string | null
          military_service?: string | null
          phone?: string | null
          portfolio_url?: string | null
          preferred_resume_template?: string | null
          race_ethnicity?: string | null
          resume_filename?: string | null
          resume_intelligence?: Json | null
          resume_url?: string | null
          skills?: string[] | null
          state?: string | null
          updated_at?: string
          user_id?: string
          veteran_status?: string | null
          visa_status?: string | null
          work_authorization?: string | null
          work_experience?: Json | null
          zip?: string | null
        }
        Relationships: []
      }
      role_requests: {
        Row: {
          acknowledged_at: string | null
          created_at: string
          id: string
          location: string | null
          requested_role: string
          user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          created_at?: string
          id?: string
          location?: string | null
          requested_role: string
          user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          created_at?: string
          id?: string
          location?: string | null
          requested_role?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_jobs: {
        Row: {
          folder: string
          id: string
          job_id: string
          saved_at: string
          user_id: string
        }
        Insert: {
          folder?: string
          id?: string
          job_id: string
          saved_at?: string
          user_id: string
        }
        Update: {
          folder?: string
          id?: string
          job_id?: string
          saved_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_jobs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          admin_reply: string | null
          created_at: string
          email: string
          id: string
          message: string
          name: string
          replied_at: string | null
          screenshot_url: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_reply?: string | null
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          replied_at?: string | null
          screenshot_url?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_reply?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          replied_at?: string | null
          screenshot_url?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      user_streaks: {
        Row: {
          created_at: string
          current_streak: number
          id: string
          jobs_viewed_date: string | null
          jobs_viewed_today: number
          last_active_date: string | null
          longest_streak: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          id?: string
          jobs_viewed_date?: string | null
          jobs_viewed_today?: number
          last_active_date?: string | null
          longest_streak?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          id?: string
          jobs_viewed_date?: string | null
          jobs_viewed_today?: number
          last_active_date?: string | null
          longest_streak?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          created_at: string
          id: string
          is_subscribed: boolean
          next_renewal_date: string | null
          stripe_customer_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_subscribed?: boolean
          next_renewal_date?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_subscribed?: boolean
          next_renewal_date?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_visits: {
        Row: {
          created_at: string
          id: string
          last_visit_at: string
          previous_visit_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_visit_at?: string
          previous_visit_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_visit_at?: string
          previous_visit_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      weekly_digest_log: {
        Row: {
          id: string
          jobs_applied: number
          jobs_viewed: number
          matched_jobs_count: number
          sent_at: string
          user_id: string
          week_start: string
        }
        Insert: {
          id?: string
          jobs_applied?: number
          jobs_viewed?: number
          matched_jobs_count?: number
          sent_at?: string
          user_id: string
          week_start: string
        }
        Update: {
          id?: string
          jobs_applied?: number
          jobs_viewed?: number
          matched_jobs_count?: number
          sent_at?: string
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      archive_old_jobs: { Args: never; Returns: number }
      can_access_job: { Args: { job_id: string }; Returns: boolean }
      check_and_increment_linkedin_usage: {
        Args: { p_daily_limit: number; p_user_id: string }
        Returns: Json
      }
      count_search_jobs:
        | {
            Args: { expanded_terms?: string[]; search_query?: string }
            Returns: number
          }
        | {
            Args: {
              expanded_terms?: string[]
              filter_tab?: string
              search_query?: string
            }
            Returns: number
          }
      delete_old_jobs_3_months: { Args: never; Returns: number }
      get_job_counts: {
        Args: { search_query?: string }
        Returns: {
          today_count: number
          total_count: number
          week_count: number
          yesterday_count: number
        }[]
      }
      get_landing_company_count: {
        Args: { days_back?: number }
        Returns: number
      }
      get_public_user_count: { Args: never; Returns: number }
      get_top_hiring_roles: {
        Args: { max_roles?: number }
        Returns: {
          job_count: number
          percentage: number
          role_name: string
        }[]
      }
      has_employer_permission: {
        Args: { permission_name: string }
        Returns: boolean
      }
      has_role: {
        Args: { check_role: string; check_user_id: string }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_founder: { Args: never; Returns: boolean }
      mark_stuck_ats_runs: { Args: never; Returns: undefined }
      profile_completeness: { Args: { p_user_id: string }; Returns: Json }
      publish_hiring_graph: { Args: never; Returns: undefined }
      read_vault_secret: { Args: { secret_name: string }; Returns: string }
      read_vault_secret_internal: {
        Args: { secret_name: string }
        Returns: string
      }
      record_user_visit: { Args: { p_user_id: string }; Returns: Json }
      remove_duplicate_jobs: { Args: never; Returns: Json }
      search_jobs: {
        Args: {
          expanded_terms?: string[]
          filter_tab?: string
          page_offset?: number
          page_size?: number
          search_query?: string
        }
        Returns: {
          company: string
          company_logo: string
          created_at: string
          description: string
          employment_type: string
          experience_years: string
          external_apply_link: string
          id: string
          is_archived: boolean
          is_published: boolean
          is_reviewing: boolean
          location: string
          posted_date: string
          rank: number
          salary_range: string
          skills: string[]
          title: string
          updated_at: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      store_vault_secret: {
        Args: { secret_name: string; secret_value: string }
        Returns: string
      }
      suggest_job_titles: {
        Args: { max_results?: number; query_text: string }
        Returns: {
          match_count: number
          suggestion: string
        }[]
      }
      update_user_streak: { Args: { p_user_id: string }; Returns: Json }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
