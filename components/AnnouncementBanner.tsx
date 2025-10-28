import React from 'react';
import { XIcon } from './icons/Icons';
import { useI18n } from '../hooks/useI18n';

interface AnnouncementBannerProps {
  onClose: () => void;
}

const AnnouncementBanner: React.FC<AnnouncementBannerProps> = ({ onClose }) => {
  const { t } = useI18n();

  return (
    <div className="relative bg-gradient-to-r from-purple-500 to-blue-500 text-white py-3 px-4 sm:px-6 lg:px-8 shadow-md animate-fade-in">
      <div className="text-center text-sm font-medium">
        <span>{t('announcementBanner.text')}</span>
      </div>
      <div className="absolute inset-y-0 right-0 flex items-center pr-2 sm:pr-4">
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-full hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white transition-colors"
          aria-label={t('announcementBanner.close')}
        >
          <XIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default AnnouncementBanner;
