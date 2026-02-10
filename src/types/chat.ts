export type ConversationStatus = 'OPEN' | 'CLOSED';

export type Conversation = {
  id: string;
  customerName: string;
  customerPhone: string;
  status: ConversationStatus;
  lastMessageAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type MessageSenderType = 'CUSTOMER' | 'AGENT';

export type Message = {
  id?: string | number;
  conversationId: string;
  senderType: MessageSenderType;
  senderAgentId?: string | number | null;
  senderName?: string | null;
  text: string;
  createdAt: string;
};

// Socket payloads đã chuẩn hóa: UNWRAPPED
export type ConversationNewEvent = Conversation;
export type MessageNewEvent = Message;
