'use client';

import { Button, Space, Typography } from 'antd';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import React, { useEffect } from 'react';

import { useAppDispatch, useAppSelector } from '@root/hooks';
import { disconnectChatSocket } from '@root/services/chatSocket';
import { logout } from '@root/store/auth/authSlice';
import { clearAuthTokens } from '@root/utils/tokenStorage';

const { Text } = Typography;

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);

  // Nếu đã login và đang ở trang home hoặc login thì forward vào /cms/chat
  useEffect(() => {
    if (!isAuthenticated) return;
    if (pathname === '/' || pathname === '/login') {
      router.replace('/cms/chat');
    }
  }, [isAuthenticated, pathname, router]);

  const handleLogout = () => {
    dispatch(logout());
    clearAuthTokens();
    disconnectChatSocket();
    router.push('/login');
  };

  return (
    <header className="w-full border-b border-gray-200 bg-white">
      <div className="container flex items-center justify-between py-3">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-lg font-bold">
            CMS
          </Link>
          {isAuthenticated && (
            <Link href="/cms/chat" className="text-sm text-blue-600 hover:underline">
              Chat
            </Link>
          )}
        </div>

        <Space>
          {isAuthenticated ? (
            <>
              <Text type="secondary" className="text-sm">
                Welcome, {user?.username || `User#${user?.id ?? ''}`}
              </Text>
              <Button size="small" onClick={handleLogout}>
                Logout
              </Button>
            </>
          ) : (
            <Button size="small" type="primary" onClick={() => router.push('/login')}>
              Login
            </Button>
          )}
        </Space>
      </div>
    </header>
  );
}
