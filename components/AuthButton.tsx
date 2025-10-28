// src/components/AuthButton.tsx
import React from 'react';
import {
  SignInButton,
  SignUpButton,
  UserButton,
  SignedIn,
  SignedOut
} from '@clerk/clerk-react';
import { useI18n } from '../hooks/useI18n';

export function AuthButton() {
  const { t } = useI18n();

  return (
    <div className="flex items-center gap-3">
      <SignedOut>
        <SignInButton mode="modal">
          <button className="px-4 py-2 text-sm font-medium text-purple-600 hover:text-purple-700 transition-colors">
            登录
          </button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors">
            注册
          </button>
        </SignUpButton>
      </SignedOut>

      <SignedIn>
        <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: {
                avatarBox: "w-9 h-9"
              }
            }}
          />
      </SignedIn>
    </div>
  );
}
