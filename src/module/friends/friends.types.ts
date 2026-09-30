export interface FriendSummary {
  id: number;
  uid: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
}

export interface FriendsCursor {
  updatedAt: string;
  id: number;
}

export interface FriendsResult {
  friends: FriendSummary[];
  nextCursor: string | null;
}
