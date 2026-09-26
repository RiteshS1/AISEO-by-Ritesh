'use client';

import Script from 'next/script';

export default function TawkTo() {
  return (
    <Script id="tawk-to" strategy="lazyOnload">
      {`var Tawk_API = window.Tawk_API || {}, Tawk_LoadStart = new Date();
(function () {
  var s1 = document.createElement('script');
  var s0 = document.getElementsByTagName('script')[0];
  s1.async = true;
  s1.src = 'https://embed.tawk.to/6ab755d322888a34406f2893/1k3e2ehll';
  s1.charset = 'UTF-8';
  s1.setAttribute('crossorigin', '*');
  s0.parentNode.insertBefore(s1, s0);
})();`}
    </Script>
  );
}