import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * Custom root HTML for Expo web — critical for phone browsers.
 * Ensures proper mobile scaling and no accidental horizontal overflow.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"
        />
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body, #root {
                height: 100%;
                width: 100%;
                max-width: 100%;
                overflow-x: hidden;
                overscroll-behavior-x: none;
                -webkit-text-size-adjust: 100%;
                text-size-adjust: 100%;
              }
              body {
                margin: 0;
                position: relative;
              }
              /* Prevent iOS Safari from zooming focused inputs with font-size < 16px */
              input, select, textarea, button {
                font-size: 16px;
              }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
