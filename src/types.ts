export type MessageData = {
  id:  number | string;
  nickname: string | null;
  message: string | null;
  alert_message: boolean;
  msg_type: number;
  date: string | null;
  user_id: number | null;
  quoted_msg: MessageData | null;
  delete_chat: boolean | null;
};


export type Chatroom = {
  id: string;
  name: string;
  popularity: number;
  description: string;
  role_type: number;
  last_access: string;
};

export type GroupedChats = Record<number, Chatroom[]>;

export type NavItem = {
  name: string;
  href: string;
  current: boolean;
  onClick?: () => void;
  icon?: string;
};

export interface UserData {
  id: number;
  nickname: string;
  subscription?: string;
};

export type PrivateUserData = {
    id: number;
    nickname: string;
    distance: number;
    geo_accepted: boolean;
    geo_hidden: boolean;
};

export interface UserConversation {
  id: number;
  user_id: number;
  nickname: string;
  last_message?: string;
  data?: string;
  is_read: boolean;
  last_message_time: string;
  distance: number;
  geo_hidden: boolean;
  read: boolean;
  is_online: boolean;
  last_message_type: number;
};

/* forms */

export interface ChatDataForm {
  chatName: string;
  yourNickname: string;
  //isPrivate: boolean;
  token?: string;
  description: string;
  latitude: number;
  longitude: number;
}

/* end forms */


export interface ChatData {
  name: string;
  isPrivate: boolean;
  description: string;
  created_at: string;
  am_i_admin: number;
}
