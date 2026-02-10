import { API_ENDPOINTS } from '@root/constants';
import type { Conversation, Message } from '@root/types/chat';
import axiosInstance from '@root/utils/axios';

export type GetConversationsParams = {
  status?: 'OPEN' | 'CLOSED';
  limit?: number;
  cursor?: string;
  phone?: string;
};

export type GetConversationsResponse = {
  items: Conversation[];
  nextCursor?: string | null;
};

export type GetMessagesParams = {
  limit?: number;
  before?: string;
};

export type GetMessagesResponse = {
  items: Message[];
  nextBefore?: string | null;
};

export const chatApi = {
  getConversations: async (params: GetConversationsParams) => {
    const res = await axiosInstance.get<GetConversationsResponse>(
      API_ENDPOINTS.CHAT.CONVERSATIONS,
      {
        params,
      }
    );
    return res.data;
  },

  getMessages: async (conversationId: string, params?: GetMessagesParams) => {
    const res = await axiosInstance.get<GetMessagesResponse>(
      API_ENDPOINTS.CHAT.MESSAGES(conversationId),
      {
        params,
      }
    );
    return res.data;
  },

  closeConversation: async (conversationId: string) => {
    const res = await axiosInstance.post(API_ENDPOINTS.CHAT.CLOSE(conversationId));
    return res.data;
  },
};
