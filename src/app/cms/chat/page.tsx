'use client';

import { CheckCircleOutlined, PhoneOutlined, SendOutlined, UserOutlined } from '@ant-design/icons';
import {
  Avatar,
  Badge,
  Button,
  Divider,
  Input,
  Layout,
  List,
  message,
  Modal,
  Space,
  Spin,
  Typography,
} from 'antd';
import dayjs, { extend as dayjsExtend } from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useRouter } from 'next/navigation';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { chatApi } from '@root/apis/chat';
import Header from '@root/components/Header';
import { useAppSelector, useAppDispatch } from '@root/hooks';
import { disconnectChatSocket, getChatSocket } from '@root/services/chatSocket';
import { logout } from '@root/store/auth/authSlice';
import type {
  Conversation,
  ConversationNewEvent,
  Message,
  MessageNewEvent,
} from '@root/types/chat';

dayjsExtend(relativeTime);

const { Sider, Content } = Layout;
const { Text, Title } = Typography;

export default function CMSChatPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loadingConv, setLoadingConv] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedIdRef = useRef<string | null>(null);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  // 1. Route Guard: Bắt buộc login mới được vào trang này
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

  const selectedConversation = useMemo(
    () => conversations?.find((c) => c.id === selectedId),
    [conversations, selectedId]
  );

  useEffect(() => {
    if (!isAuthenticated) return;

    fetchConversations();

    const socket = getChatSocket();

    const handleConnect = () => {
      console.log('CMS Socket connected');
      socket.emit('agent:online');
      if (selectedIdRef.current) {
        socket.emit('agent:join', { conversationId: selectedIdRef.current });
      }
    };

    const handleConversationNew = (payload: ConversationNewEvent) => {
      setConversations((prev) => {
        const exists = prev.find((c) => c.id === payload.id);
        if (exists) return prev;
        return [payload, ...prev];
      });
      message.info(`Có khách hàng mới: ${payload.customerName}`);
    };

    const handleMessageNew = (payload: MessageNewEvent) => {
      if (payload.conversationId === selectedIdRef.current) {
        setMessages((prev) => {
          const isDuplicate = prev.some((m) => m.id && payload.id && m.id === payload.id);
          if (isDuplicate) return prev;
          return [...prev, payload];
        });
      }

      setConversations((prev) =>
        prev.map((c) =>
          c.id === payload.conversationId ? { ...c, lastMessageAt: payload.createdAt } : c
        )
      );
    };

    socket.off('connect', handleConnect);
    socket.off('conversation:new', handleConversationNew);
    socket.off('message:new', handleMessageNew);

    socket.on('connect', handleConnect);
    socket.on('conversation:new', handleConversationNew);
    socket.on('message:new', handleMessageNew);

    (socket.io as any)?.on?.('reconnect', handleConnect);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('conversation:new', handleConversationNew);
      socket.off('message:new', handleMessageNew);
      (socket.io as any)?.off?.('reconnect', handleConnect);
      disconnectChatSocket();
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchConversations = async () => {
    try {
      setLoadingConv(true);
      const res = await chatApi.getConversations({ status: 'OPEN' });
      setConversations(res.items);
    } catch (err) {
      console.error('Fetch conversations error:', err);
      message.error('Không thể tải danh sách hội thoại');
    } finally {
      setLoadingConv(false);
    }
  };

  const fetchMessages = async (id: string) => {
    try {
      setLoadingMsg(true);
      const res = await chatApi.getMessages(id);
      // BE trả về danh sách từ cũ đến mới, không cần reverse nữa nếu BE đã làm chuẩn
      setMessages(res.items ?? []);
    } catch (err) {
      console.error('Fetch messages error:', err);
      message.error('Không thể tải lịch sử tin nhắn');
    } finally {
      setLoadingMsg(false);
    }
  };

  const handleSelectConversation = (id: string) => {
    setSelectedId(id);
    fetchMessages(id);
    const socket = getChatSocket();
    socket.emit('agent:join', { conversationId: id });
  };

  const handleSendMessage = () => {
    if (!inputText.trim() || !selectedId) return;

    const socket = getChatSocket();

    // Gửi tin nhắn qua socket
    socket.emit('agent:message', {
      conversationId: selectedId,
      message: inputText.trim(),
    });

    // KHÔNG optimistic update ở đây vì Server đã được sửa để emit-to-all (bao gồm sender)
    // Điều này đảm bảo dữ liệu hiển thị luôn có ID từ DB và không bị lặp.
    setInputText('');
  };

  const handleLogout = () => {
    dispatch(logout());
    disconnectChatSocket();
    router.push('/login');
  };

  const handleCloseConversation = () => {
    if (!selectedId) return;
    Modal.confirm({
      title: 'Kết thúc hỗ trợ',
      content: 'Bạn có chắc chắn muốn đóng cuộc hội thoại này?',
      onOk: async () => {
        try {
          await chatApi.closeConversation(selectedId);
          message.success('Đã đóng hội thoại');
          setConversations((prev) => prev.filter((c) => c.id !== selectedId));
          setSelectedId(null);
          setMessages([]);
        } catch {
          message.error('Không thể đóng hội thoại');
        }
      },
    });
  };

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen flex-col">
      <Header />
      <Layout className="flex-1 overflow-hidden bg-white">
        <Sider width={350} theme="light" className="border-r border-gray-200">
          <div className="flex items-center justify-between border-b border-gray-200 p-4">
            <div>
              <Title level={4} className="m-0! font-bold">
                Inbox
              </Title>
            </div>
            <Badge count={conversations?.length} overflowCount={99} />
          </div>
          <div className="h-[calc(100vh-65px)] overflow-y-auto">
            {loadingConv ? (
              <div className="flex justify-center p-8">
                <Spin />
              </div>
            ) : (
              <List
                dataSource={conversations}
                renderItem={(item) => (
                  <List.Item
                    onClick={() => handleSelectConversation(item.id)}
                    className={`cursor-pointer px-4 transition-colors hover:bg-blue-50 ${selectedId === item.id ? 'border-r-4 border-blue-500 bg-blue-50' : ''}`}
                  >
                    <List.Item.Meta
                      avatar={
                        <Avatar
                          size="large"
                          icon={<UserOutlined />}
                          className="bg-blue-100 text-blue-600"
                        />
                      }
                      title={
                        <div className="flex justify-between">
                          <Text strong>{item.customerName}</Text>
                          <Text type="secondary" className="text-xs">
                            {item.lastMessageAt ? dayjs(item.lastMessageAt).format('HH:mm') : ''}
                          </Text>
                        </div>
                      }
                      description={
                        <div className="flex flex-col">
                          <Text type="secondary" className="truncate text-xs">
                            {item.customerPhone}
                          </Text>
                          <Text type="secondary" className="text-xs italic">
                            {item.lastMessageAt
                              ? dayjs(item.lastMessageAt).fromNow()
                              : 'Chưa có tin nhắn'}
                          </Text>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </div>
        </Sider>

        <Content className="relative flex flex-col bg-gray-50">
          {selectedConversation ? (
            <>
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <Avatar
                    size="large"
                    icon={<UserOutlined />}
                    className="bg-blue-100 text-blue-600"
                  />
                  <div>
                    <Title level={5} className="m-0!">
                      {selectedConversation.customerName}
                    </Title>
                    <Space className="text-xs text-gray-500">
                      <span>
                        <PhoneOutlined /> {selectedConversation.customerPhone}
                      </span>
                      <Divider type="vertical" />
                      <span className="font-medium text-green-500">Đang trực tuyến</span>
                    </Space>
                  </div>
                </div>
                <Button danger icon={<CheckCircleOutlined />} onClick={handleCloseConversation}>
                  Kết thúc hỗ trợ
                </Button>
              </div>

              {/* Chat Messages */}
              <div ref={scrollRef} className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
                {loadingMsg ? (
                  <div className="flex justify-center">
                    <Spin />
                  </div>
                ) : (
                  messages.map((msg, index) => {
                    const isAgent = msg.senderType === 'AGENT';
                    return (
                      <div
                        key={msg.id || index}
                        className={`flex ${isAgent ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`group max-w-[70%]`}>
                          {!isAgent && (
                            <div className="mb-1 ml-3 text-[10px] text-gray-400">
                              {selectedConversation.customerName}
                            </div>
                          )}
                          <div
                            className={`rounded-2xl px-4 py-2 shadow-sm ${
                              isAgent
                                ? 'rounded-tr-none bg-blue-600 text-white'
                                : 'rounded-tl-none border border-gray-100 bg-white text-gray-800'
                            }`}
                          >
                            <div>{msg.text}</div>
                          </div>
                          <div
                            className={`mt-1 text-[10px] text-gray-400 ${isAgent ? 'mr-1 text-right' : 'ml-1'}`}
                          >
                            {dayjs(msg.createdAt).format('HH:mm')}
                            {isAgent && msg.senderName && ` • ${msg.senderName}`}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Input Area */}
              <div className="border-t border-gray-200 bg-white p-4">
                <div className="flex gap-2">
                  <Input.TextArea
                    placeholder="Nhập tin nhắn phản hồi khách hàng..."
                    autoSize={{ minRows: 1, maxRows: 4 }}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onPressEnter={(e) => {
                      if (!e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className="rounded-xl"
                  />
                  <Button
                    type="primary"
                    shape="circle"
                    icon={<SendOutlined />}
                    onClick={handleSendMessage}
                    disabled={!inputText.trim()}
                    size="large"
                    className="flex shrink-0 items-center justify-center"
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center text-gray-400">
              <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gray-100">
                <SendOutlined className="-rotate-45 transform text-4xl" />
              </div>
              <Title level={4} type="secondary">
                Chọn một hội thoại để bắt đầu
              </Title>
              <Text type="secondary">
                Bạn sẽ nhận được thông báo khi có khách hàng nhắn tin mới
              </Text>
            </div>
          )}
        </Content>
      </Layout>
    </div>
  );
}
