import InfoPage from './InfoPage';

export default function Features() {
  return (
    <InfoPage
      title="Features"
      subtitle="Chimahub delivers modern banking tools built for clarity, speed, and control."
      sections={[
        {
          title: 'Smart Money Movement',
          body: 'Send, receive, and track transfers in one place with real-time status updates.'
        },
        {
          title: 'Account Insights',
          body: 'Review balances, activity, and spending trends to stay on top of your finances.'
        },
        {
          title: 'Card Controls',
          body: 'Freeze, unfreeze, and manage your virtual cards directly from your dashboard.'
        }
      ]}
    />
  );
}
