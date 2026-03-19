import InfoPage from './InfoPage';

export default function Press() {
  return (
    <InfoPage
      title="Press"
      subtitle="News and updates about Chimehubs and Chima Finance Ltd."
      sections={[
        {
          title: 'Media Inquiries',
          body: 'For press requests, contact support@chimafinance.com.'
        },
        {
          title: 'Brand Assets',
          body: 'Logos and approved brand usage guidelines will be shared upon request.'
        },
        {
          title: 'Updates',
          body: 'Stay tuned for official announcements and platform milestones.'
        }
      ]}
    />
  );
}


