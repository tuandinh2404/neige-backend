export interface IUser {
  id: number;
  username: string;
  password_hash: string;
  full_name: string;
  uid: string;
  avatar_url?: string;
  email?: string;
  role?: string;
  is_active?: boolean;
  last_login_at?: Date;
  created_at?: Date;
  updated_at?: Date;
}

export interface IUserInputDTO {
  username: string;
  password: string;
  full_name: string;
  uid: string;
}