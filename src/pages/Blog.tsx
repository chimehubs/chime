import InfoPage from './InfoPage';

export default function Blog() {
  return (
    <InfoPage
      title="Blog"
      subtitle="Insights on digital banking, security, and financial clarity."
      sections={[
        {
          title: 'Product Insights',
          body: 'Learn how Chimehubs features are designed to simplify daily banking.'
        },
        {
          title: 'Security Practices',
          body: 'Tips and updates on protecting your account and personal data.'
        },
        {
          title: 'Financial Guides',
          body: 'Practical guides to help you build healthy money habits.'
        }
      ]}
    />
  );
}


