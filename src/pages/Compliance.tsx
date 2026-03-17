import InfoPage from './InfoPage';

export default function Compliance() {
  return (
    <InfoPage
      title="Compliance"
      subtitle="We align operations with applicable banking and data protection standards."
      sections={[
        {
          title: 'Operational Controls',
          body: 'Internal controls guide account management, transaction handling, and audit readiness.'
        },
        {
          title: 'Data Stewardship',
          body: 'We use access controls and monitoring to protect user data throughout its lifecycle.'
        },
        {
          title: 'Ongoing Reviews',
          body: 'Compliance practices are reviewed regularly to maintain safe operations.'
        }
      ]}
    />
  );
}
