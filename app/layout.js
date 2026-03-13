export const metadata = {
  title: 'Open Brain Dashboard',
  description: 'Single-user memory audit dashboard'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'Inter, Arial, sans-serif', margin: 24, background: '#0b1020', color: '#e8eefc' }}>
        {children}
      </body>
    </html>
  );
}
