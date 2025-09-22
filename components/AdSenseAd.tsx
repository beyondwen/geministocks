import React, { useEffect } from 'react';

// Declaration for the adsbygoogle object on the window
declare global {
  interface Window {
    adsbygoogle: object[];
  }
}

/**
 * Renders a Google AdSense ad unit.
 * IMPORTANT: Remember to replace '1234567890' with your actual AdSense ad slot ID.
 */
const AdSenseAd: React.FC = () => {
  useEffect(() => {
    try {
      // This tells AdSense to display an ad in the <ins> element.
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.error('Could not push AdSense ad:', e);
    }
  }, []);

  return (
    <div className="my-8" aria-hidden="true">
      <div className="bg-gray-200/50 p-4 rounded-lg w-full text-center">
        <span className="text-xs text-gray-400 uppercase tracking-wider">Advertisement</span>
        <ins
          className="adsbygoogle"
          style={{ display: 'block' }}
          data-ad-client="ca-pub-3934801149292236"
          // TODO: Replace with your actual ad slot ID
          data-ad-slot="1234567890" 
          data-ad-format="auto"
          data-full-width-responsive="true"
        ></ins>
      </div>
    </div>
  );
};

export default AdSenseAd;
