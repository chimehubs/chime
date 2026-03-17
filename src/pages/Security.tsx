import InfoPage from './InfoPage';

export default function Security() {
  return (
    <InfoPage
      title="Security"
      subtitle="We apply layered security practices to protect your account and data."
      sections={[
        {
          title: 'Secure Authentication',
          body: 'Your access is protected with strong authentication and session controls.'
        },
        {
          title: 'Transaction Monitoring',
          body: 'We monitor activity to detect suspicious behavior and reduce risk.'
        },
        {
          title: 'Data Protection',
          body: 'Sensitive information is handled with encryption and least-privilege access.'
        }
      ]}
    />
  );
}
