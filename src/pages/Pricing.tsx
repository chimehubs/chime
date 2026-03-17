import InfoPage from './InfoPage';

export default function Pricing() {
  return (
    <InfoPage
      title="Pricing"
      subtitle="Clear, predictable pricing with no surprises."
      sections={[
        {
          title: 'Account Access',
          body: 'Core account features are available to all users once your account is active.'
        },
        {
          title: 'Transaction Fees',
          body: 'Fees, if applicable, are shown before you confirm any transaction.'
        },
        {
          title: 'Premium Services',
          body: 'Optional services may include additional verification or priority support.'
        }
      ]}
    />
  );
}
