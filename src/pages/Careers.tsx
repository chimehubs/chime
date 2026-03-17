import InfoPage from './InfoPage';

export default function Careers() {
  return (
    <InfoPage
      title="Careers"
      subtitle="Join Chima Finance Ltd and help build trusted financial experiences."
      sections={[
        {
          title: 'Culture',
          body: 'We value clear thinking, secure systems, and customer-first decisions.'
        },
        {
          title: 'Open Roles',
          body: 'We post opportunities as they become available. Check back often.'
        },
        {
          title: 'Contact',
          body: 'For recruiting inquiries, email support@chimafinance.com.'
        }
      ]}
    />
  );
}
