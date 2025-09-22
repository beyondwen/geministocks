import React, { useEffect } from 'react';

// Declaration for the adsbygoogle object on the window
declare global {
  interface Window {
    adsbygoogle: object[];
  }
}

const AD_SLOT_PLACEHOLDER = '1234567890';

/**
 * Renders a Google AdSense ad unit.
 * It will display a placeholder message until a valid data-ad-slot is provided.
 */
const AdSenseAd: React.FC = () => {
  // IMPORTANT: Replace this placeholder with your actual ad slot ID from your AdSense account.
  const adSlot = AD_SLOT_PLACEHOLDER; 
  const isConfigured = adSlot !== AD_SLOT_PLACEHOLDER;

  useEffect(() => {
    // Only attempt to push the ad if the component is properly configured.
    if (isConfigured) {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {
        console.error('Could not push AdSense ad:', e);
      }
    }
  }, [isConfigured]);

  return (
    <div className="my-8" aria-hidden={!isConfigured}>
      <div className="bg-gray-200/50 p-4 rounded-lg w-full text-center">
        <span className="text-xs text-gray-400 uppercase tracking-wider">Advertisement</span>
        {isConfigured ? (
          <ins
            className="adsbygoogle"
            style={{ display: 'block' }}
            data-ad-client="ca-pub-3934801149292236"
            data-ad-slot={adSlot}
            data-ad-format="auto"
            data-full-width-responsive="true"
          ></ins>
        ) : (
          <div className="p-4 text-sm text-yellow-800 bg-yellow-100 rounded-md mt-2">
            <strong>广告位占位符：</strong>
            <p className="mt-1">请在 <code>components/AdSenseAd.tsx</code> 文件中提供一个有效的 AdSense <code>data-ad-slot</code> ID 以在此处展示广告。</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdSenseAd;