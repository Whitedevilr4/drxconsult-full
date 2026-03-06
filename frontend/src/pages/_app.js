import '@/styles/globals.css'
import 'react-toastify/dist/ReactToastify.css'
import { QueryClient, QueryClientProvider } from 'react-query'
import Script from 'next/script'
import { ToastContainer } from 'react-toastify'
import { useEffect } from 'react'
import { requestNotificationPermission } from '@/utils/browserNotification'

const queryClient = new QueryClient()

export default function App({ Component, pageProps }) {
  useEffect(() => {
    // Unregister any existing service workers (FCM cleanup)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(function(registrations) {
        for(let registration of registrations) {
          if (registration.scope.includes('firebase-messaging-sw') || 
              registration.active?.scriptURL?.includes('firebase-messaging-sw')) {
            console.log('Unregistering FCM service worker:', registration.scope);
            registration.unregister();
          }
        }
      }).catch(function(error) {
        console.log('Service worker unregistration failed:', error);
      });
    }

    // Request browser notification permission
    const initNotifications = async () => {
      const granted = await requestNotificationPermission();
      if (granted) {
        console.log('✅ Browser notifications enabled');
      } else {
        console.log('ℹ️ Browser notifications not enabled');
      }
    };

    // Request permission after a short delay to avoid overwhelming the user
    setTimeout(initNotifications, 2000);
  }, []);

  return (
    <div suppressHydrationWarning>
      <Script 
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
        onLoad={() => {}}
        onError={() => {}}
      />
      <QueryClientProvider client={queryClient}>
        <Component {...pageProps} suppressHydrationWarning />
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
      </QueryClientProvider>
    </div>
  )
}
