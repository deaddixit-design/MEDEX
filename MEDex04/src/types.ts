export interface Idea {
  id: string | number;
  title: string;
  description: string;
  participant_name?: string;
  participants?: string[];
  group_type: 'Single' | 'Duo' | 'Group';
  category: string | string[];
  contact_info?: string;
  media_url?: string;
  media_type?: 'link' | 'mp3' | 'mp4' | 'image';
  approved?: boolean;
  program?: string;
  program_id?: string;
  created_at: string;
}

export interface Media {
  id: number;
  title: string;
  url: string;
  type: 'photo' | 'video';
  year: number;
  created_at: string;
}

export interface BatchMemory {
  id: number;
  batch_name: string;
  title: string;
  url: string;
  type: 'photo' | 'video';
  uploaded_by?: string;
  created_at: string;
}

export interface Performance {
  id: number;
  title: string;
  description: string;
  performer: string;
  time?: string;
  group_type: 'Single' | 'Duo' | 'Group';
  category: string; // Comma separated categories
  media_url?: string;
  media_type?: 'link' | 'mp3' | 'mp4' | 'image';
  contact_info?: string;
  doc_id?: string;
  is_approved?: number;
  program?: string;
  program_id?: string;
  created_at: string;
}

export interface DemandingItem {
  id: number;
  type: 'song' | 'videography' | 'photography';
  title: string;
  link: string;
  description?: string;
  category?: string;
  created_at: string;
}

export interface Program {
  id: string;
  name: string;
  subtitle: string;
  gifUrl: string;
  invitationUrl: string;
  invitationPdfUrl?: string; // Optional PDF version
  isActive: boolean;
  date?: string;
  location?: string;
  time?: string;
  description?: string;
  highlights?: string[];
  dressCode?: string;
  department?: string;
  footerText?: string;
  countdownDate?: string;
  createdAt: any;
}

export interface Wish {
  id: string;
  name: string;
  message: string;
  color: string;
  ink: string;
  createdAt: any;
  authorSessionId?: string;
  isDeleted?: boolean;
  programId?: string;
}

export interface VipPass {
  id: string;
  name: string;
  qr_code: string;
  is_validated: boolean;
  validated_at?: string;
  createdAt: any;
}
