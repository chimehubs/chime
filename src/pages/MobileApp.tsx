import InfoPage from './InfoPage';

export default function MobileApp() {
  return (
    <InfoPage
      title="Mobile App"
      subtitle="Use Chimehubs as a fast, installable PWA on mobile devices."
      sections={[
        {
          title: 'Installable Experience',
          body: 'Add Chimehubs to your home screen for a focused, app-like experience.'
        },
        {
          title: 'Optimized Layouts',
          body: 'The interface adapts to mobile screens for quick navigation and actions.'
        },
        {
          title: 'Always Connected',
          body: 'Stay updated on balances and activity when you sign in.'
        }
      ]}
    />
  );
}


