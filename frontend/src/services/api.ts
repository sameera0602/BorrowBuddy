export const SERVER_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");
export const API_BASE = `${SERVER_BASE}/api`;

export function getAssetUrl(path: string | null | undefined): string {
  if (!path) return "/placeholder-item.png";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${SERVER_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

async function request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers = new Headers(options.headers || {});

  // Do not set Content-Type if sending FormData
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include"
  });

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error(`Server responded with status ${response.status}`);
  }

  if (!response.ok || data.success === false) {
    throw new Error(data.message || `Request failed (${response.status})`);
  }

  return data;
}

export const api = {
  // Auth
  register: (fullName: string, collegeEmail: string) =>
    request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ fullName, collegeEmail })
    }),

  verifyOtp: (collegeEmail: string, otp: string) =>
    request("/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ collegeEmail, otp })
    }),

  setPassword: (signupToken: string, password: string) =>
    request("/auth/set-password", {
      method: "POST",
      body: JSON.stringify({ signupToken, password })
    }),

  login: (collegeEmail: string, password: string) =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ collegeEmail, password })
    }),

  logout: () =>
    request("/auth/logout", {
      method: "POST"
    }),

  getMe: () =>
    request("/auth/me", {
      method: "GET"
    }),

  checkUser: (emailOrId: string) =>
    request("/auth/check-user", {
      method: "POST",
      body: JSON.stringify({ emailOrId })
    }),

  adminQuickLogin: () =>
    request("/auth/admin-quick-login", {
      method: "POST"
    }),

  // Listings
  getListings: (params: { category?: string; condition?: string; minPrice?: string; maxPrice?: string; search?: string } = {}) => {
    const searchParams = new URLSearchParams();
    if (params.category && params.category !== "All") searchParams.set("category", params.category);
    if (params.condition && params.condition !== "all") searchParams.set("condition", params.condition);
    if (params.minPrice) searchParams.set("minPrice", params.minPrice);
    if (params.maxPrice) searchParams.set("maxPrice", params.maxPrice);
    if (params.search) searchParams.set("search", params.search);

    const query = searchParams.toString();
    return request(`/listings${query ? `?${query}` : ""}`, { method: "GET" });
  },

  getListing: (id: number) => request(`/listings/${id}`, { method: "GET" }),

  createListing: (formData: FormData) =>
    request("/listings", {
      method: "POST",
      body: formData
    }),

  deleteListing: (id: number) =>
    request(`/listings/${id}`, {
      method: "DELETE"
    }),

  // Bookings
  createBooking: (data: { listingId: number; startDate: string; endDate: string; borrowerNotes?: string }) =>
    request("/bookings", {
      method: "POST",
      body: JSON.stringify(data)
    }),

  getMyBorrowings: () => request("/bookings/my-borrowings", { method: "GET" }),

  getMyLending: () => request("/bookings/my-lending", { method: "GET" }),

  updateBookingStatus: (bookingId: number, newStatus: string, responseNotes?: string) =>
    request(`/bookings/${bookingId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ newStatus, responseNotes })
    }),

  // Chats
  getConversations: () => request("/chats", { method: "GET" }),

  getMessages: (conversationId: number) =>
    request(`/chats/${conversationId}/messages`, { method: "GET" }),

  sendMessage: (conversationId: number, messageText: string) =>
    request(`/chats/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify({ messageText })
    }),

  startDirectChat: (data: { helpRequestId?: number; targetUserId?: number; initialMessage?: string }) =>
    request("/chats/start-direct", {
      method: "POST",
      body: JSON.stringify(data)
    }),

  // Help a Buddy
  getHelpRequests: (params: { category?: string; search?: string } = {}) => {
    const searchParams = new URLSearchParams();
    if (params.category && params.category !== "All") searchParams.set("category", params.category);
    if (params.search) searchParams.set("search", params.search);
    const query = searchParams.toString();
    return request(`/help${query ? `?${query}` : ""}`, { method: "GET" });
  },

  createHelpRequest: (data: { title: string; category: string; description: string; deadline?: string; budget?: number }) =>
    request("/help", {
      method: "POST",
      body: JSON.stringify(data)
    }),

  getMyHelpRequests: () => request("/help/my-requests", { method: "GET" }),

  submitHelpOffer: (requestId: number, data: { message: string; priceQuote: number }) =>
    request(`/help/${requestId}/offers`, {
      method: "POST",
      body: JSON.stringify(data)
    }),

  updateHelpOfferStatus: (offerId: number, newStatus: "accepted" | "declined") =>
    request(`/help/offers/${offerId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ newStatus })
    }),

  // Admin
  getPendingListings: () => request("/admin/listings/pending", { method: "GET" }),

  approveListing: (id: number) =>
    request(`/admin/listings/${id}/approve`, {
      method: "PATCH"
    }),

  rejectListing: (id: number, reason: string) =>
    request(`/admin/listings/${id}/reject`, {
      method: "PATCH",
      body: JSON.stringify({ reason })
    }),

  getAllListingsAdmin: () => request("/admin/listings/all", { method: "GET" }),

  suspendListingAdmin: (id: number, suspend: boolean) =>
    request(`/admin/listings/${id}/suspend`, {
      method: "PATCH",
      body: JSON.stringify({ suspend })
    }),

  getReportsAdmin: () => request("/admin/reports", { method: "GET" }),

  getAuditLogsAdmin: () => request("/admin/audit-logs", { method: "GET" }),

  getHelpRequestsAdmin: () => request("/admin/help-requests", { method: "GET" }),

  updateHelpRequestStatusAdmin: (id: number, status: string) =>
    request(`/admin/help-requests/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    }),

  getAdminConversations: () => request("/admin/conversations", { method: "GET" }),

  getAdminConversationMessages: (id: number) =>
    request(`/admin/conversations/${id}/messages`, { method: "GET" }),

  deleteMessageAdmin: (id: number) =>
    request(`/admin/messages/${id}`, { method: "DELETE" }),

  // Profile
  getProfile: () => request("/profile", { method: "GET" }),

  updateProfile: (data: { phone?: string; department?: string; yearOfStudy?: string; bio?: string }) =>
    request("/profile", {
      method: "PATCH",
      body: JSON.stringify(data)
    }),

  // Reports
  submitReport: (data: { targetType: string; targetId: number; reason: string; details?: string }) =>
    request("/reports", {
      method: "POST",
      body: JSON.stringify(data)
    })
};
