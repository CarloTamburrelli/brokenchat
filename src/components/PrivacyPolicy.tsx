import React from "react";
import contact_us from '../assets/contact_us.png';
import Logo from '../assets/logo.png';
import { Link } from "react-router-dom";

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="flex flex-col justify-center items-center max-w-3xl mx-auto">
      <Link to="/" >
        <img 
          src={Logo} 
          alt="Logo" 
          className="w-32 sm:w-40 md:w-44 lg:w-48 xl:w-[170px] h-auto" 
        />
      </Link>
      <div className="max-w-3xl mx-auto px-4 py-10 text-gray-800">
        <h1 className="text-3xl font-bold mb-6 text-center">Privacy & Cookie Policy</h1>
        <p className="mb-1 text-sm text-gray-500 text-center">Created: May 5, 2025</p>
        <p className="mb-6 text-sm text-gray-500 text-center">Last updated: May 13, 2025</p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-2 text-center">1. Introduction</h2>
          <p className="mb-4 text-left">
            <strong>Broken Chat</strong> is an anonymous and simple chat platform that allows you to 
            <strong> connect and communicate with people nearby</strong>, quickly and safely.
          </p>
          <p className="mb-4 text-left">
            We respect your privacy and are committed to protecting your personal data.
          </p>
          <p className="mb-4 text-left">
            The platform is owned by <strong>Carlo Tamburrelli</strong>, who can be contacted via email for any inquiries.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-2 text-center">2. What Data We Collect</h2>
          <p className="mb-4 text-left">
            We do not ask for names, emails, or other directly identifiable information.
            We also do <strong>not store any personally identifiable information (PII)</strong>.
            However, we do collect some pseudonymous data necessary to make the service function properly:
          </p>
          <ul className="list-disc list-inside mb-4 text-left">
            <li><strong>Nickname:</strong> chosen freely by the user</li>
            <li><strong>Session token:</strong> stored locally on your device to maintain your session</li>
            <li><strong>Geolocation data:</strong> latitude and longitude (only for geolocated chats)</li>
            <li><strong>Messages:</strong> temporarily stored on our servers and automatically deleted after a set limit</li>
          </ul>

          <p className="font-semibold mb-2 text-left">Retention periods:</p>
          <ul className="list-disc list-inside text-left">
            <li><strong>Public chat messages:</strong> last 100 messages per chat; older ones are deleted automatically</li>
            <li><strong>Private chat messages:</strong> last 50 messages per conversation</li>
            <li><strong>Token and nickname:</strong> kept until manually reset or changed</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-2 text-center">3. Cookies and Tracking</h2>
          <p className="text-left">
            We do <strong>not use tracking cookies</strong> or third-party profiling tools on the platform.
            Only essential local storage is used to maintain your session and preferences.
          </p>
          <ul className="list-disc list-inside mt-2 mb-4 text-left">
            <li>No advertising or marketing cookies</li>
            <li>No third-party analytics tools like Google Analytics</li>
            <li>No profiling or cross-device tracking</li>
            <li>Only essential data is stored locally (e.g., session token, nickname)</li>
          </ul>
          <p className="text-left">
            We use <strong>Google Search Console</strong> to monitor website performance and security. 
            This tool may provide us with <strong>aggregated and anonymous information</strong> such as visitor countries, devices used, or search performance.
            <br />
            Google does not install any cookies via this service and does not provide us with any personally identifiable information.
          </p>
          <p className="text-left">
            Broken Chat uses only technical cookies and local storage necessary for the functionality of the service, such as saving session tokens or user preferences.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-2 text-center">4. Third-Party Services</h2>
          <p className="text-left">
            Broken Chat does <strong>not rely on third-party services</strong> that collect or process personal data.
            We do not embed third-party content (e.g., social media, video platforms), nor do we use external analytics tools or advertising networks.
          </p>
          <p className="mt-2 text-left">
            The only external service we currently use is <strong>Google Search Console</strong>, which provides us with anonymous and aggregated traffic insights (see section 3).
            No cookies or personal information are collected through this tool.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-2 text-center">5. Security</h2>
          <p className="text-left">
            All communication is encrypted via HTTPS. We take reasonable steps to ensure your use of the platform is secure.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-2 text-center">6. Your Data Rights</h2>
          <p className="text-left">
            As a data subject under Chapter III (Articles 12–23) of the General Data Protection Regulation (GDPR), 
            you have the following rights regarding your personal data:
          </p>
          <ul className="list-disc list-inside mt-2 text-left">
            <li>The right to access your personal data and receive confirmation of whether it is being processed</li>
            <li>
              The right to request the erasure of your data (“right to be forgotten”), under applicable conditions. 
              You can also delete your account directly by selecting <strong>“Remove Account”</strong> from the left-hand menu on the homepage.
              <br />
              Please note that once you request account deletion, your account and all associated data will be permanently removed within 30 days from the request.
            </li>
            <li>The right to restrict or limit the processing of your data</li>
            <li>The right to object to the processing of your data, particularly when based on legitimate interests</li>
            <li>The right to data portability, allowing you to obtain and reuse your personal data across services</li>
          </ul>
          <p className="mt-2 text-left">
            To exercise any of these rights, you can contact the Data Controller via the email address provided 
            in <strong>Section 11</strong> of this privacy policy. 
            Please include a clear description of your request and specify which type of data or processing it concerns, where applicable.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-2 text-center">7. Legal Basis for Data Processing</h2>
          <p className="text-left">
            The processing of personal data on Broken Chat is based on the following legal grounds, as per the General Data Protection Regulation (GDPR):
          </p>
          <ul className="list-disc list-inside mt-2 text-left">
            <li><strong>Consent:</strong> By registering for Broken Chat or creating a chat, you explicitly consent to the collection and processing of necessary data (e.g., nickname, session token, geolocation) in order to provide the chat services. By using the platform, you also agree to our privacy policy and data processing practices. You can withdraw your consent at any time by deleting your account.</li>
            <li><strong>Performance of a contract:</strong> The processing of your data is necessary for the provision of the chat services and for fulfilling the terms of use that you have agreed to.</li>
            <li><strong>Legitimate interest:</strong> We may process certain data for legitimate business interests, such as improving the platform's functionality and ensuring security, but we balance these interests against your rights and freedoms.</li>
          </ul>
          <p className="mt-2 text-left">
            If you have any questions about the legal basis for the processing of your data, please contact us via the email address provided in <strong>Section 11</strong> of this privacy policy.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-2 text-center">8. Data Recipients</h2>
          <p className="text-left">
            We do not share, sell, or transfer your personal data to any third parties.
            Data is only processed internally by the systems that operate Broken Chat.
          </p>
          <p className="mt-2 text-left">
            If external data processors are ever involved (e.g., hosting providers), they will be contractually bound to comply with GDPR regulations and will be listed here.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-2 text-center">9. Transfer of Data Outside the EU</h2>
          <p className="text-left">
            We do <strong>not transfer</strong> your personal data outside the European Union (EU). All data collected and processed by Broken Chat remains within the EU and is protected in accordance with the applicable data protection laws.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-2 text-center">10. Data Retention Period</h2>
          <p className="text-left">
            We will retain your personal data for as long as you maintain your account and use the Broken Chat service. If you choose to delete your account, all associated data will be removed from our servers within 30 days of your request.
          </p>
          <p className="text-left">
            If you do not request the deletion of your account, your data will remain stored on our servers. You have the right to request the deletion of your account and all associated data at any time by following the instructions provided in the "Remove Account" section of the left-hand menu on the homepage.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-2 text-center">11. Contact</h2>
          <p className="text-left">
            For any privacy-related questions, please contact:
            <br />
            <strong>Email:</strong>{' '}
            <img
              src={contact_us}
              alt="Email contact"
              className="inline-block h-7 align-middle ml-1"
              draggable={false}
            />
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2 text-center">12. Conclusion</h2>
          <p className="text-left">
            We reserve the right to update or modify this privacy policy at any time. We will notify you of any significant changes by posting the updated policy on our platform.
          </p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
