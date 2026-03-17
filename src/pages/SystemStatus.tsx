import InfoPage from './InfoPage';

export default function SystemStatus() {
  return (
    <InfoPage
      title="System Status"
      subtitle="We publish service availability updates here."
      sections={[
        {
          title: 'Current Status',
          body: 'All systems operational. If there is an outage, it will be posted here.'
        },
        {
          title: 'Incident Updates',
          body: 'We document incidents with timelines and resolution summaries.'
        },
        {
          title: 'Support',
          body: 'If you experience an issue, contact support@chimafinance.com.'
        }
      ]}
    />
  );
}
