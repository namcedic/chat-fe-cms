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
  id?: string;
  conversationId: string;
  senderType: MessageSenderType;
  senderAgentId?: string | null;
  senderName?: string | null;
  text: string;
  createdAt: string;
};

export type ConversationNewEvent = {
  conversation: Conversation;
  lastMessage?: Message;
};

export type MessageNewEvent = {
  message: Message;
};
