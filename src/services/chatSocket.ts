import { io, type Socket } from 'socket.io-client';

import type { ConversationNewEvent, MessageNewEvent } from '@root/types/chat';

type AgentAuth = {
  agentId: string;
  agentName: string;
  token?: string;
};

type ServerToClientEvents = {
  'conversation:new': (payload: ConversationNewEvent) => void;
  'message:new': (payload: MessageNewEvent) => void;
};

type ClientToServerEvents = {
  'agent:online': (payload: { agentId: string; agentName: string }) => void;
  'agent:join': (payload: { conversationId: string }) => void;
  'agent:message': (payload: { conversationId: string; message: string }) => void;
};

export type ChatSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socketSingleton: ChatSocket | null = null;

const getSocketUrl = () => {
  return process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || '';
};

export const getChatSocket = (auth: AgentAuth): ChatSocket => {
  if (socketSingleton && socketSingleton.connected) return socketSingleton;

  socketSingleton = io(getSocketUrl(), {
    transports: ['websocket'],
    autoConnect: true,
    auth: {
      agentId: auth.agentId,
      agentName: auth.agentName,
      token: auth.token,
    },
  });

  return socketSingleton;
};

export const disconnectChatSocket = () => {
  if (!socketSingleton) return;
  socketSingleton.disconnect();
  socketSingleton = null;
};
