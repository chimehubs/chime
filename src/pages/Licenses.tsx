import InfoPage from './InfoPage';

export default function Licenses() {
  return (
    <InfoPage
      title="Licenses"
      subtitle="Regulatory and product licenses will be listed here as they are finalized."
      sections={[
        {
          title: 'Regulatory Status',
          body: 'We provide updates on licensing and regulatory status as required.'
        },
        {
          title: 'Partner Coverage',
          body: 'Where applicable, services may be provided through licensed partners.'
        },
        {
          title: 'Questions',
          body: 'For licensing information, contact support@chimafinance.com.'
        }
      ]}
    />
  );
}
