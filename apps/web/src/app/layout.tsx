import type { Metadata } from 'next';
// @ts-ignore
import './globals.css';

export const metadata: Metadata = {
  title: 'Farm Management System',
  description: 'Manage your farms, crops, livestock, and finances',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(){try{
                if(typeof window==='undefined')return;
                var observer=new MutationObserver(function(){
                  document.querySelectorAll('[bis_skin_checked]').forEach(function(el){
                    el.removeAttribute('bis_skin_checked');
                  });
                });
                observer.observe(document.documentElement,{attributes:true,childList:true,subtree:true});
              }catch(e){}})();
            `,
          }}
        />
      </head>
      <body className="bg-gray-50 text-gray-900 antialiased" suppressHydrationWarning>{children}</body>
    </html>
  );
}
