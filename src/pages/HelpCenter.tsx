import InfoPage from './InfoPage';

export default function HelpCenter() {
  return (
    <InfoPage
      title="Help Center"
      subtitle="Find quick answers and guidance for common actions in Chimahub."
      sections={[
        {
          title: 'Getting Started',
          body: 'Create an account, finish setup, and access your dashboard.'
        },
        {
          title: 'Money Movement',
          body: 'Learn how to add money, withdraw funds, and review transactions.'
        },
        {
          title: 'Account Help',
          body: 'For account-specific issues, reach out to support@chimafinance.com.'
        }
      ]}
    />
  );
}
