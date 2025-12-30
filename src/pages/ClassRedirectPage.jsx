import StudentAccessPage from './StudentAccessPage';

export default function ClassRedirectPage() {
  // Always show StudentAccessPage for class access, regardless of login status
  return <StudentAccessPage />;
}

