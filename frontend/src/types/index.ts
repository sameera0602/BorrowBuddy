export interface User {
  id: number;
  fullName: string | null;
  email: string;
  role: "student" | "admin";
  phone?: string | null;
  department?: string | null;
  yearOfStudy?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  createdAt?: string;
}

export interface Listing {
  id: number;
  owner_id: number;
  title: string;
  category: string;
  description: string;
  item_condition: "brand_new" | "like_new" | "good" | "fair";
  rental_price_per_day: number | string;
  deposit_amount: number | string;
  pickup_location: string;
  rules?: string | null;
  status: "pending" | "approved" | "rejected" | "unavailable" | "suspended";
  rejection_reason?: string | null;
  created_at: string;
  owner_name: string;
  owner_email: string;
  owner_department?: string;
  owner_year?: string;
  images: string[];
  primary_image?: string | null;
  booked_ranges?: Array<{ start_date: string; end_date: string }>;
}

export interface Booking {
  id: number;
  listing_id: number;
  borrower_id: number;
  owner_id: number;
  start_date: string;
  end_date: string;
  total_price: number | string;
  status: "pending" | "accepted" | "declined" | "cancelled" | "active" | "completed";
  borrower_notes?: string | null;
  owner_response_notes?: string | null;
  created_at: string;
  item_title: string;
  category?: string;
  pickup_location?: string;
  rental_price_per_day?: number | string;
  deposit_amount?: number | string;
  owner_name?: string;
  owner_email?: string;
  borrower_name?: string;
  borrower_email?: string;
  image_url?: string | null;
  conversation_id?: number | null;
}

export interface Conversation {
  id: number;
  type: "booking" | "help";
  booking_id?: number | null;
  help_request_id?: number | null;
  created_at: string;
  updated_at: string;
  title?: string;
  item_title?: string;
  help_title?: string;
  partner?: {
    id: number;
    name: string;
    email?: string;
  };
  other_user?: {
    id: number;
    name: string;
    email: string;
  };
  last_message?: {
    message_text: string;
    created_at: string;
    sender_id: number;
  } | null;
}

export interface ChatMessage {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender_name?: string;
  sender_email?: string;
  message_text: string;
  created_at: string;
}

export interface HelpRequest {
  id: number;
  requester_id: number;
  title: string;
  category: string;
  description: string;
  deadline?: string | null;
  budget?: number | string;
  status: "open" | "assigned" | "completed" | "cancelled";
  created_at: string;
  requester_name: string;
  requester_email: string;
  requester_dept?: string;
  offer_count?: number;
  offers?: HelpOffer[];
  conversation_id?: number | null;
}

export interface HelpOffer {
  id: number;
  help_request_id: number;
  helper_id: number;
  message: string;
  price_quote: number | string;
  status: "pending" | "accepted" | "declined" | "withdrawn";
  created_at: string;
  helper_name: string;
  helper_email: string;
  helper_dept?: string;
}

export interface Report {
  id: number;
  reporter_id: number;
  target_type: "listing" | "conversation" | "user" | "help_request";
  target_id: number;
  reason: string;
  details?: string | null;
  status: "pending" | "reviewed" | "dismissed" | "action_taken";
  created_at: string;
  reporter_name?: string;
  reporter_email?: string;
}

export interface ModerationLog {
  id: number;
  action: string;
  target_type: string;
  target_id: number;
  notes?: string | null;
  created_at: string;
  admin_name?: string;
  admin_email?: string;
}
