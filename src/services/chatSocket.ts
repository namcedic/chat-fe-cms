import { io, type Socket } from 'socket.io-client';

import type { ConversationNewEvent, MessageNewEvent } from '@root/types/chat';
import { getAuthTokens } from '@root/utils/tokenStorage';

type ServerToClientEvents = {
  'conversation:new': (payload: ConversationNewEvent) => void;
  'message:new': (payload: MessageNewEvent) => void;
};

type ClientToServerEvents = {
  'agent:online': () => void;
  'agent:join': (payload: { conversationId: string }) => void;
  'agent:message': (payload: { conversationId: string; message: string }) => void;
};

export type ChatSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socketSingleton: ChatSocket | null = null;

const getSocketUrl = () => {
  return process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
};

export const getChatSocket = (): ChatSocket => {
  if (socketSingleton && socketSingleton.connected) return socketSingleton;

  const tokens = getAuthTokens();
  const accessToken = tokens?.accessToken;

  socketSingleton = io(getSocketUrl(), {
    transports: ['websocket'],
    autoConnect: true,
    auth: {
      accessToken: accessToken,
    },
  });

  return socketSingleton;
};

export const disconnectChatSocket = () => {
  if (!socketSingleton) return;
  socketSingleton.disconnect();
  socketSingleton = null;
};
