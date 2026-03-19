import InfoPage from './InfoPage';

export default function Faqs() {
  return (
    <InfoPage
      title="FAQs"
      subtitle="Common questions about Chimehubs."
      sections={[
        {
          title: 'How do I create an account?',
          body: 'Use the register page and complete the setup steps in your dashboard.'
        },
        {
          title: 'How do I add money?',
          body: 'Go to Add Money and follow the on-screen instructions.'
        },
        {
          title: 'Who can I contact for help?',
          body: 'Email support@chimafinance.com or use in-app chat.'
        }
      ]}
    />
  );
}


