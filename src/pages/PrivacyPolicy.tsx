const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-4 py-12 prose prose-neutral dark:prose-invert">
        <h1>Privacy Policy for Sociax Job-Autofill</h1>
        <p><strong>Last Updated:</strong> April 1, 2026</p>

        <h2>Introduction</h2>
        <p>Sociax Job-Autofill ("the Extension") is a Chrome browser extension developed by Sociax that helps users autofill job application forms. This Privacy Policy explains how we collect, use, store, and protect your information when you use our Extension.</p>

        <h2>Information We Collect</h2>

        <h3>1. Account Information</h3>
        <p>When you log in to the Extension, we collect:</p>
        <ul>
          <li>Email address</li>
          <li>Authentication credentials (securely transmitted and stored as tokens)</li>
        </ul>

        <h3>2. Profile Information</h3>
        <p>To autofill job applications on your behalf, we access your Sociax profile data, which may include:</p>
        <ul>
          <li>Full name</li>
          <li>Email address</li>
          <li>Phone number</li>
          <li>Location and country</li>
          <li>LinkedIn URL</li>
          <li>Portfolio URL</li>
          <li>Resume file URL and filename</li>
        </ul>

        <h3>3. Job Application Form Data</h3>
        <p>When you use the autofill feature, the Extension reads form field labels, types, and options from job application pages (e.g., on Greenhouse, Lever, and Workday platforms) to determine how to fill them accurately.</p>

        <h3>4. Locally Stored Data</h3>
        <p>The Extension uses Chrome's local storage API to store:</p>
        <ul>
          <li>Authentication tokens (access token, refresh token)</li>
          <li>Basic user information for session management</li>
        </ul>

        <h2>How We Use Your Information</h2>
        <p>Your information is used solely to:</p>
        <ul>
          <li>Authenticate your identity and maintain your session.</li>
          <li>Retrieve your profile from Sociax servers to populate job application fields.</li>
          <li>Analyze form fields on job application pages using AI to match your profile data with the appropriate fields.</li>
          <li>Autofill job applications with your profile data when you initiate the autofill action.</li>
        </ul>

        <h2>Third-Party Services</h2>
        <p>The Extension interacts with the following third-party services:</p>

        <h3>Supabase</h3>
        <p>We use Supabase for user authentication and profile data storage. Your data is transmitted securely over HTTPS. Supabase's privacy policy applies to data stored on their infrastructure: <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer">https://supabase.com/privacy</a></p>

        <h3>Google Gemini API</h3>
        <p>We use Google's Gemini AI model to intelligently match your profile data to job application form fields. When you trigger autofill, form field metadata (labels, types, and options — not your personal data) along with your profile information are sent to the Gemini API to generate accurate field mappings. Google's API privacy terms apply: <a href="https://ai.google.dev/terms" target="_blank" rel="noopener noreferrer">https://ai.google.dev/terms</a></p>

        <h2>Data Storage and Security</h2>
        <ul>
          <li>Authentication tokens are stored locally in your browser using Chrome's <code>chrome.storage</code> API and are never shared with third parties.</li>
          <li>All data transmitted between the Extension and our servers is encrypted using HTTPS.</li>
          <li>We do not store your job application form data on our servers.</li>
          <li>Profile data is stored securely on Supabase infrastructure with industry-standard security practices.</li>
        </ul>

        <h2>Data Sharing</h2>
        <p>We do not sell, trade, or rent your personal information to third parties. Your data is shared only with:</p>
        <ul>
          <li><strong>Supabase</strong> — for authentication and profile storage.</li>
          <li><strong>Google Gemini API</strong> — for AI-powered form field matching during autofill operations.</li>
        </ul>
        <p>No data is shared with advertisers, data brokers, or any other third parties.</p>

        <h2>User Rights and Controls</h2>
        <p>You have the right to:</p>
        <ul>
          <li>Access your profile data through the Extension or the Sociax platform.</li>
          <li>Update your profile information at any time.</li>
          <li>Delete your account and associated data by contacting us.</li>
          <li>Log out at any time, which removes locally stored authentication tokens.</li>
          <li>Uninstall the Extension at any time, which removes all locally stored data.</li>
        </ul>

        <h2>Permissions Explained</h2>
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Permission</th>
                <th>Purpose</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>storage</code></td>
                <td>Store authentication tokens and user session data locally in your browser.</td>
              </tr>
              <tr>
                <td>Host permissions (<code>https://*/*</code>)</td>
                <td>Access job application pages to read form fields and autofill them with your profile data.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2>Children's Privacy</h2>
        <p>The Extension is not intended for use by individuals under the age of 16. We do not knowingly collect personal information from children.</p>

        <h2>Changes to This Privacy Policy</h2>
        <p>We may update this Privacy Policy from time to time. Changes will be reflected with an updated "Last Updated" date at the top of this page. Continued use of the Extension after changes constitutes acceptance of the updated policy.</p>

        <h2>Contact Us</h2>
        <p>If you have any questions or concerns about this Privacy Policy, please contact us at:</p>
        <ul>
          <li>Email: <a href="mailto:support@sociax.tech">support@sociax.tech</a></li>
          <li>Website: <a href="https://sociax.tech" target="_blank" rel="noopener noreferrer">https://sociax.tech</a></li>
        </ul>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
