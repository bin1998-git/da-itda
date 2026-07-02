import { TaggedProduct } from '@/components/ui/MediaProductSection';

export interface MediaPost {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  tags: string[];
  views: number;
  created_at: string;
  profiles?: { username: string | null };
  like_count?: number;
  tagged_products?: TaggedProduct[];
}
